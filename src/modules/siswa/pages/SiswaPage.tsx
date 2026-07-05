/**
 * SiswaPage - SIKAD v4.0
 * Premium UI based on Guru Spenturi patterns with Smart Excel Import
 */

import { useState, useCallback, useMemo } from 'react';
import { useSiswas, useSaveSiswa, useDeleteSiswa, useImportSiswas, previewSiswaImport, downloadSiswaTemplate, SiswaImportPreviewRow } from '../hooks/useSiswa';
import type { Siswa, JenisKelamin } from '@/types';
import { toast } from '../../../store/toastStore';
import {
  Search, Plus, Trash2, X, Users, CheckCircle,
  Download, Upload, RotateCcw, RefreshCw, ChevronUp, ChevronDown,
  Eye
} from 'lucide-react';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';

const AGAMA_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];

type SortField = 'nipd' | 'nisn' | 'nama' | 'jk' | 'agama';
type SortDirection = 'asc' | 'desc';

function compareValues(a: string | number | undefined, b: string | number | undefined): number {
  // Handle undefined/null
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;

  // If both are numbers, compare numerically
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Otherwise compare as strings with numeric collation (1, 2, 10, 11 instead of 1, 10, 11, 2)
  const valA = String(a ?? '').toLowerCase();
  const valB = String(b ?? '').toLowerCase();
  return valA.localeCompare(valB, undefined, { numeric: true });
}

export default function SiswaPage() {
  const { data: siswas = [], isLoading, refetch } = useSiswas();
  const saveSiswaMutation = useSaveSiswa();
  const deleteSiswaMutation = useDeleteSiswa();
  const importSiswaMutation = useImportSiswas();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [nipd, setNipd] = useState('');
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [jk, setJk] = useState<JenisKelamin>('L');
  const [agama, setAgama] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');

  const [statusAktif, setStatusAktif] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState('');
  const [agamaFilter, setAgamaFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('nipd');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [importPreview, setImportPreview] = useState<SiswaImportPreviewRow[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewRowsPerPage] = useState(10);
  const [importMode, setImportMode] = useState<'update' | 'skip' | 'overwrite'>('update');

  const filteredSiswas = useMemo(() => {
    let result = [...siswas];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.nama || '').toLowerCase().includes(term) ||
        (s.nisn || '').toLowerCase().includes(term) ||
        ((s as { nipd?: string }).nipd || '').toLowerCase().includes(term)
      );
    }
    if (tingkatFilter) {
      result = result.filter(s => ((s as { kelas?: string }).kelas || '').startsWith(tingkatFilter));
    }
    if (agamaFilter) {
      result = result.filter(s => s.agama === agamaFilter);
    }
    result.sort((a, b) => {
      const getVal = (s: Siswa) => {
        if (sortField === 'nipd') return (s as { nipd?: string }).nipd || s.nipd;
        if (sortField === 'nisn') return s.nisn;
        if (sortField === 'nama') return s.nama;
        if (sortField === 'jk') return s.jk;
        return s.agama;
      };
      const cmp = compareValues(getVal(a), getVal(b));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [siswas, searchTerm, tingkatFilter, agamaFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredSiswas.length / rowsPerPage));
  const paginatedSiswas = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSiswas.slice(start, start + rowsPerPage);
  }, [filteredSiswas, currentPage, rowsPerPage]);

  const totalSiswa = siswas.length;
  const aktifSiswa = siswas.filter(s => s.status_aktif).length;

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
    setTingkatFilter('');
    setAgamaFilter('');
    setCurrentPage(1);
  }, []);

  const openModal = useCallback((siswa: Siswa | null = null) => {
    if (siswa) {
      setEditingSiswa(siswa);
      setNipd((siswa as { nipd?: string }).nipd || '');
      setNisn(siswa.nisn || '');
      setNama(siswa.nama);
      setJk(siswa.jk || 'L');
      setAgama(siswa.agama || '');
      setTempatLahir(siswa.tempat_lahir || '');
      setTanggalLahir(siswa.tanggal_lahir || '');

      setStatusAktif(siswa.status_aktif);
    } else {
      setEditingSiswa(null);
      setNipd('');
      setNisn('');
      setNama('');
      setJk('L');
      setAgama('');
      setTempatLahir('');
      setTanggalLahir('');

      setStatusAktif(true);
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSiswa(null);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) { toast.error('Nama siswa wajib diisi!'); return; }
    const payload: Siswa = {
      id: editingSiswa?.id || crypto.randomUUID(),
      nipd: nipd || undefined,
      nisn: nisn || undefined,
      nama: nama.trim(),
      jk,
      agama: agama || undefined,
      tempat_lahir: tempatLahir || undefined,
      tanggal_lahir: tanggalLahir || undefined,

      status_aktif: statusAktif,
      created_at: editingSiswa?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveSiswaMutation.mutate(payload, {
      onSuccess: () => { closeModal(); toast.success(editingSiswa ? 'Data siswa berhasil diperbarui!' : 'Data siswa berhasil disimpan!'); },
      onError: (error) => { toast.error(`Gagal menyimpan: ${error instanceof Error ? error.message : 'Unknown error'}`); },
    });
  }, [editingSiswa, nipd, nisn, nama, jk, agama, tempatLahir, tanggalLahir, statusAktif, saveSiswaMutation, closeModal]);

  const handleDelete = useCallback((siswa: Siswa) => {
    toast.confirm(`Hapus siswa "${siswa.nama}"?`, () => {
      deleteSiswaMutation.mutate(siswa.id, {
        onSuccess: () => toast.success('Siswa berhasil dihapus!'),
        onError: (error) => toast.error(`Gagal: ${error instanceof Error ? error.message : 'Unknown error'}`),
      });
    });
  }, [deleteSiswaMutation]);

  const handleExcelImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    previewSiswaImport(file)
      .then((preview) => { setImportPreview(preview); setIsPreviewModalOpen(true); setPreviewPage(1); })
      .catch((err) => { console.error(err); toast.error('Gagal membaca file Excel'); });
    e.target.value = '';
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadSiswaTemplate();
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">Akademik</span>
          <h2 className="text-2xl font-bold text-neutral-900">Data Siswa</h2>
          <p className="text-sm text-neutral-500">Kelola biodata peserta didik aktif sekolah.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 flex items-center gap-3">
            <div><p className="text-xs text-neutral-500">Total</p><p className="text-lg font-bold">{totalSiswa}</p></div>
            <Users className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 flex items-center gap-3">
            <div><p className="text-xs text-neutral-500">Aktif</p><p className="text-lg font-bold text-emerald-600">{aktifSiswa}</p></div>
            <CheckCircle className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-neutral-100">
          <button onClick={() => openModal(null)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
            <Plus className="h-4 w-4" /> Tambah Siswa
          </button>
          <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium">
            <Download className="h-4 w-4" /> Template
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium cursor-pointer">
            <Upload className="h-4 w-4" /> Import
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport} />
          </label>
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={() => { refetch(); setCurrentPage(1); }} className={`flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50">
          <div className="flex-1 min-w-[280px]">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase mb-1"><Search className="h-3 w-3" /> Pencarian</label>
            <input type="text" placeholder="Cari nama, NISN, NIPD..." value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">Tingkat</label>
            <select value={tingkatFilter} onChange={(e) => { setTingkatFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm">
              <option value="">Semua</option>
              <option value="VII">VII</option><option value="VIII">VIII</option><option value="IX">IX</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1">Agama</label>
            <select value={agamaFilter} onChange={(e) => { setAgamaFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm">
              <option value="">Semua</option>
              {AGAMA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-sm text-neutral-600 font-medium">{filteredSiswas.length} siswa</span>
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2 border border-neutral-300 rounded-xl text-sm">
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('nipd')}>NIPD <SortIcon field="nipd" /></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('nisn')}>NISN <SortIcon field="nisn" /></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('nama')}>Nama <SortIcon field="nama" /></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('jk')}>JK <SortIcon field="jk" /></th>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('agama')}>Agama <SortIcon field="agama" /></th>
                <th className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase">Aktif</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <SkeletonRow colSpan={7} />
              ) : paginatedSiswas.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={Users}
                    title="Tidak ada data siswa ditemukan"
                    description="Tambahkan siswa baru dengan tombol '+' di atas."
                    action={{
                      label: 'Tambah Siswa',
                      onClick: () => openModal(null),
                    }}
                  />
                </td></tr>
              ) : paginatedSiswas.map((siswa) => (
                <tr key={siswa.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-semibold">{(siswa as { nipd?: string }).nipd || '-'}</td>
                  <td className="px-4 py-3 text-sm">{siswa.nisn || '-'}</td>
                  <td className="px-4 py-3 text-sm">{siswa.nama}</td>
                  <td className="px-4 py-3 text-sm text-center">{siswa.jk || '-'}</td>
                  <td className="px-4 py-3 text-sm">{siswa.agama || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${siswa.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                      {siswa.status_aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(siswa)} className="p-2 text-neutral-500 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg" title="Edit"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(siswa)} className="p-2 text-neutral-500 hover:bg-red-100 hover:text-red-600 rounded-lg" title="Hapus"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-sm text-neutral-600">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-neutral-300 rounded-lg text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-neutral-300 rounded-lg text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-neutral-200 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase mb-2">Input Data Siswa</span>
                  <h3 className="text-xl font-bold">{editingSiswa ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}</h3>
                </div>
                <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">NIPD</label>
                  <input type="text" value={nipd} onChange={(e) => setNipd(e.target.value)} placeholder="1001"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm" /></div>
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">NISN</label>
                  <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="0123456789"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm" /></div>
                <div className="col-span-2"><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Nama Lengkap *</label>
                  <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Siswa"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm" required /></div>
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">JK</label>
                  <select value={jk} onChange={(e) => setJk(e.target.value as JenisKelamin)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm">
                    <option value="L">Laki-laki</option><option value="P">Perempuan</option>
                  </select></div>
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Agama</label>
                  <select value={agama} onChange={(e) => setAgama(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm">
                    <option value="">Pilih</option>
                    {AGAMA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select></div>
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Tempat Lahir</label>
                  <input type="text" value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)} placeholder="Jakarta"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm" /></div>
                <div><label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Tanggal Lahir</label>
                  <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm" /></div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={statusAktif} onChange={(e) => setStatusAktif(e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm">Siswa aktif</span></label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-neutral-300 rounded-xl text-sm">Batal</button>
                <button type="submit" disabled={saveSiswaMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {saveSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setIsPreviewModalOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b bg-emerald-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Preview Import ({importPreview.length} data)</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Baru: {importPreview.filter(r => r.status === 'NEW').length}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Update: {importPreview.filter(r => r.status === 'UPDATE').length}</span>
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">Same: {importPreview.filter(r => r.status === 'SAME').length}</span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Error: {importPreview.filter(r => r.status === 'ERROR').length}</span>
                  </div>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="overflow-auto max-h-[50vh] p-4">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 sticky top-0">
                  <tr><th className="px-3 py-2 text-left">NIPD</th><th className="px-3 py-2 text-left">NISN</th><th className="px-3 py-2 text-left">Nama</th><th className="px-3 py-2 text-left">JK</th><th className="px-3 py-2 text-left">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {importPreview.slice((previewPage - 1) * previewRowsPerPage, previewPage * previewRowsPerPage).map((row, idx) => {
                    const bg: Record<string, string> = { NEW: 'bg-emerald-50', UPDATE: 'bg-blue-50', SAME: 'bg-neutral-100', ERROR: 'bg-red-50', CONFLICT: 'bg-amber-50' };
                    return (
                      <tr key={idx} className={bg[row.status] || ''}>
                        <td className="px-3 py-2">{(row.data as { nipd?: string }).nipd || '-'}</td>
                        <td className="px-3 py-2">{row.data.nisn || '-'}</td>
                        <td className="px-3 py-2">{row.data.nama || '-'}</td>
                        <td className="px-3 py-2">{row.data.jk || '-'}</td>
                        <td className="px-3 py-2 font-bold">{row.status}{row.errorMessage && <span className="block text-xs text-red-600">{row.errorMessage}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t bg-neutral-50">
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2"><input type="radio" name="mode" value="update" checked={importMode === 'update'} onChange={(e) => setImportMode(e.target.value as typeof importMode)} /> <span className="text-sm">Update</span></label>
                <label className="flex items-center gap-2"><input type="radio" name="mode" value="skip" checked={importMode === 'skip'} onChange={(e) => setImportMode(e.target.value as typeof importMode)} /> <span className="text-sm">Skip</span></label>
                <label className="flex items-center gap-2"><input type="radio" name="mode" value="overwrite" checked={importMode === 'overwrite'} onChange={(e) => setImportMode(e.target.value as typeof importMode)} /> <span className="text-sm">Overwrite</span></label>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsPreviewModalOpen(false)} className="px-4 py-2 border rounded-xl text-sm">Batal</button>
                <button onClick={() => {
                  importSiswaMutation.mutate({ preview: importPreview, mode: importMode }, {
                    onSuccess: () => { setIsPreviewModalOpen(false); setImportPreview([]); refetch(); toast.success('Import berhasil!'); },
                    onError: (e) => toast.error(`Gagal: ${e}`),
                  });
                }} disabled={importSiswaMutation.isPending} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm disabled:opacity-50">
                  {importSiswaMutation.isPending ? 'Mengupload...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
