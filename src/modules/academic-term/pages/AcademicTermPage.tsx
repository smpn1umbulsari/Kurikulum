import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAcademicTerms, useSetActiveTerm, useSaveAcademicTerm } from '../hooks/useAcademicTerm';
import { Calendar, Check, X, CheckCircle, HelpCircle } from 'lucide-react';
import type { AcademicTerm } from '@/types';
import { toast } from '../../../store/toastStore';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';

const academicTermSchema = z.object({
  tahun_ajaran: z.string().regex(/^\d{4}\/\d{4}$/, 'Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)'),
  semester: z.enum(['GANJIL', 'GENAP'] as const, {
    errorMap: () => ({ message: 'Pilih Semester' }),
  }),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  tanggal_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  status: z.boolean().default(false),
});

type AcademicTermFormValues = z.infer<typeof academicTermSchema>;

export default function AcademicTermPage() {
  const { data: terms = [], isLoading } = useAcademicTerms();
  const setActiveTermMutation = useSetActiveTerm();
  const saveTermMutation = useSaveAcademicTerm();

  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcademicTermFormValues>({
    resolver: zodResolver(academicTermSchema),
    defaultValues: {
      tahun_ajaran: '',
      semester: 'GANJIL',
      tanggal_mulai: '',
      tanggal_selesai: '',
      status: false,
    },
  });

  const openModal = () => {
    reset({
      tahun_ajaran: '',
      semester: 'GANJIL',
      tanggal_mulai: '',
      tanggal_selesai: '',
      status: false,
    });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const onSubmit = (data: AcademicTermFormValues) => {
    const payload: AcademicTerm = {
      id: crypto.randomUUID(),
      tahun_ajaran: data.tahun_ajaran,
      semester: data.semester,
      tanggal_mulai: new Date(data.tanggal_mulai).toISOString(),
      tanggal_selesai: new Date(data.tanggal_selesai).toISOString(),
      status: data.status,
      created_at: new Date().toISOString(),
    };

    saveTermMutation.mutate(payload, {
      onSuccess: () => closeModal(),
    });
  };

  const handleActivate = (id: string) => {
    toast.confirm('Apakah Anda yakin ingin mengaktifkan tahun ajaran/semester ini secara global?', () => {
      setActiveTermMutation.mutate(id);
    });
  };

  const activeTerm = terms.find((t) => t.status === true);
  const totalTerms = terms.length;

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Data Master Tahun Ajaran</h2>
          <p className="text-sm text-neutral-500">Kelola tahun ajaran dan status aktif semester global</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center justify-center h-12 px-4 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Calendar className="mr-2 h-5 w-5" />
          Tambah Tahun Ajaran
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
          <div>
            <p className="text-sm font-medium text-neutral-500">Tahun Ajaran Aktif</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">
              {activeTerm ? `${activeTerm.tahun_ajaran} - ${activeTerm.semester}` : 'Belum ditentukan'}
            </p>
          </div>
          <CheckCircle className="h-10 w-10 text-primary-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
          <div>
            <p className="text-sm font-medium text-neutral-500">Total Periode Terdaftar</p>
            <p className="text-3xl font-bold text-neutral-800 mt-1">{totalTerms}</p>
          </div>
          <HelpCircle className="h-10 w-10 text-neutral-400" />
        </div>
      </div>

      {/* Academic Terms Table */}
      <div className="bg-white rounded-card border border-neutral-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Tahun Ajaran</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Tanggal Mulai</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Tanggal Selesai</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {isLoading ? (
                <SkeletonRow colSpan={6} />
              ) : terms.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Calendar}
                      title="Tidak ada data tahun ajaran ditemukan"
                      description="Tambahkan tahun ajaran baru dengan tombol di atas."
                      action={{
                        label: 'Tambah Tahun Ajaran',
                        onClick: openModal,
                      }}
                    />
                  </td>
                </tr>
              ) : (
                terms.map((term) => (
                  <tr key={term.id} className="h-16 hover:bg-primary-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-neutral-800">{term.tahun_ajaran}</td>
                    <td className="px-6 py-4 text-sm text-neutral-800">{term.semester}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {term.tanggal_mulai ? new Date(term.tanggal_mulai).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {term.tanggal_selesai ? new Date(term.tanggal_selesai).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                          term.status
                            ? 'bg-green-100 text-green-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {term.status ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {!term.status && (
                        <button
                          onClick={() => handleActivate(term.id)}
                          disabled={setActiveTermMutation.isPending}
                          className="text-primary-600 hover:text-primary-950 transition-colors font-bold text-xs bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-medium"
                        >
                          Aktifkan
                        </button>
                      )}
                      {term.status && (
                        <span className="text-success-600 font-semibold text-xs flex items-center justify-end">
                          <Check className="h-4 w-4 mr-1 inline" /> Aktif Global
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-card shadow-floating border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <h3 className="text-lg font-bold text-neutral-800">Tambah Tahun Ajaran Baru</h3>
              <button onClick={closeModal} className="text-neutral-500 hover:text-neutral-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Tahun Ajaran *</label>
                <input
                  type="text"
                  {...register('tahun_ajaran')}
                  placeholder="Format: YYYY/YYYY (e.g. 2025/2026)"
                  className={`block w-full px-3 h-10 border ${
                    errors.tahun_ajaran ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-primary-500'
                  } rounded-medium text-sm focus:outline-none`}
                />
                {errors.tahun_ajaran && <p className="text-xs text-red-600">{errors.tahun_ajaran.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Semester *</label>
                <select
                  {...register('semester')}
                  className={`block w-full px-3 h-10 border ${
                    errors.semester ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-primary-500'
                  } rounded-medium text-sm focus:outline-none bg-white`}
                >
                  <option value="GANJIL">GANJIL</option>
                  <option value="GENAP">GENAP</option>
                </select>
                {errors.semester && <p className="text-xs text-red-600">{errors.semester.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-700">Tanggal Mulai *</label>
                  <input
                    type="date"
                    {...register('tanggal_mulai')}
                    className={`block w-full px-3 h-10 border ${
                      errors.tanggal_mulai ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-primary-500'
                    } rounded-medium text-sm focus:outline-none`}
                  />
                  {errors.tanggal_mulai && <p className="text-xs text-red-600">{errors.tanggal_mulai.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-700">Tanggal Selesai *</label>
                  <input
                    type="date"
                    {...register('tanggal_selesai')}
                    className={`block w-full px-3 h-10 border ${
                      errors.tanggal_selesai ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 focus:ring-primary-500'
                    } rounded-medium text-sm focus:outline-none`}
                  />
                  {errors.tanggal_selesai && <p className="text-xs text-red-600">{errors.tanggal_selesai.message}</p>}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('status')}
                    id="term_status"
                    className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="term_status" className="ml-2 text-sm text-neutral-700 select-none">
                    Aktifkan Semester Ini Langsung
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-300 rounded-medium text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveTermMutation.isPending}
                  className="px-4 py-2 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveTermMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
