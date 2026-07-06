"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

interface TeachingAssignment {
  pembagian_id: string;
  kelas_id: string;
  mata_pelajaran_id: string;
  kelas_nama: string;
  tingkat: number;
  mata_pelajaran_nama: string;
  mata_pelajaran_kode: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch teaching assignments via view
      const { data, error: fetchError } = await supabase
        .from("v_guru_teaching_assignments")
        .select("*");

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setAssignments(data || []);
      }
      
      setLoading(false);
    };

    fetchAssignments();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  // Group by kelas
  const groupedByKelas = assignments.reduce((acc, assignment) => {
    const key = assignment.kelas_id;
    if (!acc[key]) {
      acc[key] = {
        kelas_nama: assignment.kelas_nama,
        tingkat: assignment.tingkat,
        assignments: [],
      };
    }
    acc[key].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { kelas_nama: string; tingkat: number; assignments: TeachingAssignment[] }>);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Pilih kelas dan mata pelajaran untuk input nilai</p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Tidak ada kelas yang diajar. Hubungi admin untuk pengaturan pembagian mengajar.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByKelas).map(([kelasId, kelas]) => (
            <div key={kelasId} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Kelas {kelas.tingkat} - {kelas.kelas_nama}
                </h2>
                <p className="text-sm text-gray-500">
                  {kelas.assignments.length} mata pelajaran
                </p>
              </div>
              <div className="divide-y">
                {kelas.assignments.map((assignment) => (
                  <div
                    key={assignment.pembagian_id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.mata_pelajaran_nama}
                      </p>
                      <p className="text-sm text-gray-500">
                        Kode: {assignment.mata_pelajaran_kode}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/input-nilai/${assignment.pembagian_id}`)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Input Nilai
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
