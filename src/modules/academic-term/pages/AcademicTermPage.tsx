import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAcademicTerms, useSetActiveTerm, useSaveAcademicTerm } from '../hooks/useAcademicTerm';
import { Calendar, Check, CheckCircle, HelpCircle } from 'lucide-react';
import type { AcademicTerm } from '@/types';
import { toast } from '../../../store/toastStore';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { FormField } from '../../../components/ui/FormField';
import { Modal } from '../../../components/ui/Modal';
import { KpiCard } from '../../../components/ui/KpiCard';

const datePreprocess = z.preprocess((val: any) => {
  if (!val) return val;
  
  let dateObj: Date | null = null;
  
  if (val instanceof Date) {
    dateObj = val;
  } else if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      dateObj = new Date(parsed);
    }
  }
  
  if (dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return val;
}, z.string()) as unknown as z.ZodType<string>;

const academicTermSchema = z.object({
  tahun_ajaran: z.string().regex(/^\d{4}\/\d{4}$/, 'Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)'),
  semester: z.enum(['GANJIL', 'GENAP'] as const, {
    errorMap: () => ({ message: 'Pilih Semester' }),
  }),
  tanggal_mulai: datePreprocess.refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Format tanggal harus YYYY-MM-DD',
  }),
  tanggal_selesai: datePreprocess.refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Format tanggal harus YYYY-MM-DD',
  }),
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
        <Button onClick={openModal} variant="primary" size="lg" leftIcon={<Calendar className="h-5 w-5" />}>
          Tambah Tahun Ajaran
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard
          label="Tahun Ajaran Aktif"
          value={activeTerm ? `${activeTerm.tahun_ajaran} - ${activeTerm.semester}` : 'Belum ditentukan'}
          icon={<CheckCircle className="h-10 w-10" />}
          variant="success"
        />
        <KpiCard
          label="Total Periode Terdaftar"
          value={totalTerms}
          icon={<HelpCircle className="h-10 w-10" />}
          variant="default"
        />
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
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title="Tambah Tahun Ajaran Baru"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              isLoading={saveTermMutation.isPending}
              loadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <FormField label="Tahun Ajaran" required error={errors.tahun_ajaran?.message}>
            <Input
              type="text"
              placeholder="Format: YYYY/YYYY (e.g. 2025/2026)"
              error={!!errors.tahun_ajaran}
              {...register('tahun_ajaran')}
            />
          </FormField>

          <FormField label="Semester" required error={errors.semester?.message}>
            <Select
              options={[
                { value: 'GANJIL', label: 'GANJIL' },
                { value: 'GENAP', label: 'GENAP' },
              ]}
              error={!!errors.semester}
              {...register('semester')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tanggal Mulai" required error={errors.tanggal_mulai?.message}>
              <Input
                type="date"
                error={!!errors.tanggal_mulai}
                {...register('tanggal_mulai')}
              />
            </FormField>
            <FormField label="Tanggal Selesai" required error={errors.tanggal_selesai?.message}>
              <Input
                type="date"
                error={!!errors.tanggal_selesai}
                {...register('tanggal_selesai')}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-2 text-sm text-neutral-700 pt-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                {...register('status')}
                className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              Aktifkan Semester Ini Langsung
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
