/**
 * SyncToolbar - SIKAD v4.0
 * Manual sync controls for the header toolbar.
 *
 * - Sinkron (Push): uploads pending local queue items to Supabase
 * - Tarik Data (Pull): downloads latest cloud records into IndexedDB
 *
 * Both buttons are disabled when offline or while a sync is in progress.
 * Features validation modal to preview what will be synced/pulled.
 */

import { useState } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';
import { useSync } from '../../hooks/useSync';
import { toast } from '../../store/toastStore';
import { SyncValidationModal, type SyncMode } from './SyncValidationModal';

export function SyncToolbar() {
  const { isOnline, isSyncing, pendingCount, sinkron, tarikData } = useSync();
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMode, setValidationMode] = useState<SyncMode>('sinkron');

  const handleOpenValidation = (mode: SyncMode) => {
    setValidationMode(mode);
    setShowValidationModal(true);
  };

  const handleSinkron = async () => {
    if (!isOnline) {
      toast.warning('Tidak ada koneksi internet');
      return;
    }

    const result = await sinkron();

    if (result.pushed > 0) {
      toast.success(`${result.pushed} data berhasil disinkronkan ke cloud`);
    } else if (result.pushed === 0 && result.failed === 0 && result.conflicts === 0) {
      toast.info('Semua data sudah sinkron');
    } else if (result.failed > 0) {
      toast.error(`${result.failed} data gagal disinkronkan`);
    }
    if (result.conflicts > 0) {
      toast.warning(`${result.conflicts} konflik ditemukan — periksa Pusat Pemantauan`);
    }
  };

  const handleTarikData = async () => {
    if (!isOnline) {
      toast.warning('Tidak ada koneksi internet');
      return;
    }

    const result = await tarikData();

    if (result.pulled > 0) {
      toast.success(`${result.pulled} data berhasil ditarik dari cloud`);
    } else if (result.errors > 0) {
      toast.warning(`${result.errors} tabel gagal ditarik dari cloud`);
    } else {
      toast.info('Tidak ada data baru dari cloud');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Sinkron (Push) */}
        <button
          onClick={() => handleOpenValidation('sinkron')}
          disabled={isSyncing || !isOnline}
          aria-label="Kirim data ke cloud"
          title={isOnline ? 'Kirim data lokal ke cloud' : 'Offline — tidak dapat menyinkronkan'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            !isOnline
              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              : pendingCount > 0
                ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
          } ${isSyncing ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Sinkron
          {pendingCount > 0 && !isSyncing && (
            <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Tarik Data (Pull) */}
        <button
          onClick={() => handleOpenValidation('tarik')}
          disabled={isSyncing || !isOnline}
          aria-label="Tarik data dari cloud"
          title={isOnline ? 'Ambil data terbaru dari cloud' : 'Offline — tidak dapat menarik data'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
            !isOnline
              ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
          } ${isSyncing ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Tarik Data
        </button>
      </div>

      {/* Validation Modal */}
      <SyncValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        mode={validationMode}
        onConfirm={() => {
          setShowValidationModal(false);
          if (validationMode === 'sinkron') {
            handleSinkron();
          } else {
            handleTarikData();
          }
        }}
        isLoading={isSyncing}
      />
    </>
  );
}
