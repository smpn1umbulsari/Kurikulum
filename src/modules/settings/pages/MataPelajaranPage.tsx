/**
 * MataPelajaranPage - SIKAD v4.0
 * Premium UI adapted from GuruPage/SiswaPage patterns
 * Manages MataPelajaran SMP Kurikulum Merdeka
 */

import { useState, useCallback, useMemo } from 'react';
import { useMapels } from '../hooks/useMapel';
import { toast } from '../../../store/toastStore';
import { useCreateMapel, useUpdateMapel, useDeleteMapel, useCreateBulkMapels } from '../hooks/useMapel';
import type { MataPelajaran } from '@/types';
import { INDUK_MAPEL_OPTIONS, MAPEL_AGAMA_OPTIONS, SEED_MAPEL_SMP } from '@/types';
import { getTotalJP } from '../../../utils/mapelHelpers';
import {
  Search, Plus, Edit2, Trash2, X, BookMarked, CheckCircle, HelpCircle,
  Database, RotateCcw, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';

// ============ SORT UTILITIES ============
type SortField = 'mapping' | 'kode' | 'nama' | 'kelompok_mapel' | 'jp_real' | 'jp_dapo';
type SortDirection = 'asc' | 'desc';

function compareValues(a: string | number | undefined, b: string | number | undefined): number {
  const valA = String(a ?? '').toLowerCase();
  const valB = String(b ?? '').toLowerCase();
  return valA.localeCompare(valB, undefined, { numeric: true });
}

interface MapelFormValues {
  kode: string;
  nama: string;
  kelompok_mapel: 'A' | 'B';
  aktif: boolean;
  mapping?: number;
  induk_mapel?: string;
  induk_nama?: string;
  agama?: string;
  jp_real?: number;
  jp_dapo?: number;
}

// ============ MAIN COMPONENT ============
export default function MataPelajaranPage() {
  const { data: mapels = [], isLoading, refetch } = useMapels();
  const createMutation = useCreateMapel();
  const updateMutation = useUpdateMapel();
  const deleteMutation = useDeleteMapel();
  const bulkCreateMutation = useCreateBulkMapels();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);
  const [formData, setFormData] = useState<MapelFormValues>({
    kode: '',
    nama: '',
    kelompok_mapel: 'A',
    aktif: true,
    mapping: undefined,
    induk_mapel: '',
    induk_nama: '',
    agama: '',
    jp_real: undefined,
    jp_dapo: undefined,
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [kelompokFilter, setKelompokFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('mapping');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // ============ COMPUTED ============
  const filteredMapels = useMemo(() => {
    let result = [...mapels];

    // Search filter
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.nama.toLowerCase().includes(term) ||
        m.kode.toLowerCase().includes(term) ||
        (m.induk_mapel && m.induk_mapel.toLowerCase().includes(term)) ||
        (m.induk_nama && m.induk_nama.toLowerCase().includes(term))
      );
    }

    // Kelompok filter
    if (kelompokFilter) {
      result = result.filter(m => m.kelompok_mapel === kelompokFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      switch (sortField) {
        case 'mapping': valA = a.mapping; valB = b.mapping; break;
        case 'kode': valA = a.kode; valB = b.kode; break;
        case 'nama': valA = a.nama; valB = b.nama; break;
        case 'kelompok_mapel': valA = a.kelompok_mapel; valB = b.kelompok_mapel; break;
        case 'jp_real': valA = a.jp_real; valB = b.jp_real; break;
        case 'jp_dapo': valA = a.jp_dapo; valB = b.jp_dapo; break;
      }

      const cmp = compareValues(valA, valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [mapels, searchQuery, kelompokFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMapels.length / rowsPerPage));
  const paginatedMapels = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMapels.slice(start, start + rowsPerPage);
  }, [filteredMapels, currentPage, rowsPerPage]);

  // KPI
  const totalMapel = mapels.length;
  const aktifMapel = mapels.filter(m => m.aktif).length;
  const nonAktifMapel = totalMapel - aktifMapel;

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
    setSearchQuery('');
    setKelompokFilter('');
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setCurrentPage(1);
  }, [refetch]);

  const handleSeedData = async () => {
    toast.confirm(
      'Inject data mapel SMP Kurikulum Merdeka (12 mapel)?\n\nData yang sudah ada akan dipertahankan.',
      () => {
        const toInject = SEED_MAPEL_SMP.filter(
          (mapel) => !mapels.some((m) => m.kode === mapel.kode)
        );

        if (toInject.length > 0) {
          bulkCreateMutation.mutate(toInject);
        } else {
          toast.info('Semua mapel seed sudah ada!');
        }
      }
    );
  };

  const openModal = useCallback((mapel: MataPelajaran | null = null) => {
    if (mapel) {
      setEditingMapel(mapel);
      setFormData({
        kode: mapel.kode,
        nama: mapel.nama,
        kelompok_mapel: mapel.kelompok_mapel as 'A' | 'B',
        aktif: mapel.aktif,
        mapping: mapel.mapping,
        induk_mapel: mapel.induk_mapel,
        induk_nama: mapel.induk_nama,
        agama: mapel.agama,
        jp_real: mapel.jp_real,
        jp_dapo: mapel.jp_dapo,
      });
    } else {
      setEditingMapel(null);
      setFormData({
        kode: '',
        nama: '',
        kelompok_mapel: 'A',
        aktif: true,
        mapping: undefined,
        induk_mapel: '',
        induk_nama: '',
        agama: '',
        jp_real: undefined,
        jp_dapo: undefined,
      });
    }
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMapel(null);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mapping) {
      toast.error('Mapping wajib diisi!');
      return;
    }
    if (!formData.induk_mapel) {
      toast.error('Induk Mapel wajib dipilih!');
      return;
    }
    if (formData.induk_mapel === 'PABP' && !formData.agama) {
      toast.error('Agama wajib dipilih untuk mapel PABP!');
      return;
    }

    const selectedInduk = INDUK_MAPEL_OPTIONS.find(o => o.kode === formData.induk_mapel);

    const payload: MataPelajaran = {
      id: editingMapel?.id || crypto.randomUUID(),
      kode: formData.kode.toUpperCase(),
      nama: formData.nama,
      kelompok_mapel: formData.kelompok_mapel,
      aktif: formData.aktif,
      mapping: formData.mapping!,
      induk_mapel: formData.induk_mapel!,
      induk_nama: selectedInduk?.nama || '',
      agama: formData.induk_mapel === 'PABP' ? formData.agama : undefined,
      jp_real: formData.jp_real,
      jp_dapo: formData.jp_dapo,
      created_at: editingMapel?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingMapel) {
      updateMutation.mutate(payload, { onSuccess: closeModal });
    } else {
      createMutation.mutate(payload, { onSuccess: closeModal });
    }
  }, [formData, editingMapel, createMutation, updateMutation, closeModal]);

  const handleDelete = useCallback((mapel: MataPelajaran) => {
    toast.confirm(`Hapus mapel "${mapel.nama}"?`, () => {
      deleteMutation.mutate(mapel.id);
    });
  }, [deleteMutation]);

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
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
            Kurikulum Merdeka
          </span>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Mata Pelajaran SMP</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Kelola struktur mata pelajaran SMP sesuai Kurikulum Merdeka.
          </p>
        </div>

        {/* KPI Badges */}
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Total</p>
              <p className="text-lg font-bold text-neutral-900">{totalMapel}</p>
            </div>
            <BookMarked className="h-6 w-6 text-amber-500" />
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Aktif</p>
              <p className="text-lg font-bold text-emerald-600">{aktifMapel}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Nonaktif</p>
              <p className="text-lg font-bold text-neutral-400">{nonAktifMapel}</p>
            </div>
            <HelpCircle className="h-6 w-6 text-neutral-400" />
          </div>
        </div>
      </div>

      {/* JP Summary Bar */}
      <div className="bg-gradient-to-r from-neutral-50 to-white rounded-2xl border border-neutral-200 shadow-sm px-6 py-3 flex items-center gap-6">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Ringkasan JP:</span>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
            JP Real: {getTotalJP(mapels, 'real')}
          </span>
          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">
            JP Dapo: {getTotalJP(mapels, 'dapo')}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-neutral-100">
          <button
            id="btn-tambah-mapel"
            onClick={() => openModal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah Mapel
          </button>

          <button
            id="btn-inject-seed"
            onClick={handleSeedData}
            disabled={bulkCreateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            {bulkCreateMutation.isPending ? 'Processing...' : 'Inject Seed'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50">
          <div className="flex-1 min-w-[280px]">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              <Search className="h-3 w-3" />
              Pencarian
            </label>
            <input
              id="input-search-mapel"
              type="text"
              placeholder="Cari mapel, kode, atau induk mapel..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="w-48">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
              Kelompok
            </label>
            <select
              value={kelompokFilter}
              onChange={(e) => { setKelompokFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="A">Kelompok A — Wajib</option>
              <option value="B">Kelompok B — Muatan Lokal</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <span className="text-sm text-neutral-600 font-medium">
              {filteredMapels.length} mapel
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={999999}>Semua</option>
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
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-16"
                  onClick={() => handleSort('mapping')}
                >
                  No <SortIcon field="mapping" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-24"
                  onClick={() => handleSort('kode')}
                >
                  Kode <SortIcon field="kode" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('nama')}
                >
                  Nama Mapel <SortIcon field="nama" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider w-36">
                  Induk Mapel
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-24"
                  onClick={() => handleSort('kelompok_mapel')}
                >
                  Kel <SortIcon field="kelompok_mapel" />
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-24"
                  onClick={() => handleSort('jp_real')}
                >
                  JP Real <SortIcon field="jp_real" />
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 w-24"
                  onClick={() => handleSort('jp_dapo')}
                >
                  JP Dapo <SortIcon field="jp_dapo" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider w-20">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider w-24">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9}>
                    <SkeletonRow colSpan={9} />
                  </td>
                </tr>
              ) : paginatedMapels.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={BookMarked}
                      title="Tidak ada mata pelajaran ditemukan"
                      description="Tambahkan mata pelajaran baru atau inject seed data."
                      action={{
                        label: 'Tambah Mapel',
                        onClick: () => openModal(null),
                      }}
                    />
                  </td>
                </tr>
              ) : (
                paginatedMapels.map((mapel) => (
                  <tr key={mapel.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-center font-mono font-semibold text-neutral-400">
                      {mapel.mapping}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-neutral-800">
                      {mapel.kode}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-800">
                      <div className="font-medium">{mapel.nama}</div>
                      {mapel.agama && (
                        <span className="text-xs text-neutral-500">({mapel.agama})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {mapel.induk_nama || mapel.induk_mapel || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        mapel.kelompok_mapel === 'A'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {mapel.kelompok_mapel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono font-semibold text-blue-700">
                      {mapel.jp_real ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono font-semibold text-purple-700">
                      {mapel.jp_dapo ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        mapel.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {mapel.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          id={`btn-edit-${mapel.kode}`}
                          onClick={() => openModal(mapel)}
                          className="p-2 text-neutral-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                          title="Edit mapel"
                          aria-label={`Edit Mapel ${mapel.nama}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          id={`btn-delete-${mapel.kode}`}
                          onClick={() => handleDelete(mapel)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-neutral-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus mapel"
                          aria-label={`Hapus Mapel ${mapel.nama}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="relative px-6 py-5 border-b border-neutral-200 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
                    Input Mata Pelajaran
                  </span>
                  <h3 className="text-xl font-bold text-neutral-900">
                    {editingMapel ? 'Ubah Data Mapel' : 'Tambah Mapel Baru'}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {editingMapel
                      ? 'Perbarui data mata pelajaran sesuai kurikulum.'
                      : 'Daftarkan mata pelajaran baru sesuai Kurikulum Merdeka.'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="input-mapping" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    Mapping (No Urut) *
                  </label>
                  <input
                    id="input-mapping"
                    type="number"
                    value={formData.mapping || ''}
                    onChange={(e) => setFormData({ ...formData, mapping: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="input-kode" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    Kode Mapel *
                  </label>
                  <input
                    id="input-kode"
                    type="text"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="MTK"
                    required
                  />
                </div>

                <div className="form-group col-span-2">
                  <label htmlFor="input-nama" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    Nama Mapel *
                  </label>
                  <input
                    id="input-nama"
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Matematika"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="select-induk-mapel" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    Induk Mapel *
                  </label>
                  <select
                    id="select-induk-mapel"
                    value={formData.induk_mapel || ''}
                    onChange={(e) => setFormData({ ...formData, induk_mapel: e.target.value })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Induk</option>
                    {INDUK_MAPEL_OPTIONS.map((opt) => (
                      <option key={opt.kode} value={opt.kode}>
                        {opt.kode} - {opt.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="select-kelompok-mapel" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    Kelompok
                  </label>
                  <select
                    id="select-kelompok-mapel"
                    value={formData.kelompok_mapel}
                    onChange={(e) => setFormData({ ...formData, kelompok_mapel: e.target.value as any })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">Kelompok A — Mata Pelajaran Wajib</option>
                    <option value="B">Kelompok B — Muatan Lokal</option>
                  </select>
                </div>

                {formData.induk_mapel === 'PABP' && (
                  <div className="form-group col-span-2">
                    <label htmlFor="select-agama" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                      Agama *
                    </label>
                    <select
                      id="select-agama"
                      value={formData.agama || ''}
                      onChange={(e) => setFormData({ ...formData, agama: e.target.value })}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Pilih Agama</option>
                      {MAPEL_AGAMA_OPTIONS.map((agama) => (
                        <option key={agama} value={agama}>{agama}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="input-jp-real" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    JP Real
                  </label>
                  <input
                    id="input-jp-real"
                    type="number"
                    value={formData.jp_real ?? ''}
                    onChange={(e) => setFormData({ ...formData, jp_real: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="4"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="input-jp-dapo" className="block text-xs font-bold uppercase text-neutral-600 tracking-wider mb-2">
                    JP Dapo
                  </label>
                  <input
                    id="input-jp-dapo"
                    type="number"
                    value={formData.jp_dapo ?? ''}
                    onChange={(e) => setFormData({ ...formData, jp_dapo: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="4"
                    min="0"
                  />
                </div>

                <div className="form-group col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="checkbox-aktif"
                      checked={formData.aktif}
                      onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                      className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-neutral-700">Mapel aktif digunakan</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  id="btn-modal-batal"
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-neutral-300 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  id="btn-modal-simpan"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
