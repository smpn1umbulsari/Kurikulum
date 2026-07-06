"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";

interface Siswa {
  id: string;
  nama: string;
  nis: string;
}

interface AssessmentDetail {
  siswa_id: string;
  nilai: number | null;
  catatan: string | null;
  version: number;
}

interface Assessment {
  id: string;
  nama: string;
  kelas_id: string;
  kelas_nama: string;
  mata_pelajaran_nama: string;
  type_nama: string;
  status: string;
}

const ITEMS_PER_PAGE = 20;
const DRAFT_STORAGE_KEY = "sikad_nilai_draft_";

export default function InputNilaiPage() {
  const router = useRouter();
  const params = useParams();
  const pembagianId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [assessmentDetails, setAssessmentDetails] = useState<Record<string, AssessmentDetail>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasAssessment, setHasAssessment] = useState(false);

  // Draft state for localStorage auto-save (G6)
  const [draftValues, setDraftValues] = useState<Record<string, { nilai: string; catatan: string }>>({});

  // Load data
  const loadData = useCallback(async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Fetch assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from("v_guru_teaching_assignments")
        .select("*")
        .eq("pembagian_id", pembagianId)
        .single();

      if (assignmentError || !assignment) {
        setError("Assignment tidak ditemukan atau Anda tidak memiliki akses");
        setLoading(false);
        return;
      }

      // Check if assessment exists for this assignment
      const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("kelas_id", assignment.kelas_id)
        .eq("mata_pelajaran_id", assignment.mata_pelajaran_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (assessments && assessments.length > 0) {
        const currentAssessment = assessments[0];
        setAssessment({
          id: currentAssessment.id,
          nama: currentAssessment.nama,
          kelas_id: assignment.kelas_id,
          kelas_nama: assignment.kelas_nama,
          mata_pelajaran_nama: assignment.mata_pelajaran_nama,
          type_nama: currentAssessment.type_id || "Penilaian",
          status: currentAssessment.status,
        });
        setHasAssessment(true);

        // Fetch existing assessment details
        const { data: details } = await supabase
          .from("assessment_details")
          .select("*")
          .eq("assessment_id", currentAssessment.id);

        if (details) {
          const detailsMap: Record<string, AssessmentDetail> = {};
          details.forEach((d) => {
            detailsMap[d.siswa_id] = {
              siswa_id: d.siswa_id,
              nilai: d.nilai,
              catatan: d.catatan,
              version: d.version,
            };
          });
          setAssessmentDetails(detailsMap);
        }
      }

      // Fetch students in this class
      const { data: kelasSiswas } = await supabase
        .from("riwayat_kelas")
        .select("siswa_id, siswas(id, nama, nis)")
        .eq("kelas_id", assignment.kelas_id)
        .eq("status", "AKTIF")
        .order("siswas(nama)");

      if (kelasSiswas) {
        const siswaList: Siswa[] = kelasSiswas
          .map((ks: { siswa_id: string; siswas: { id: string; nama: string; nis: string } }) => ({
            id: ks.siswas.id,
            nama: ks.siswas.nama,
            nis: ks.siswas.nis,
          }))
          .sort((a, b) => a.nama.localeCompare(b.nama));
        setSiswas(siswaList);
      }

      // Load draft from localStorage (G6)
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY + pembagianId);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setDraftValues(parsed);
        } catch {
          // Invalid draft, ignore
        }
      }
    } catch (err) {
      setError("Gagal memuat data");
    }

    setLoading(false);
  }, [pembagianId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save draft to localStorage (G6)
  useEffect(() => {
    if (Object.keys(draftValues).length > 0) {
      localStorage.setItem(DRAFT_STORAGE_KEY + pembagianId, JSON.stringify(draftValues));
    }
  }, [draftValues, pembagianId]);

  // Handle nilai change
  const handleNilaiChange = (siswaId: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        nilai: value,
        catatan: prev[siswaId]?.catatan || "",
      },
    }));
  };

  // Handle catatan change
  const handleCatatanChange = (siswaId: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        catatan: value,
        nilai: prev[siswaId]?.nilai || "",
      },
    }));
  };

  // Save all values
  const handleSave = async () => {
    if (!assessment) {
      setError("Assessment belum ada. Hubungi admin untuk membuat assessment.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const updates = [];
      for (const siswa of siswas) {
        const draft = draftValues[siswa.id];
        if (draft && (draft.nilai !== "" || draft.catatan !== "")) {
          const existingDetail = assessmentDetails[siswa.id];
          const nilai = draft.nilai ? parseFloat(draft.nilai) : null;

          updates.push({
            assessment_id: assessment.id,
            siswa_id: siswa.id,
            nilai,
            catatan: draft.catatan || null,
            expected_version: existingDetail?.version || null,
          });
        }
      }

      if (updates.length === 0) {
        setSuccess("Tidak ada perubahan untuk disimpan");
        setSaving(false);
        return;
      }

      // Save using RPC function with optimistic locking (G5)
      for (const update of updates) {
        const { error: upsertError } = await supabase.rpc("upsert_assessment_detail", {
          p_assessment_id: update.assessment_id,
          p_siswa_id: update.siswa_id,
          p_nilai: update.nilai,
          p_catatan: update.catatan,
          p_expected_version: update.expected_version,
        });

        if (upsertError) {
          if (upsertError.message.includes("VERSION_CONFLICT")) {
            setError(`Konflik versi untuk siswa. Refresh halaman dan coba lagi.`);
            return;
          }
          throw upsertError;
        }
      }

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_STORAGE_KEY + pembagianId);
      setDraftValues({});
      setSuccess(`Berhasil menyimpan ${updates.length} nilai`);

      // Reload to get fresh data
      await loadData();
    } catch (err) {
      setError(`Gagal menyimpan: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    setSaving(false);
  };

  // Pagination (G7)
  const totalPages = Math.ceil(siswas.length / ITEMS_PER_PAGE);
  const paginatedSiswas = siswas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get stage badge (G4)
  const getStageBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      DRAFT: { color: "bg-gray-100 text-gray-800", text: "DRAFT" },
      SUBMITTED: { color: "bg-yellow-100 text-yellow-800", text: "SUBMITTED" },
      APPROVED: { color: "bg-green-100 text-green-800", text: "APPROVED" },
      FINALIZED: { color: "bg-blue-100 text-blue-800", text: "FINALIZED" },
    };
    return badges[status] || badges.DRAFT;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Kembali ke Dashboard
        </button>
        
        {assessment && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {assessment.nama}
                  </h1>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStageBadge(assessment.status).color}`}>
                    {getStageBadge(assessment.status).text}
                  </span>
                </div>
                <p className="text-gray-600">
                  {assessment.mata_pelajaran_nama} - {assessment.kelas_nama}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {siswas.length} siswa
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!hasAssessment ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">
            Assessment belum dibuat untuk mata pelajaran ini.
          </p>
          <p className="text-sm text-gray-400">
            Hubungi admin atau gunakan aplikasi desktop untuk membuat assessment.
          </p>
        </div>
      ) : (
        <>
          {/* Input Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Siswa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Nilai
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSiswas.map((siswa, index) => {
                    const detail = assessmentDetails[siswa.id];
                    const draft = draftValues[siswa.id];
                    const displayNilai = draft?.nilai ?? (detail?.nilai?.toString() ?? "");
                    const displayCatatan = draft?.catatan ?? (detail?.catatan ?? "");

                    return (
                      <tr key={siswa.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {siswa.nis}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {siswa.nama}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={displayNilai}
                            onChange={(e) => handleNilaiChange(siswa.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0-100"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={displayCatatan}
                            onChange={(e) => handleCatatanChange(siswa.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Catatan opsional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination (G7) */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-500">
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, siswas.length)} dari {siswas.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                localStorage.removeItem(DRAFT_STORAGE_KEY + pembagianId);
                setDraftValues({});
                loadData();
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(draftValues).length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Nilai"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
