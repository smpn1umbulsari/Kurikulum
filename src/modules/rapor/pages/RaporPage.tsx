import { useState, useEffect } from 'react';
import { useCatatanWaliKelass, useRaporSnapshots, useSaveCatatanWaliKelas, useFinalizeRapor } from '../hooks/useRapor';
import { useKelass } from '../../kelas/hooks/useKelas';
import { useSiswas } from '../../siswa/hooks/useSiswa';
import { useAppStore } from '../../../store/appStore';
import { db } from '../../../database/dexie/schema';
import { Award, Save, CheckCircle, Printer, Users } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { CatatanWaliKelas } from '@/types';
import { AppPrint } from '../../../utils/printHelper';
import { calculateStudentGradesOffline, generateRaporPrintHtml } from '../utils/raporPrintFormat';
import { toast } from '../../../store/toastStore';

export default function RaporPage() {
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);
  const { data: kelass = [] } = useKelass();
  const { data: siswas = [] } = useSiswas();
  const { data: notes = [] } = useCatatanWaliKelass();
  const { data: snapshots = [] } = useRaporSnapshots();

  const saveNoteMutation = useSaveCatatanWaliKelas();
  const finalizeRaporMutation = useFinalizeRapor();

  const [selectedKelasId, setSelectedKelasId] = useState('');
  
  // Calculated summaries (computed offline)
  const [studentGrades, setStudentGrades] = useState<Record<string, number>>({});
  const [studentAttendance, setStudentAttendance] = useState<Record<string, { H: number; I: number; S: number; A: number }>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  const activeStudents = siswas.filter((s) => s.status_aktif);

  // Load local notes and calculate metrics on class/term change
  useEffect(() => {
    if (!selectedKelasId || !currentAcademicTerm) return;

    // Load notes
    const notesMap: Record<string, string> = {};
    activeStudents.forEach((siswa) => {
      const note = notes.find(
        (n) => n.siswa_id === siswa.id && n.kelas_id === selectedKelasId && n.academic_term_id === currentAcademicTerm.id
      );
      notesMap[siswa.id] = note ? note.catatan : '';
    });
    setLocalNotes(notesMap);

    // Calculate Grades offline using Dexie
    const calculateMetrics = async () => {
      const gradesMap: Record<string, number> = {};
      const attendanceMap: Record<string, { H: number; I: number; S: number; A: number }> = {};

      for (const siswa of activeStudents) {
        // Attendance data will be populated from rekap_kehadiran table
        // For now, initialize with zeros (will be populated via API/supabase)
        attendanceMap[siswa.id] = { H: 0, I: 0, S: 0, A: 0 };

        // Calculate Average Grades
        const details = await db.assessmentDetails
          .where('siswa_id')
          .equals(siswa.id)
          .toArray();

        if (details.length > 0) {
          const sum = details.reduce((acc, curr) => acc + curr.nilai, 0);
          gradesMap[siswa.id] = Math.round(sum / details.length);
        } else {
          gradesMap[siswa.id] = 0;
        }
      }

      setStudentGrades(gradesMap);
      setStudentAttendance(attendanceMap);
    };

    calculateMetrics().catch((err) => console.error('Failed to calculate offline metrics:', err));
  }, [selectedKelasId, currentAcademicTerm, notes, activeStudents]);

  const handleNoteChange = (siswaId: string, catatan: string) => {
    setLocalNotes((prev) => ({
      ...prev,
      [siswaId]: catatan,
    }));
  };

  const handleSaveNote = (siswaId: string) => {
    if (!currentAcademicTerm || !selectedKelasId) return;

    const existing = notes.find(
      (n) => n.siswa_id === siswaId && n.kelas_id === selectedKelasId && n.academic_term_id === currentAcademicTerm.id
    );

    const payload: CatatanWaliKelas = {
      id: existing?.id || crypto.randomUUID(),
      academic_term_id: currentAcademicTerm.id,
      siswa_id: siswaId,
      kelas_id: selectedKelasId,
      catatan: localNotes[siswaId] || '',
      created_by: 'homeroom-teacher',
      created_at: existing?.created_at || new Date().toISOString(),
    };

    saveNoteMutation.mutate(payload, {
      onSuccess: () => toast.success('Catatan Wali Kelas berhasil disimpan!'),
    });
  };

  const handleFinalize = (siswaId: string) => {
    if (!currentAcademicTerm || !selectedKelasId) return;

    const isFinalized = snapshots.some(
      (s) => s.siswa_id === siswaId && s.academic_term_id === currentAcademicTerm.id
    );

    if (isFinalized) {
      toast.warning('Rapor siswa ini sudah difinalisasi!');
      return;
    }

    toast.confirm('Apakah Anda yakin ingin memfinalisasi rapor siswa ini? Tindakan ini akan mengunci nilai semester.', () => {
      const dataRapor = {
        semester: `${currentAcademicTerm.tahun_ajaran} - ${currentAcademicTerm.semester}`,
        kelas: kelass.find((k) => k.id === selectedKelasId)?.nama_kelas || 'Kelas',
        nilai: [{ subjek: 'Rata-rata Kelas', skor: studentGrades[siswaId] || 0 }],
        kehadiran: studentAttendance[siswaId] || { H: 0, I: 0, S: 0, A: 0 },
        catatan_wali: localNotes[siswaId] || '',
      };

      finalizeRaporMutation.mutate({
        siswaId,
        termId: currentAcademicTerm.id,
        kelasId: selectedKelasId,
        dataRapor,
      }, {
        onSuccess: () => toast.success('Rapor berhasil difinalisasi & dikunci!'),
      });
    });
  };

  const handlePrintRapor = async (siswaId: string) => {
    if (!currentAcademicTerm) return;
    try {
      const printData = await calculateStudentGradesOffline(siswaId, currentAcademicTerm.id);
      if (!printData) {
        toast.error('Data rapor tidak ditemukan atau siswa belum terdaftar.');
        return;
      }
      const html = generateRaporPrintHtml(printData);
      AppPrint.openHtml(html, {
        documentTitle: `Rapor_${printData.siswa.nama.replace(/\s+/g, '_')}`,
        printDelayMs: 500,
      });
    } catch (err) {
      console.error('Failed to print Rapor:', err);
      toast.error('Gagal menghasilkan cetakan rapor. Pastikan semua data lokal telah dimuat.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Manajemen Rapor Siswa</h2>
        <p className="text-sm text-neutral-500">Evaluasi nilai akhir, tulis catatan wali kelas, dan finalisasi dokumen laporan belajar</p>
      </div>

      <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
        <label className="block text-sm font-semibold text-neutral-700 mb-2">Pilih Rombongan Belajar / Kelas Anda</label>
        <select
          value={selectedKelasId}
          onChange={(e) => setSelectedKelasId(e.target.value)}
          className="block w-full px-4 h-12 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
        >
          <option value="">-- Pilih Kelas --</option>
          {kelass
            .filter((k) => k.status_aktif)
            .map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelas} (Tingkat {k.tingkat})
              </option>
            ))}
        </select>
      </div>

      {selectedKelasId && (
        <div className="bg-white rounded-card border border-neutral-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Nilai Rata-rata</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Presensi (H/I/S/A)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider w-96">Catatan Wali Kelas</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {activeStudents.length === 0 ? (
                  <tr><td colSpan={5}>
                    <EmptyState
                      icon={Users}
                      title="Tidak ada data siswa ditemukan"
                      description="Siswa harus terdaftar di rombel ini terlebih dahulu."
                    />
                  </td></tr>
                ) : (
                  activeStudents.map((siswa) => {
                    const avgGrade = studentGrades[siswa.id] || 0;
                    const att = studentAttendance[siswa.id] || { H: 0, I: 0, S: 0, A: 0 };
                    const isFinalized = snapshots.some(
                      (s) => s.siswa_id === siswa.id && s.academic_term_id === currentAcademicTerm?.id
                    );

                    return (
                      <tr key={siswa.id} className="h-16 hover:bg-primary-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-neutral-800">{siswa.nama}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${avgGrade >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {avgGrade} / 100
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-neutral-600">
                          H:{att.H} | I:{att.I} | S:{att.S} | A:{att.A}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={localNotes[siswa.id] || ''}
                              disabled={isFinalized}
                              onChange={(e) => handleNoteChange(siswa.id, e.target.value)}
                              placeholder="Masukkan catatan wali kelas..."
                              className="flex-1 px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none disabled:bg-neutral-100"
                            />
                            {!isFinalized && (
                              <button
                                type="button"
                                onClick={() => handleSaveNote(siswa.id)}
                                className="text-primary-600 hover:text-primary-800 transition-colors p-2"
                              >
                                <Save className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isFinalized ? (
                            <>
                              <span className="inline-flex items-center px-2.5 py-1.5 rounded-medium text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-500" />
                                Terkunci
                              </span>
                              <button
                                onClick={() => handlePrintRapor(siswa.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-neutral-300 hover:bg-neutral-50 rounded-medium text-xs font-semibold text-neutral-700"
                              >
                                <Printer className="mr-1 h-3.5 w-3.5 text-neutral-500" />
                                Rapor PDF
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleFinalize(siswa.id)}
                              className="inline-flex items-center px-3 py-1.5 rounded-medium text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                            >
                              <Award className="mr-1 h-3.5 w-3.5" />
                              Finalisasi Rapor
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
