/**
 * GuruPage - SIKAD v4.0
 * Premium UI based on Guru Spenturi patterns
 * Adopted from D:\KURIKULUM\Data Kurikulum\www\Guru\ui.js
 */

import { useState, useCallback, useMemo } from 'react';
import { useGurus, useSaveGuru, useDeleteGuru, useImportGurus, downloadGuruTemplate, previewGuruImport, ImportPreviewRow } from '../hooks/useGuru';
import type { Guru, JenisKelamin } from '@/types';
import { INDUK_MAPEL_OPTIONS } from '@/types';
import { toast } from '../../../store/toastStore';
import {
  Search, Plus, Edit2, Trash2, X, Users, CheckCircle, HelpCircle,
  Download, Upload, RotateCcw, RefreshCw, ChevronUp, ChevronDown,
  Eye
} from 'lucide-react';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { FormField } from '../../../components/ui/FormField';
import { Toolbar } from '../../../components/ui/Toolbar';
import { KpiCard } from '../../../components/ui/KpiCard';

// ============ STATUS OPTIONS ============
const GURU_STATUS_OPTIONS = [
  { value: 'PNS', label: 'PNS' },
  { value: 'PPPK', label: 'PPPK' },
  { value: 'PPPK PW', label: 'PPPK PW' },
  { value: 'GTT', label: 'GTT' },
];

// ============ SORT UTILITIES ============
type SortField = 'kode' | 'nama' | 'nip' | 'status' | 'mata_pelajaran' | 'urutan';
type SortDirection = 'asc' | 'desc';

/**
 * Compare values for sorting
 * Numbers are compared numerically, strings alphabetically
 */
function compareValues(a: string | number | undefined, b: string | number | undefined): number {
  // Handle undefined/null
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  // If both are numbers, compare numerically
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Otherwise compare as strings with numeric collation (1, 2, 10, 11 instead of 1, 10, 11, 2)
  const valA = String(a).toLowerCase();
  const valB = String(b).toLowerCase();
  return valA.localeCompare(valB, undefined, { numeric: true });
}

// ============ MAIN COMPONENT ============
export default function GuruPage() {
  // Data & Loading
  const { data: gurus = [], isLoading, refetch } = useGurus();
  const saveGuruMutation = useSaveGuru();
  const deleteGuruMutation = useDeleteGuru();
  const importGuruMutation = useImportGurus();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);

  // Form State
  const [kode, setKode] = useState('');
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [gelarDepan, setGelarDepan] = useState('');
  const [gelarBelakang, setGelarBelakang] = useState('');
  const [jk, setJk] = useState<JenisKelamin>('L');
  const [status, setStatus] = useState('PNS');
  const [mapel, setMapel] = useState('');
  const [noHp, setNoHp] = useState('');
  const [statusAktif, setStatusAktif] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('urutan');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Inline Edit
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  // Import Preview State
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage] = useState(10);
  const [importMode, setImportMode] = useState<'update' | 'skip' | 'overwrite'>('update');

  // ============ COMPUTED ============
  const filteredGurus = useMemo(() => {
    let result = [...gurus];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(g =>
        (g.nama || '').toLowerCase().includes(term) ||
        (g.nip || '').toLowerCase().includes(term) ||
        (g as any).kode_guru?.toLowerCase().includes(term) ||
        (g as any).mata_pelajaran?.toLowerCase().includes(term) ||
        (g as any).status?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(g => (g as any).status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      // Special case: 'urutan' sort = database insertion order (created_at)
      if (sortField === 'urutan') {
        const aTime = a.created_at || '';
        const bTime = b.created_at || '';
        const cmp = aTime.localeCompare(bTime);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      let valA: string | number | undefined;
      let valB: string | number | undefined;

      switch (sortField) {
        case 'kode': valA = (a as any).kode_guru; valB = (b as any).kode_guru; break;
        case 'nama': valA = a.nama; valB = b.nama; break;
        case 'nip': valA = a.nip; valB = b.nip; break;
        case 'status': valA = (a as any).status; valB = (b as any).status; break;
        case 'mata_pelajaran': valA = (a as any).mata_pelajaran; valB = (b as any).mata_pelajaran; break;
      }

      const cmp = compareValues(valA, valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [gurus, searchTerm, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredGurus.length / rowsPerPage));
  const paginatedGurus = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredGurus.slice(start, start + rowsPerPage);
  }, [filteredGurus, currentPage, rowsPerPage]);

  // KPI
  const totalGuru = gurus.length;
  const aktifGuru = gurus.filter(g => g.status_aktif).length;
  const nonAktifGuru = totalGuru - aktifGuru;

  // ============ HANDLERS ============
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleReset = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setCurrentPage(1);
  }, [refetch]);

  const openModal = useCallback((guru: Guru | null = null) => {
    if (guru) {
      setEditingGuru(guru);
      setKode((guru as any).kode_guru || '');
      setNip(guru.nip || '');
      setNama(guru.nama);
      setGelarDepan(guru.gelar_depan || '');
      setGelarBelakang(guru.gelar_belakang || '');
      setJk(guru.jk || 'L');
      setStatus((guru as any).status || 'PNS');
      setMapel((guru as any).mata_pelajaran || '');
      setNoHp(guru.no_hp || '');
      setStatusAktif(guru.status_aktif);
    } else {
      setEditingGuru(null);
      setKode('');
      setNip('');
      setNama('');
      setGelarDepan('');
      setGelarBelakang('');
      setJk('L');
      setStatus('PNS');
      setMapel('');
      setNoHp('');
      setStatusAktif(true);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingGuru(null);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error('Nama guru wajib diisi!');
      return;
    }
    if (!kode.trim()) {
      toast.error('Kode guru wajib diisi!');
      return;
    }

    const payload: any = {
      id: editingGuru?.id || crypto.randomUUID(),
      kode: kode.trim(), // Store kode_guru in kode field
      nip: nip || undefined,
      nama: nama.trim(),
      gelar_depan: gelarDepan || undefined,
      gelar_belakang: gelarBelakang || undefined,
      jk,
      status_aktif: statusAktif,
      created_at: editingGuru?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add extended fields
    (payload as any).kode_guru = kode.trim();
    (payload as any).status = status;
    (payload as any).mata_pelajaran = mapel;

    saveGuruMutation.mutate(payload, {
      onSuccess: () => {
        closeModal();
        toast.success(editingGuru ? 'Data guru berhasil diperbarui!' : 'Data guru berhasil disimpan!');
      },
      onError: (error) => {
        toast.error(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      },
    });
  }, [editingGuru, kode, nip, nama, gelarDepan, gelarBelakang, jk, status, mapel, noHp, statusAktif, saveGuruMutation, closeModal]);

  const handleDelete = useCallback((guru: Guru) => {
    toast.confirm(`Hapus guru "${guru.nama}"?`, () => {
      deleteGuruMutation.mutate(guru.id, {
        onSuccess: () => toast.success('Guru berhasil dihapus!'),
        onError: (error) => toast.error(`Gagal menghapus: ${error instanceof Error ? error.message : 'Unknown error'}`),
      });
    });
  }, [deleteGuruMutation]);

  const handleInlineEdit = useCallback((guru: Guru) => {
    setEditingRow(guru.id);
    setEditValues({
      nama: guru.nama,
      nip: guru.nip,
      jk: guru.jk,
      ['status']: (guru as any).status || 'PNS',
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRow(null);
    setEditValues({});
  }, []);

  const handleSaveEdit = useCallback((guru: Guru) => {
    const payload: any = {
      ...guru,
      ...editValues,
      updated_at: new Date().toISOString(),
    };
    saveGuruMutation.mutate(payload, {
      onSuccess: () => {
        setEditingRow(null);
        setEditValues({});
      },
    });
  }, [editValues, saveGuruMutation]);

  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview first
    previewGuruImport(file)
      .then((preview) => {
        setImportPreview(preview);
        setIsPreviewModalOpen(true);
        setPreviewPage(1);
      })
      .catch((err) => {
        console.error('Preview error:', err);
        toast.error('Gagal membaca file Excel');
      });

    e.target.value = '';
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadGuruTemplate();
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? <ChevronUp className="inline h-3 w-3" />
      : <ChevronDown className="inline h-3 w-3" />;
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            Administrasi
          </span>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Data Guru</h2>
          <p className="text-sm text-neutral-500 mt-1">Kelola data guru dan pengajar aktif sekolah.</p>
        </div>

        {/* KPI Badge */}
        <div className="flex gap-3">
          <KpiCard
            label="Total"
            value={totalGuru}
            icon={<Users className="h-6 w-6" />}
            variant="default"
            className="h-[80px] p-4 gap-3"
          />
          <KpiCard
            label="Aktif"
            value={aktifGuru}
            icon={<CheckCircle className="h-6 w-6" />}
            variant="success"
            className="h-[80px] p-4 gap-3"
          />
          <KpiCard
            label="Nonaktif"
            value={nonAktifGuru}
            icon={<HelpCircle className="h-6 w-6" />}
            variant="danger"
            className="h-[80px] p-4 gap-3"
          />
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        actions={
          <>
            <Button
              onClick={() => openModal(null)}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Tambah Guru
            </Button>

            <Button
              onClick={handleDownloadTemplate}
              variant="secondary"
              leftIcon={<Download className="h-4 w-4" />}
            >
              Template
            </Button>

            <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-medium text-sm font-medium transition-colors cursor-pointer active:scale-95 duration-100">
              <Upload className="h-4 w-4" />
              Import
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
                disabled={importGuruMutation.isPending}
              />
            </label>

            <Button
              onClick={handleReset}
              variant="secondary"
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Reset
            </Button>

            <Button
              onClick={handleRefresh}
              variant="secondary"
              isLoading={isLoading}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </>
        }
        filters={
          <>
            <div className="flex-1 min-w-[280px]">
              <Input
                label="Pencarian"
                placeholder="Cari guru, kode, NIP, status, atau mapel..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="w-40">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                options={[
                  { value: '', label: 'Semua' },
                  ...GURU_STATUS_OPTIONS
                ]}
              />
            </div>

            <div className="flex items-end gap-2 h-10">
              <span className="text-sm text-neutral-600 font-medium self-center">
                {filteredGurus.length} guru
              </span>
              <Select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                options={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' },
                  { value: '999999', label: 'Semua' },
                ]}
                className="w-20"
              />
            </div>
          </>
        }
      />

      {/* Table */}
      <div className="bg-white rounded-card border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-16"
                  onClick={() => handleSort('urutan')}
                >
                  No <SortIcon field="urutan" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('kode')}
                >
                  Kode <SortIcon field="kode" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('nama')}
                >
                  Nama dengan Gelar <SortIcon field="nama" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('nip')}
                >
                  NIP <SortIcon field="nip" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('mata_pelajaran')}
                >
                  Mapel <SortIcon field="mata_pelajaran" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Aktif
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <SkeletonRow colSpan={8} />
              ) : paginatedGurus.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Users}
                      title="Tidak ada data guru ditemukan"
                      description="Tambahkan guru baru dengan tombol '+' di atas."
                      action={{
                        label: 'Tambah Guru',
                        onClick: () => openModal(null),
                      }}
                    />
                  </td>
                </tr>
              ) : (
                paginatedGurus.map((guru, index) => {
                  const namaLengkap = [
                    guru.gelar_depan,
                    guru.nama,
                    guru.gelar_belakang && `, ${guru.gelar_belakang}`
                  ].filter(Boolean).join(' ');

                  if (editingRow === guru.id) {
                    return (
                      <tr key={guru.id} className="bg-blue-50">
                        <td className="px-4 py-3 text-center text-sm font-mono text-neutral-500">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{(guru as any).kode_guru || '-'}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues.nama || ''}
                            onChange={(e) => setEditValues({ ...editValues, nama: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editValues.nip || ''}
                            onChange={(e) => setEditValues({ ...editValues, nip: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={(editValues as any).status || 'PNS'}
                            onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            {GURU_STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">{(guru as any).mata_pelajaran || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            guru.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {guru.status_aktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleSaveEdit(guru)}
                              className="px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-medium hover:bg-primary-700"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-300"
                            >
                              Batal
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={guru.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-center text-sm font-mono font-semibold text-neutral-500">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-neutral-800">
                        {(guru as any).kode_guru || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-800">{namaLengkap}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{guru.nip || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-lg">
                          {(guru as any).status || 'PNS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">{(guru as any).mata_pelajaran || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          guru.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {guru.status_aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleInlineEdit(guru)}
                            className="p-2 text-neutral-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                            title="Edit inline"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openModal(guru)}
                            className="p-2 text-neutral-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(guru)}
                            className="p-2 text-neutral-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-sm text-neutral-600">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingGuru ? 'Ubah Data Guru' : 'Tambah Guru Baru'}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-neutral-500 max-w-md text-left">
              Nama pada tabel akan otomatis ditampilkan beserta gelar depan dan belakang.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeModal}>
                Batal
              </Button>
              <Button
                variant="primary"
                type="submit"
                onClick={handleSubmit}
                isLoading={saveGuruMutation.isPending}
              >
                Simpan Data Guru
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kode Guru *" error="">
              <Input
                type="text"
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="Contoh: GR-001"
                required
              />
            </FormField>

            <FormField label="NIP" error="">
              <Input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="19xxxxxxxxxxxxxx"
              />
            </FormField>

            <FormField label="Status" error="">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={GURU_STATUS_OPTIONS}
              />
            </FormField>

            <FormField label="Mata Pelajaran" error="">
              <Select
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                options={[
                  { value: '', label: 'Pilih Mapel' },
                  ...INDUK_MAPEL_OPTIONS.map(opt => ({ value: opt.nama, label: opt.nama }))
                ]}
              />
            </FormField>

            <div className="col-span-2">
              <FormField label="Nama Tanpa Gelar *" error="">
                <Input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama tanpa gelar"
                  required
                />
              </FormField>
            </div>

            <FormField label="Gelar Depan" error="">
              <Input
                type="text"
                value={gelarDepan}
                onChange={(e) => setGelarDepan(e.target.value)}
                placeholder="Contoh: Drs."
              />
            </FormField>

            <FormField label="Gelar Belakang" error="">
              <Input
                type="text"
                value={gelarBelakang}
                onChange={(e) => setGelarBelakang(e.target.value)}
                placeholder="Contoh: S.Pd."
              />
            </FormField>

            <FormField label="Jenis Kelamin" error="">
              <Select
                value={jk}
                onChange={(e) => setJk(e.target.value as JenisKelamin)}
                options={[
                  { value: 'L', label: 'Laki-laki' },
                  { value: 'P', label: 'Perempuan' },
                ]}
              />
            </FormField>

            <FormField label="No. HP" error="">
              <Input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />
            </FormField>

            <div className="col-span-2 flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={statusAktif}
                  onChange={(e) => setStatusAktif(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                Guru aktif / masih mengajar
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Modal for Excel Import */}
      {isPreviewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewModalOpen(false);
          }}
        >
          <div className="bg-white rounded-card w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-floating flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">Preview Import ({importPreview.length} data)</h3>
                  <p className="text-sm text-neutral-500 mt-1">Periksa data sebelum disimpan ke database</p>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-medium transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary */}
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  Baru: {importPreview.filter(r => r.status === 'NEW').length}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  Update: {importPreview.filter(r => r.status === 'UPDATE').length}
                </span>
                <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-semibold rounded-full">
                  Same: {importPreview.filter(r => r.status === 'SAME').length}
                </span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  Conflict: {importPreview.filter(r => r.status === 'CONFLICT').length}
                </span>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  Error: {importPreview.filter(r => r.status === 'ERROR').length}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">Kode</th>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">NIP</th>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">Nama</th>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">JK</th>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">Status</th>
                    <th className="px-3 py-2 text-left font-bold text-neutral-600">Mapel</th>
                    <th className="px-3 py-2 text-center font-bold text-neutral-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {importPreview
                    .slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage)
                    .map((row, idx) => {
                      const bgColor = {
                        'NEW': 'bg-emerald-50',
                        'UPDATE': 'bg-blue-50',
                        'SAME': 'bg-neutral-100',
                        'CONFLICT': 'bg-amber-50',
                        'ERROR': 'bg-red-50',
                      }[row.status];

                      const textColor = {
                        'NEW': 'text-emerald-700',
                        'UPDATE': 'text-blue-700',
                        'SAME': 'text-neutral-600',
                        'CONFLICT': 'text-amber-700',
                        'ERROR': 'text-red-700',
                      }[row.status];

                      return (
                        <tr key={idx} className={bgColor}>
                          <td className="px-3 py-2 font-mono">{(row.data as any).kode_guru || '-'}</td>
                          <td className="px-3 py-2">{(row.data as any).nip || row.data.nip || '-'}</td>
                          <td className="px-3 py-2">{row.data.nama || '-'}</td>
                          <td className="px-3 py-2">{row.data.jk || '-'}</td>
                          <td className="px-3 py-2">{(row.data as any).status || 'PNS'}</td>
                          <td className="px-3 py-2">{(row.data as any).mata_pelajaran || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-bold ${textColor}`}>
                              {row.status}
                              {row.errorMessage && <span className="block text-xs font-normal text-red-600">{row.errorMessage}</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {/* Pagination */}
              {Math.ceil(importPreview.length / previewRowsPerPage) > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="px-3 py-1 bg-neutral-100 rounded-lg text-sm hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-neutral-600">
                    Halaman {previewPage} dari {Math.ceil(importPreview.length / previewRowsPerPage)}
                  </span>
                  <button
                    onClick={() => setPreviewPage(p => Math.min(Math.ceil(importPreview.length / previewRowsPerPage), p + 1))}
                    disabled={previewPage === Math.ceil(importPreview.length / previewRowsPerPage)}
                    className="px-3 py-1 bg-neutral-100 rounded-lg text-sm hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
              {/* Import Mode */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-600 uppercase mb-2">Mode Import:</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="update"
                      checked={importMode === 'update'}
                      onChange={(e) => setImportMode(e.target.value as typeof importMode)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Update (ubah jika berbeda)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="skip"
                      checked={importMode === 'skip'}
                      onChange={(e) => setImportMode(e.target.value as typeof importMode)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Skip (lewati data lama)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={(e) => setImportMode(e.target.value as typeof importMode)}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Overwrite (paksa semua)</span>
                  </label>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4 text-xs text-neutral-500">
                <span>🟢 Hijau=Baru</span>
                <span>🔵 Biru=Update</span>
                <span>⬜ Abu=Sama</span>
                <span>🟡 Kuning=Conflict</span>
                <span>🔴 Merah=Error</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setImportPreview([]);
                  }}
                  className="px-5 py-2.5 border border-neutral-300 rounded-medium text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    // Execute import with selected mode and preview data
                    importGuruMutation.mutate(
                      { preview: importPreview, mode: importMode },
                      {
                        onSuccess: () => {
                          setIsPreviewModalOpen(false);
                          setImportPreview([]);
                          refetch();
                          toast.success('Import berhasil!');
                        },
                        onError: (error) => toast.error(`Gagal: ${error instanceof Error ? error.message : error}`),
                      }
                    );
                  }}
                  disabled={importGuruMutation.isPending || importPreview.length === 0}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-medium text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {importGuruMutation.isPending ? 'Mengupload...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
