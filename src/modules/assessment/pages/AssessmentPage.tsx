import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAssessments, useAssessmentDetails, useSaveAssessment, useSaveGrades } from '../hooks/useAssessment';
import { usePembagianMengajars } from '../../kelas/hooks/usePembagianMengajar';
import { useKelass } from '../../kelas/hooks/useKelas';
import { useMapels } from '../../settings/hooks/useMapel';
import { useSiswas } from '../../siswa/hooks/useSiswa';
import { useAppStore } from '../../../store/appStore';
import { toast } from '../../../store/toastStore';
import { Plus, Edit2, AlertTriangle, Save, ArrowLeft, X, Users } from 'lucide-react';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Assessment, AssessmentDetail, AssessmentStage } from '@/types';

const assessmentFormSchema = z.object({
  judul: z.string().min(1, 'Judul Penilaian wajib diisi').trim(),
  bobot: z.preprocess((val) => Number(val), z.number().min(1, 'Bobot minimal 1%').max(100, 'Bobot maksimal 100%')),
  stage: z.enum(['DRAFT', 'PUBLISH', 'FINAL'] as const),
  tanggal: z.string().min(1, 'Tanggal pelaksanaan wajib diisi'),
});

type AssessmentFormValues = z.infer<typeof assessmentFormSchema>;

export default function AssessmentPage() {
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);
  const { data: allocations = [] } = usePembagianMengajars();
  const { data: kelass = [] } = useKelass();
  const { data: mapels = [] } = useMapels();
  const { data: siswas = [] } = useSiswas();
  const { data: assessments = [] } = useAssessments();

  const saveAssessmentMutation = useSaveAssessment();
  const saveGradesMutation = useSaveGrades();

  // Selected state
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // Grading sheet local state
  const { data: serverDetails = [], isLoading: isLoadingDetails } = useAssessmentDetails(
    selectedAssessment?.id || ''
  );
  const [localGrades, setLocalGrades] = useState<Record<string, { nilai: number; catatan: string }>>({});

  const [isOpenForm, setIsOpenForm] = useState(false);
  const scoreInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync serverDetails to local state when loaded
  useEffect(() => {
    const gradesMap: Record<string, { nilai: number; catatan: string }> = {};
    siswas.filter(s => s.status_aktif).forEach((siswa) => {
      const detail = serverDetails.find((d) => d.siswa_id === siswa.id);
      gradesMap[siswa.id] = {
        nilai: detail ? detail.nilai : 0,
        catatan: detail ? detail.catatan || '' : '',
      };
    });
    setLocalGrades(gradesMap);
  }, [serverDetails, siswas]);

  // Form for new assessment
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: {
      judul: '',
      bobot: 20,
      stage: 'DRAFT',
      tanggal: new Date().toISOString().split('T')[0],
    },
  });

  const activeAllocation = allocations.find((a) => a.id === selectedAllocationId);
  const activeKelas = kelass.find((k) => k.id === activeAllocation?.kelas_id);
  const activeMapel = mapels.find((m) => m.id === activeAllocation?.mapel_id);

  // Filter assessments by allocation
  const filteredAssessments = assessments.filter(
    (a) => a.pembagian_mengajar_id === selectedAllocationId
  );

  const onSubmitAssessment = (data: AssessmentFormValues) => {
    if (!currentAcademicTerm || !selectedAllocationId) return;

    const payload: Assessment = {
      id: crypto.randomUUID(),
      assessment_type_id: 'default-type', // placeholder type
      pembagian_mengajar_id: selectedAllocationId,
      academic_term_id: currentAcademicTerm.id,
      judul: data.judul,
      bobot: data.bobot,
      stage: data.stage as AssessmentStage,
      tanggal: data.tanggal,
      created_by: 'teacher',
      created_at: new Date().toISOString(),
    };

    saveAssessmentMutation.mutate(payload, {
      onSuccess: () => {
        setIsOpenForm(false);
        reset();
      },
    });
  };

  const handleGradeChange = (siswaId: string, field: 'nilai' | 'catatan', value: string | number) => {
    if (selectedAssessment?.stage === 'FINAL') {
      return; // Locked
    }

    setLocalGrades((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        [field]: field === 'nilai' ? Math.min(100, Math.max(0, Number(value) || 0)) : value,
      },
    }));
  };

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, siswaIds: string[]) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextSiswaId = siswaIds[index + 1];
      if (nextSiswaId) {
        scoreInputsRef.current[nextSiswaId]?.focus();
        scoreInputsRef.current[nextSiswaId]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevSiswaId = siswaIds[index - 1];
      if (prevSiswaId) {
        scoreInputsRef.current[prevSiswaId]?.focus();
        scoreInputsRef.current[prevSiswaId]?.select();
      }
    }
  };

  const handleSaveAllGrades = () => {
    if (!selectedAssessment) return;

    const gradesPayload: AssessmentDetail[] = Object.entries(localGrades).map(([siswaId, info]) => {
      const existing = serverDetails.find((d) => d.siswa_id === siswaId);
      return {
        id: existing?.id || crypto.randomUUID(),
        assessment_id: selectedAssessment.id,
        siswa_id: siswaId,
        nilai: info.nilai,
        catatan: info.catatan || undefined,
        updated_at: new Date().toISOString(),
      };
    });

    saveGradesMutation.mutate(
      { assessmentId: selectedAssessment.id, grades: gradesPayload },
      {
        onSuccess: () => toast.success('Nilai berhasil disimpan!'),
      }
    );
  };

  // Filter students based on active status
  const activeStudents = siswas.filter((s) => s.status_aktif);
  const activeStudentIds = activeStudents.map((s) => s.id);

  return (
    <div className="space-y-6">
      {!selectedAssessment ? (
        <>
          {/* Main selection and lists */}
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">Asesmen & Penilaian</h2>
            <p className="text-sm text-neutral-500">Pilih rombongan belajar untuk menginput nilai formatif/sumatif</p>
          </div>

          <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Pilih Rombongan Belajar / Jam Mengajar Anda</label>
            <select
              value={selectedAllocationId}
              onChange={(e) => setSelectedAllocationId(e.target.value)}
              className="block w-full px-4 h-12 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
            >
              <option value="">-- Pilih Kelas & Mata Pelajaran --</option>
              {allocations.map((a) => {
                const kelas = kelass.find((k) => k.id === a.kelas_id);
                const mapel = mapels.find((m) => m.id === a.mapel_id);
                return (
                  <option key={a.id} value={a.id}>
                    {kelas?.nama_kelas || 'Kelas'} - {mapel?.nama || 'Mapel'} ({a.jp} JP)
                  </option>
                );
              })}
            </select>
          </div>

          {selectedAllocationId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-800">Daftar Kegiatan Penilaian</h3>
                <button
                  onClick={() => setIsOpenForm(true)}
                  className="flex items-center px-4 h-10 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Penilaian
                </button>
              </div>

              {isOpenForm && (
                <div className="bg-neutral-50 p-6 rounded-card border border-neutral-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-neutral-700">Formulir Kegiatan Penilaian Baru</h4>
                    <button onClick={() => setIsOpenForm(false)} className="text-neutral-500 hover:text-neutral-700">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit(onSubmitAssessment)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700">Judul Ujian/Tugas *</label>
                      <input
                        type="text"
                        {...register('judul')}
                        placeholder="Contoh: Ulangan Harian 1, PTS Semester Ganjil"
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none"
                      />
                      {errors.judul && <p className="text-xs text-red-600">{errors.judul.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700">Tanggal Pelaksanaan *</label>
                      <input
                        type="date"
                        {...register('tanggal')}
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700">Bobot Penilaian (%) *</label>
                      <input
                        type="number"
                        {...register('bobot')}
                        placeholder="Contoh: 20"
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none"
                      />
                      {errors.bobot && <p className="text-xs text-red-600">{errors.bobot.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-neutral-700">Status Penilaian *</label>
                      <select
                        {...register('stage')}
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
                      >
                        <option value="DRAFT">DRAFT (Penyuntingan Nilai)</option>
                        <option value="PUBLISH">PUBLISH (Tampil di Rapor Sementara)</option>
                        <option value="FINAL">FINAL (Kunci / Selesai)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsOpenForm(false)}
                        className="px-4 py-2 border border-neutral-300 rounded-medium text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAssessments.length === 0 ? (
                  <div className="md:col-span-2 text-center py-10 bg-white rounded-card border border-neutral-200 text-neutral-500 text-sm">
                    Belum ada tugas/ujian terdaftar untuk rombel ini.
                  </div>
                ) : (
                  filteredAssessments.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAssessment(a)}
                      className="bg-white p-5 rounded-card border border-neutral-200 shadow-card hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-neutral-800 text-base">{a.judul}</h4>
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              a.stage === 'FINAL'
                                ? 'bg-red-100 text-red-800'
                                : a.stage === 'PUBLISH'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {a.stage}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">Tanggal Pelaksanaan: {a.tanggal}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-neutral-500">Bobot: <strong className="text-neutral-800">{a.bobot}%</strong></span>
                        <span className="text-primary-600 font-bold flex items-center">
                          Input Nilai <Edit2 className="ml-1 h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Grading sheet / Input Nilai Grid */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedAssessment(null)}
              className="flex items-center text-sm font-semibold text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="mr-1 h-5 w-5" /> Kembali ke Daftar Asesmen
            </button>
            {selectedAssessment.stage === 'FINAL' && (
              <span className="flex items-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-medium">
                <AlertTriangle className="mr-1 h-4 w-4 text-red-500" />
                Penilaian Dikunci (FINAL)
              </span>
            )}
          </div>

          <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-6 border-b border-neutral-200">
              <div>
                <h3 className="text-xl font-bold text-neutral-800">{selectedAssessment.judul}</h3>
                <p className="text-sm text-neutral-500">
                  Kelas: {activeKelas?.nama_kelas} | Mapel: {activeMapel?.nama} | Bobot: {selectedAssessment.bobot}%
                </p>
              </div>
              {selectedAssessment.stage !== 'FINAL' && (
                <button
                  onClick={handleSaveAllGrades}
                  disabled={saveGradesMutation.isPending}
                  className="flex items-center px-4 h-12 rounded-medium text-sm font-semibold text-white bg-success-600 hover:bg-success-700 transition-colors shadow-sm mt-3 sm:mt-0"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {saveGradesMutation.isPending ? 'Menyimpan Nilai...' : 'Simpan Perubahan Nilai'}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Nama Siswa</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider w-32">Nilai (0-100)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Catatan Belajar / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {isLoadingDetails ? (
                    <SkeletonRow colSpan={3} />
                  ) : activeStudents.length === 0 ? (
                    <tr><td colSpan={3}>
                      <EmptyState
                        icon={Users}
                        title="Tidak ada siswa terdaftar dalam sistem"
                        description="Siswa harus terdaftar di rombel ini terlebih dahulu."
                      />
                    </td></tr>
                  ) : (
                    activeStudents.map((siswa, index) => {
                      const grade = localGrades[siswa.id] || { nilai: 0, catatan: '' };
                      return (
                        <tr key={siswa.id} className="h-16 hover:bg-primary-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-800">{siswa.nama}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              ref={(el) => { scoreInputsRef.current[siswa.id] = el; }}
                              value={grade.nilai}
                              disabled={selectedAssessment.stage === 'FINAL'}
                              onChange={(e) => handleGradeChange(siswa.id, 'nilai', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, activeStudentIds)}
                              className="w-24 px-3 h-10 border border-neutral-300 rounded-medium text-center font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 disabled:text-neutral-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={grade.catatan}
                              disabled={selectedAssessment.stage === 'FINAL'}
                              onChange={(e) => handleGradeChange(siswa.id, 'catatan', e.target.value)}
                              placeholder="Contoh: Sangat baik memahami konsep pecahan..."
                              className="w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-100 disabled:text-neutral-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
