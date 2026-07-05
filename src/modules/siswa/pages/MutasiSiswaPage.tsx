/**
 * MutasiSiswaPage - SIKAD v4.0
 * Premium UI for student mutation operations: Naik Kelas, Kelulusan, Mutasi
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Users, GraduationCap, ArrowUpCircle, LogOut,
  Check, X,
  Search, Eye, XCircle, Loader2
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { mutationService } from '../services/mutationService';
import { rombelService } from '../services/rombelService';
import {
  type MutationType,
  type MutationPreview,
  type MutationPreviewItem,
  type MutationJob,
  type RombelBayangan,
  getMutationTypeLabel,
} from '../types/mutationTypes';

type TabType = 'NAIK_KELAS' | 'KELULUSAN' | 'PINDAH';

export default function MutasiSiswaPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('NAIK_KELAS');

  // Source/target term selection
  const [sourceTermId, setSourceTermId] = useState('');
  const [targetTermId, setTargetTermId] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [tahunLulus, setTahunLulus] = useState(new Date().getFullYear());

  // Preview state
  const [preview, setPreview] = useState<MutationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Job execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [, setCurrentJob] = useState<MutationJob | null>(null);

  // Selection state
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Rombel Bayangan state
  const [rombelList, setRombelList] = useState<RombelBayangan[]>([]);
  const [isLoadingRombel, setIsLoadingRombel] = useState(false);

  // Modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Transfer form state
  const [transferSiswa, setTransferSiswa] = useState<MutationPreviewItem | null>(null);
  const [targetSekolah, setTargetSekolah] = useState('');

  const [transferReason, setTransferReason] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Handle preview based on active tab
  const handlePreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      let result: MutationPreview;

      if (activeTab === 'NAIK_KELAS') {
        if (!sourceTermId || !targetTermId) {
          setPreviewError('Pilih tahun ajaran sumber dan target');
          return;
        }
        result = await mutationService.previewNaikKelas(sourceTermId, targetTermId);
      } else if (activeTab === 'KELULUSAN') {
        if (!sourceTermId) {
          setPreviewError('Pilih tahun ajaran');
          return;
        }
        result = await mutationService.previewKelulusan(sourceTermId);
      } else {
        setPreviewError('Preview tidak diperlukan untuk mutasi keluar');
        return;
      }

      setPreview(result);
      setSelectedSiswaIds(new Set());
      setSelectAll(false);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Preview gagal');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [activeTab, sourceTermId, targetTermId]);

  // Handle execute mutation
  const handleExecute = useCallback(async () => {
    if (preview?.eligible.length === 0) return;

    setIsExecuting(true);

    try {
      let job: MutationJob;

      if (activeTab === 'NAIK_KELAS') {
        job = await mutationService.naikKelas(
          sourceTermId,
          targetTermId,
          Array.from(selectedSiswaIds)
        );
      } else {
        job = await mutationService.kelulusan(
          sourceTermId,
          tahunLulus,
          Array.from(selectedSiswaIds)
        );
      }

      setCurrentJob(job);
      setPreview(null);
      toast.success(`Proses selesai! Berhasil: ${job.successCount}, Gagal: ${job.failedCount}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eksekusi gagal');
    } finally {
      setIsExecuting(false);
    }
  }, [activeTab, preview, selectedSiswaIds, sourceTermId, targetTermId, tahunLulus]);

  // Handle individual transfer
  const handleTransfer = useCallback(async () => {
    if (!transferSiswa || !targetSekolah) {
      toast.error('Lengkapi data tujuan sekolah');
      return;
    }

    try {
      await mutationService.mutasi(
        transferSiswa.siswaId,
        targetSekolah,
        transferReason,
        transferNotes
      );
      toast.success('Mutasi berhasil dicatat');
      setActiveModal(null);
      resetTransferForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Mutasi gagal');
    }
  }, [transferSiswa, targetSekolah, transferReason, transferNotes]);

  // Handle rombel promotion
  const handlePromoteRombel = useCallback(async (rombelId: string, targetKelasId: string) => {
    try {
      const result = await rombelService.promoteToReal(rombelId, targetKelasId);
      if (result.success) {
        toast.success(`Berhasil memindahkan ${result.promotedCount} siswa`);
        loadRombelList();
      } else {
        toast.error(`Gagal: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promosi gagal');
    }
  }, []);

  // Load rombel list
  const loadRombelList = useCallback(async () => {
    setIsLoadingRombel(true);
    try {
      const rombels = await rombelService.getActiveRombelBayangans();
      setRombelList(rombels);
    } catch (error) {
      console.error('Failed to load rombel:', error);
    } finally {
      setIsLoadingRombel(false);
    }
  }, []);

  // Toggle student selection
  const toggleSiswa = useCallback((siswaId: string) => {
    setSelectedSiswaIds(prev => {
      const next = new Set(prev);
      if (next.has(siswaId)) {
        next.delete(siswaId);
      } else {
        next.add(siswaId);
      }
      return next;
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectAll || !preview) {
      setSelectedSiswaIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedSiswaIds(new Set(preview.eligible.map(i => i.siswaId)));
      setSelectAll(true);
    }
  }, [selectAll, preview]);

  // Reset transfer form
  const resetTransferForm = () => {
    setTransferSiswa(null);
    setTargetSekolah('');

    setTransferReason('');
    setTransferNotes('');
  };

  // Stats
  const stats = useMemo(() => {
    if (!preview) return { eligible: 0, ineligible: 0, warnings: 0, selected: 0 };
    return {
      eligible: preview.eligible.length,
      ineligible: preview.ineligible.length,
      warnings: preview.warnings.length,
      selected: selectedSiswaIds.size,
    };
  }, [preview, selectedSiswaIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wider mb-2">Mutasi</span>
          <h2 className="text-2xl font-bold text-neutral-900">Mutasi & Kelulusan Siswa</h2>
          <p className="text-sm text-neutral-500">Kelola kenaikan kelas, kelulusan, dan perpindahan siswa.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { loadRombelList(); setActiveModal('rombel'); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl text-sm font-semibold"
          >
            <Users className="h-4 w-4" />
            Rombel Bayangan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => { setActiveTab('NAIK_KELAS'); setPreview(null); }}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'NAIK_KELAS'
                ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <ArrowUpCircle className="inline h-4 w-4 mr-2" />
            Naik Kelas
          </button>
          <button
            onClick={() => { setActiveTab('KELULUSAN'); setPreview(null); }}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'KELULUSAN'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <GraduationCap className="inline h-4 w-4 mr-2" />
            Kelulusan
          </button>
          <button
            onClick={() => { setActiveTab('PINDAH'); setPreview(null); }}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'PINDAH'
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-600'
                : 'text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <LogOut className="inline h-4 w-4 mr-2" />
            Pindah / Mutasi
          </button>
        </div>

        <div className="p-6">
          {/* Source/Target Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                {activeTab === 'PINDAH' ? 'Tahun Ajaran' : 'Tahun Ajaran Sumber'}
              </label>
              <select
                value={sourceTermId}
                onChange={(e) => setSourceTermId(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Pilih</option>
                <option value="2025-2026">2025/2026</option>
                <option value="2024-2025">2024/2025</option>
              </select>
            </div>

            {activeTab === 'NAIK_KELAS' && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Tahun Ajaran Target</label>
                <select
                  value={targetTermId}
                  onChange={(e) => setTargetTermId(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Pilih</option>
                  <option value="2026-2027">2026/2027</option>
                  <option value="2025-2026">2025/2026</option>
                </select>
              </div>
            )}

            {activeTab === 'KELULUSAN' && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Tahun Lulus</label>
                <input
                  type="number"
                  value={tahunLulus}
                  onChange={(e) => setTahunLulus(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Semua Kelas</option>
                <option value="VII">VII</option>
                <option value="VIII">VIII</option>
                <option value="IX">IX</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handlePreview}
                disabled={isLoadingPreview}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {isLoadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Preview
              </button>
            </div>
          </div>

          {/* Preview Results */}
          {preview && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 font-semibold uppercase">Layak</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.eligible}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs text-red-600 font-semibold uppercase">Tidak Layak</p>
                  <p className="text-2xl font-bold text-red-700">{stats.ineligible}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs text-amber-600 font-semibold uppercase">Peringatan</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.warnings}</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-4">
                  <p className="text-xs text-violet-600 font-semibold uppercase">Dipilih</p>
                  <p className="text-2xl font-bold text-violet-700">{stats.selected}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">Pilih Semua yang Layak</span>
                </label>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || stats.selected === 0}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 ${
                    activeTab === 'KELULUSAN'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-violet-600 hover:bg-violet-700 text-white'
                  }`}
                >
                  {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isExecuting ? 'Memproses...' : `Proses ${getMutationTypeLabel(activeTab as MutationType)}`}
                </button>
              </div>

              {/* Preview Table - Eligible */}
              {preview.eligible.length > 0 && (
                <div className="border border-emerald-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200">
                    <h4 className="font-semibold text-emerald-800">Siswa Layak</h4>
                  </div>
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left">Nama</th>
                          <th className="px-3 py-2 text-left">NISN</th>
                          <th className="px-3 py-2 text-left">Kelas Sekarang</th>
                          <th className="px-3 py-2 text-left">Kelas Tujuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {preview.eligible.map((item) => (
                          <tr key={item.siswaId} className="hover:bg-emerald-50/50">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedSiswaIds.has(item.siswaId)}
                                onChange={() => toggleSiswa(item.siswaId)}
                                className="h-4 w-4 rounded border-neutral-300 text-violet-600"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{item.siswaName}</td>
                            <td className="px-3 py-2 text-neutral-600">{item.nisn}</td>
                            <td className="px-3 py-2 text-neutral-600">{item.currentKelas}</td>
                            <td className="px-3 py-2 text-violet-600 font-medium">{item.targetKelas || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview Table - Ineligible */}
              {preview.ineligible.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <h4 className="font-semibold text-red-800">Siswa Tidak Layak</h4>
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Nama</th>
                          <th className="px-3 py-2 text-left">NISN</th>
                          <th className="px-3 py-2 text-left">Alasan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {preview.ineligible.map((item) => (
                          <tr key={item.siswaId} className="hover:bg-red-50/50">
                            <td className="px-3 py-2 font-medium">{item.siswaName}</td>
                            <td className="px-3 py-2 text-neutral-600">{item.nisn}</td>
                            <td className="px-3 py-2 text-red-600">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Error */}
          {previewError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{previewError}</p>
            </div>
          )}

          {/* Transfer Section */}
          {activeTab === 'PINDAH' && (
            <div className="text-center py-12 text-neutral-500">
              <LogOut className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p className="font-medium">Mutasi Keluar</p>
              <p className="text-sm mt-1">Pilih siswa dari daftar untuk mencatat perpindahan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rombel Bayangan Modal */}
      {activeModal === 'rombel' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 bg-violet-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Rombel Bayangan</h3>
                  <p className="text-sm text-neutral-600">Kelola kelas bayangan untuk promosi siswa</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {isLoadingRombel ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-600" />
                </div>
              ) : rombelList.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                  <p>Belum ada rombel bayangan aktif</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rombelList.map((rombel) => (
                    <div key={rombel.id} className="border border-violet-200 rounded-xl p-4 bg-violet-50/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-900">{rombel.name}</h4>
                          <p className="text-sm text-neutral-600">
                            {rombel.studentIds.length} siswa - Tingkat {rombel.targetTingkat}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {/* View students */}}
                            className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePromoteRombel(rombel.id, '')}
                            className="px-3 py-1 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
                          >
                            Promosikan
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-neutral-50 flex justify-end gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {activeModal === 'transfer' && transferSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 bg-amber-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Mutasi Keluar</h3>
                  <p className="text-sm text-neutral-600">{transferSiswa.siswaName}</p>
                </div>
                <button onClick={() => { setActiveModal(null); resetTransferForm(); }} className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Nama Sekolah Tujuan *</label>
                <input
                  type="text"
                  value={targetSekolah}
                  onChange={(e) => setTargetSekolah(e.target.value)}
                  placeholder="Nama sekolah"
                  className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Alasan</label>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
                >
                  <option value="">Pilih alasan</option>
                  <option value="FAMILY_RELOCATON">Pindah domisili</option>
                  <option value="SCHOOL_TRANSFER">Mutasi sekolah</option>
                  <option value="PURSUING_HIGHER_EDUCATION">Melanjutkan kejenjang lebih tinggi</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">Catatan</label>
                <textarea
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  rows={2}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-neutral-50 flex justify-end gap-3">
              <button
                onClick={() => { setActiveModal(null); resetTransferForm(); }}
                className="px-4 py-2 border border-neutral-300 rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleTransfer}
                disabled={!targetSekolah}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Simpan Mutasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
