import { useState, useEffect } from 'react';
import { db, mapToTableName } from '../../../database/dexie/schema';
import { supabase } from '../../../infrastructure/supabase/client';
import { useSyncStore } from '../../../store/syncStore';
import { syncEngine } from '../../../services/sync/SyncEngine';
import { SyncValidationModal } from '../../../components/sync/SyncValidationModal';
import { AlertTriangle, CheckCircle, Smartphone, RefreshCcw, Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import type { ConflictItem, SyncQueueItem } from '@/types';
import { toast } from '../../../store/toastStore';

export default function MonitoringCenterPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null);
  const [deviceStats, setDeviceStats] = useState<any[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const pendingSyncCount = useSyncStore((state) => state.pendingCount);
  const isOnline = useSyncStore((state) => state.isOnline);
  const syncStore = useSyncStore();

  useEffect(() => {
    loadConflicts();
    loadFailedItems();
    loadDeviceStats().catch(err => console.error(err));
  }, []);

  const loadConflicts = () => {
    db.conflicts.where('resolved').equals(0).toArray() // 0 means false in indexedDB index for boolean usually or filter
      .then((list) => setConflicts(list))
      .catch(() => {
        // Fallback filter
        db.conflicts.toArray().then((list) => {
          setConflicts(list.filter((c) => !c.resolved));
        });
      });
  };

  const loadFailedItems = () => {
    db.syncQueue.where('status').equals('FAILED').toArray()
      .then((items) => setFailedItems(items))
      .catch(() => {
        db.syncQueue.toArray().then((items) => {
          setFailedItems(items.filter((item) => item.status === 'FAILED'));
        });
      });
  };

  const loadDeviceStats = async () => {
    const { data } = await supabase.from('user_devices').select('*').limit(10);
    setDeviceStats(data || [
      { id: '1', device_info: 'Chrome / Windows 11', last_sync_at: new Date().toISOString() }
    ]);
  };

  const resolveConflict = async (conflict: ConflictItem, resolution: 'local' | 'cloud') => {
    try {
      const tableDexieName = mapToTableName(conflict.table_name);
      const tableDexie = db[tableDexieName] as any;

      if (resolution === 'local') {
        // Local wins: push local data to Supabase
        const { error } = await supabase
          .from(conflict.table_name)
          .upsert(conflict.local_data);

        if (error) throw error;
      } else {
        // Cloud wins: update local Dexie with cloud data
        await tableDexie.put(conflict.cloud_data);
      }

      // Mark as resolved in local Dexie
      await db.conflicts.update(conflict.id, {
        resolved: true,
        resolved_at: new Date().toISOString(),
      });

      toast.success(`Konflik berhasil diselesaikan menggunakan opsi: ${resolution === 'local' ? 'Data Lokal' : 'Data Cloud'}`);
      setActiveConflict(null);
      loadConflicts();
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal menyelesaikan konflik: ${err.message}`);
    }
  };

  const handleConfirmForceSync = async () => {
    if (!isOnline) {
      toast.warning('Tidak ada koneksi internet');
      return;
    }
    syncStore.setSyncing(true);
    try {
      const result = await syncEngine.push();
      if (result.pushed > 0) {
        toast.success(`${result.pushed} data berhasil disinkronkan`);
      } else if (result.failed > 0) {
        toast.error(`${result.failed} data gagal disinkronkan`);
      } else {
        toast.info('Semua data sudah sinkron');
      }
    } catch (err: any) {
      toast.error(`Sinkronisasi gagal: ${err.message}`);
    } finally {
      syncStore.setSyncing(false);
      loadFailedItems();
    }
  };

  const handleRetryItem = async (item: SyncQueueItem) => {
    if (!isOnline) {
      toast.warning('Tidak ada koneksi internet — coba lagi saat online');
      return;
    }
    setRetryingId(item.id);
    try {
      const result = await syncEngine.retryItem(item.id);
      if (result === 'ok') {
        toast.success(`Item "${item.table_name}/${item.record_id}" berhasil disinkronkan ulang`);
        loadFailedItems();
      } else {
        toast.error(`Sinkronisasi ulang gagal untuk "${item.table_name}/${item.record_id}"`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleClearAllFailed = async () => {
    if (failedItems.length === 0) return;
    setClearing(true);
    try {
      const count = await syncEngine.clearFailedItems();
      toast.success(`${count} item gagal dihapus dari antrean`);
      loadFailedItems();
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800 font-sans">Pusat Konflik & Monitoring Sync</h2>
        <p className="text-sm text-neutral-500">Pantau antrean luring, selaraskan tabrakan data, dan lihat registrasi perangkat terhubung.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Status / Action Card */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-800 font-sans">Kesehatan Antrean Luring</h3>
            <p className="text-xs text-neutral-500">Antrean yang belum terkirim ke server Supabase.</p>
            <div className="text-3xl font-black text-primary-600 pt-2">{pendingSyncCount} Tertunda</div>
          </div>
          <button
            onClick={() => setShowValidationModal(true)}
            disabled={!isOnline}
            className="w-full flex items-center justify-center px-4 h-11 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-medium text-xs font-bold transition-all shadow-sm mt-4"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Picu Sinkronisasi Paksa
          </button>
        </div>

        {/* Failed Queue Items */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-500" /> Item Gagal ({failedItems.length})
            </h3>
            {failedItems.length > 0 && (
              <button
                onClick={handleClearAllFailed}
                disabled={clearing || !isOnline}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3 w-3" />
                {clearing ? 'Menghapus…' : 'Hapus Semua Gagal'}
              </button>
            )}
          </div>

          {failedItems.length === 0 ? (
            <div className="text-center py-6 text-neutral-400 text-xs flex flex-col items-center gap-1.5">
              <CheckCircle className="h-6 w-6 text-green-400" />
              Tidak ada item gagal
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {failedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-2 p-2 bg-red-50 border border-red-100 rounded text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-red-700 truncate">{item.table_name}</p>
                    <p className="text-neutral-500 font-mono truncate">{item.record_id}</p>
                    <p className="text-red-400 mt-0.5 truncate" title={item.last_error ?? ''}>
                      {item.last_error ?? 'Unknown error'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRetryItem(item)}
                    disabled={retryingId === item.id}
                    title="Coba lagi"
                    className="flex-shrink-0 p-1.5 rounded bg-white border border-red-200 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retryingId === item.id ? (
                      <RefreshCcw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Registries */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-neutral-500" /> Perangkat Terdaftar (Device Registry)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-neutral-500">Device Info</th>
                  <th className="px-4 py-3 text-left font-bold text-neutral-500">ID Perangkat</th>
                  <th className="px-4 py-3 text-left font-bold text-neutral-500">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {deviceStats.map((d) => (
                  <tr key={d.id} className="h-10">
                    <td className="px-4 py-2 font-medium text-neutral-800">{d.device_info}</td>
                    <td className="px-4 py-2 text-neutral-500 font-mono">{d.id}</td>
                    <td className="px-4 py-2 text-neutral-500">{new Date(d.last_sync_at || Date.now()).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Conflict Center Section */}
      <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-warning-500 animate-pulse" /> Resolusi Konflik Sinkronisasi ({conflicts.length})
        </h3>
        
        {conflicts.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-sm flex flex-col items-center gap-2">
            <CheckCircle className="h-10 w-10 text-success-500" />
            Basis data luring bersih dari konflik sinkronisasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conflict List */}
            <div className="border border-neutral-200 rounded-medium divide-y divide-neutral-200 overflow-y-auto max-h-96">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConflict(c)}
                  className={`p-4 cursor-pointer hover:bg-neutral-50 transition-colors ${
                    activeConflict?.id === c.id ? 'bg-primary-50 hover:bg-primary-50 border-l-4 border-primary-500' : ''
                  }`}
                >
                  <p className="text-xs font-bold text-neutral-700 uppercase">Tabel: {c.table_name}</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">ID: {c.record_id}</p>
                </div>
              ))}
            </div>

            {/* Conflict Detail Comparison */}
            <div className="md:col-span-2 border border-neutral-200 rounded-medium p-4 space-y-4">
              {activeConflict ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
                    <h4 className="font-bold text-xs text-neutral-700">Resolusi Konflik: {activeConflict.table_name}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveConflict(activeConflict, 'local')}
                        className="px-3 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold"
                      >
                        Gunakan Lokal
                      </button>
                      <button
                        onClick={() => resolveConflict(activeConflict, 'cloud')}
                        className="px-3 h-8 bg-success-600 hover:bg-success-700 text-white rounded text-xs font-semibold"
                      >
                        Gunakan Cloud
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-neutral-50 p-3 rounded border border-neutral-200 max-h-60 overflow-y-auto">
                      <p className="font-bold text-[10px] text-neutral-500 uppercase mb-2">Data Lokal (Perangkat Ini)</p>
                      <pre>{JSON.stringify(activeConflict.local_data, null, 2)}</pre>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded border border-neutral-200 max-h-60 overflow-y-auto">
                      <p className="font-bold text-[10px] text-neutral-500 uppercase mb-2">Data Cloud (Server)</p>
                      <pre>{JSON.stringify(activeConflict.cloud_data, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-neutral-500 text-xs">
                  Pilih salah satu item konflik di panel samping untuk melakukan resolusi data.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Validation Modal for Force Sync */}
      <SyncValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        mode="sinkron"
        onConfirm={handleConfirmForceSync}
        isLoading={syncStore.isSyncing}
      />
    </div>
  );
}
