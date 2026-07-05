/**
 * SyncValidationModal - SIKAD v4.0
 * Modal popup validation untuk Sinkron (Push) dan Tarik Data (Pull).
 * Menampilkan preview data yang akan disinkron/ditarik agar admin/guru tahu apa yang akan terjadi.
 */

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Download, AlertTriangle, Info, CheckCircle, Clock, Database, RefreshCcw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { db } from '../../database/dexie/schema';
import { supabase } from '../../infrastructure/supabase/client';
import { useSyncStore } from '../../store/syncStore';
import {
  DEXIE_TO_SUPABASE,
  SUPABASE_TO_DEXIE,
  TABLES_WITH_DELTA_SYNC,
  TABLE_DISPLAY_NAMES,
} from '../../services/sync/tableMap';
import type { SyncQueueItem } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncMode = 'sinkron' | 'tarik';

interface SyncValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SyncMode;
  onConfirm: () => void;
  isLoading?: boolean;
}

interface TableSyncPreview {
  tableName: string;
  displayName: string;
  count: number;
  operations?: { type: 'INSERT' | 'UPDATE' | 'DELETE'; count: number }[];
  lastUpdated?: string;
  recordCount?: number;
  hasDeltaSync: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SyncValidationModal({
  isOpen,
  onClose,
  mode,
  onConfirm,
  isLoading = false,
}: SyncValidationModalProps) {
  const [previewData, setPreviewData] = useState<TableSyncPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const lastPullAt = useSyncStore((s) => s.lastPullAt);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);

  // ─── Load Preview Data ───────────────────────────────────────────────────────

  const loadSinkronPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      const pendingItems: SyncQueueItem[] = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      if (pendingItems.length === 0) {
        setPreviewData([]);
        return;
      }

      // Group by table name and operation
      const tableMap = new Map<string, TableSyncPreview>();

      for (const item of pendingItems) {
        const displayName = TABLE_DISPLAY_NAMES[item.table_name] || item.table_name;

        if (!tableMap.has(item.table_name)) {
          tableMap.set(item.table_name, {
            tableName: item.table_name,
            displayName,
            count: 0,
            operations: [],
            hasDeltaSync: false,
          });
        }

        const preview = tableMap.get(item.table_name)!;
        preview.count++;

        // Track operation types
        const existingOp = preview.operations?.find((o) => o.type === item.operation);
        if (existingOp) {
          existingOp.count++;
        } else {
          preview.operations?.push({ type: item.operation as 'INSERT' | 'UPDATE' | 'DELETE', count: 1 });
        }
      }

      setPreviewData(Array.from(tableMap.values()));
    } catch (err) {
      console.error('[SyncValidationModal] Failed to load sinkron preview:', err);
      setError('Gagal memuat preview data. Silakan coba lagi.');
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const loadTarikPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);

    try {
      // Use batch RPC to get all table counts in ONE API call
      const { data, error: rpcError } = await supabase.rpc('get_table_counts');

      if (rpcError) {
        console.warn(`[SyncValidationModal] RPC failed, falling back to individual queries:`, rpcError);
        // Fallback: individual queries (less efficient but works)
        const tables = Object.keys(DEXIE_TO_SUPABASE);
        const previews: TableSyncPreview[] = [];

        for (const dexieTable of tables) {
          const supabaseTable = DEXIE_TO_SUPABASE[dexieTable];
          const hasDeltaSync = TABLES_WITH_DELTA_SYNC.has(supabaseTable);

          let query = supabase.from(supabaseTable).select('*', { count: 'exact', head: true });

          if (hasDeltaSync && lastPullAt) {
            query = query.gt('updated_at', lastPullAt);
          }

          const { count, error: countError } = await query;

          if (countError) {
            previews.push({
              tableName: dexieTable,
              displayName: TABLE_DISPLAY_NAMES[dexieTable] || dexieTable,
              count: 0,
              hasDeltaSync,
              recordCount: 0,
            });
          } else {
            previews.push({
              tableName: dexieTable,
              displayName: TABLE_DISPLAY_NAMES[dexieTable] || dexieTable,
              count: count || 0,
              hasDeltaSync,
              recordCount: count || 0,
            });
          }
        }

        setPreviewData(previews);
      } else if (data && Array.isArray(data)) {
        // Map RPC results to preview format
        const previews: TableSyncPreview[] = data.map((row: any) => {
          const dexieTable = SUPABASE_TO_DEXIE[row.table_name] || row.table_name;

          return {
            tableName: dexieTable,
            displayName: TABLE_DISPLAY_NAMES[dexieTable] || row.table_name,
            count: row.record_count || 0,
            hasDeltaSync: row.has_delta_sync || false,
            recordCount: row.record_count || 0,
          };
        });

        setPreviewData(previews);
      }
    } catch (err) {
      console.error('[SyncValidationModal] Failed to load tarik preview:', err);
      setError('Gagal memuat preview data dari cloud. Periksa koneksi internet Anda.');
    } finally {
      setLoadingPreview(false);
    }
  }, [lastPullAt]);

  // Load preview on modal open
  useEffect(() => {
    if (isOpen) {
      if (mode === 'sinkron') {
        loadSinkronPreview();
      } else {
        loadTarikPreview();
      }
    }
  }, [isOpen, mode, loadSinkronPreview, loadTarikPreview]);

  // ─── Toggle Table Expansion ───────────────────────────────────────────────────

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  // ─── Get Item Details for Sinkron ────────────────────────────────────────────

  const [itemDetails, setItemDetails] = useState<SyncQueueItem[]>([]);

  const loadItemDetails = useCallback(async () => {
    if (mode !== 'sinkron') return;

    const pendingItems: SyncQueueItem[] = await db.syncQueue
      .where('status')
      .equals('PENDING')
      .toArray();

    setItemDetails(pendingItems);
  }, [mode]);

  useEffect(() => {
    if (isOpen && mode === 'sinkron') {
      loadItemDetails();
    }
  }, [isOpen, mode, loadItemDetails]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const isSinkron = mode === 'sinkron';
  const totalCount = previewData.reduce((sum, p) => sum + p.count, 0);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isSinkron ? 'bg-primary-50 border-primary-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isSinkron ? 'bg-primary-100 text-primary-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isSinkron ? (
                <Upload className="h-5 w-5" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-800">
                {isSinkron ? 'Konfirmasi Sinkronisasi' : 'Konfirmasi Tarik Data'}
              </h3>
              <p className="text-xs text-neutral-600">
                {isSinkron
                  ? 'Data berikut akan dikirim ke cloud (Supabase)'
                  : 'Data terbaru akan ditarik dari cloud ke perangkat ini'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Tutup modal"
            className="p-2 rounded-lg hover:bg-white/50 text-neutral-600 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className={`mx-6 mt-4 px-4 py-3 rounded-lg border ${
          isSinkron
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
              isSinkron ? 'text-amber-600' : 'text-blue-600'
            }`} />
            <div className="text-sm">
              <p className="font-semibold">
                {isSinkron
                  ? 'Tindakan ini akan mengubah data di server cloud'
                  : 'Data lokal akan ditimpa dengan data dari cloud'}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {isSinkron
                  ? 'Pastikan Anda yakin dengan perubahan yang akan disinkronkan. Data yang sudah ada di cloud mungkin akan diperbarui.'
                  : 'Pastikan tidak ada perubahan lokal yang belum disinkronkan. Semua data lokal akan diganti dengan data terbaru dari server.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4" aria-live="polite" aria-atomic="true">
          {loadingPreview ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary-500" />
              <p className="text-sm">Memuat preview data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
              <AlertTriangle className="h-8 w-8 mb-3" />
              <p className="text-sm">{error}</p>
            </div>
          ) : previewData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <CheckCircle className="h-10 w-10 mb-3 text-green-400" />
              <p className="text-sm font-medium">
                {isSinkron ? 'Tidak ada data yang perlu disinkronkan' : 'Tidak ada data baru dari cloud'}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {isSinkron
                  ? 'Semua data sudah tersinkron dengan server'
                  : 'Data di perangkat ini sudah yang terbaru'}
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {isSinkron ? 'Tabel yang akan disinkronkan:' : 'Tabel yang akan ditarik:'}
                </span>
                <span className="font-bold text-neutral-800">
                  {totalCount} {isSinkron ? 'perubahan' : 'catatan'}
                </span>
              </div>

              {/* Table List */}
              <div className="space-y-2">
                {previewData.map((preview) => (
                  <div
                    key={preview.tableName}
                    className="border border-neutral-200 rounded-lg overflow-hidden"
                  >
                    {/* Table Header */}
                    <button
                      onClick={() => toggleTable(preview.tableName)}
                      aria-expanded={expandedTables.has(preview.tableName)}
                      aria-controls={`table-details-${preview.tableName}`}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <div className="flex items-center gap-3">
                        {expandedTables.has(preview.tableName) ? (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        )}
                        <Database className="h-4 w-4 text-neutral-500" />
                        <div>
                          <p className="font-medium text-neutral-800 text-sm">
                            {preview.displayName}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {preview.tableName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isSinkron && preview.operations && (
                          <div className="flex gap-1">
                            {preview.operations.map((op) => (
                              <span
                                key={op.type}
                                className={`text-[10px] font-bold px-2 py-1 rounded ${
                                  op.type === 'INSERT'
                                    ? 'bg-green-100 text-green-700'
                                    : op.type === 'UPDATE'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {op.type} ({op.count})
                              </span>
                            ))}
                          </div>
                        )}
                        {!isSinkron && (
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            preview.hasDeltaSync
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {preview.recordCount} {preview.hasDeltaSync ? '(perubahan saja)' : '(keseluruhan)'}
                          </span>
                        )}
                        <span className="text-sm font-bold text-primary-600">
                          {preview.count}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {expandedTables.has(preview.tableName) && (
                      <div id={`table-details-${preview.tableName}`} className="px-4 py-3 bg-white border-t border-neutral-100">
                        {isSinkron ? (
                          // Show items for this table
                          <div className="space-y-2">
                            {itemDetails
                              .filter((item) => item.table_name === preview.tableName)
                              .slice(0, 10) // Show max 10 items
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-xs p-2 bg-neutral-50 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                      item.operation === 'INSERT'
                                        ? 'bg-green-100 text-green-700'
                                        : item.operation === 'UPDATE'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}>
                                      {item.operation}
                                    </span>
                                    <span className="text-neutral-600 font-mono truncate max-w-[200px]">
                                      {item.record_id.substring(0, 8)}...
                                    </span>
                                  </div>
                                  <span className="text-neutral-400">
                                    {new Date(item.created_at).toLocaleString('id-ID', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              ))}
                            {itemDetails.filter((item) => item.table_name === preview.tableName).length > 10 && (
                              <p className="text-xs text-neutral-400 text-center py-1">
                                +{itemDetails.filter((item) => item.table_name === preview.tableName).length - 10} item lainnya
                              </p>
                            )}
                          </div>
                        ) : (
                          // Show table info for pull
                          <div className="space-y-2 text-xs text-neutral-600">
                            <div className="flex items-center gap-2">
                              <Info className="h-3.5 w-3.5 text-blue-500" />
                              <span>
                                {preview.hasDeltaSync
                                  ? `Akan menarik data yang berubah sejak: ${lastPullAt ? new Date(lastPullAt).toLocaleString('id-ID') : 'pertama kali'}`
                                  : 'Akan menarik seluruh data dari tabel ini'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              <span>
                                {preview.recordCount} {preview.hasDeltaSync ? 'perubahan' : 'catatan'} akan ditimpa ke data lokal
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Info Box */}
              <div className="mt-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600">
                <p className="font-semibold text-neutral-700 mb-1">Informasi:</p>
                {isSinkron ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Data akan dikirim ke server Supabase</li>
                    <li>Jika data sudah ada di cloud, akan dilakukan update</li>
                    <li>Gagal sync akan dicoba lagi secara otomatis (max 3x)</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Data cloud akan menimpa data lokal</li>
                    <li>Perubahan lokal yang belum di-sinkronkan akan hilang</li>
                    <li>Sinkronkan terlebih dahulu jika ada perubahan lokal</li>
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {isSinkron
                ? `Terakhir sync: ${lastSyncAt ? new Date(lastSyncAt).toLocaleString('id-ID') : 'Belum pernah'}`
                : `Terakhir tarik: ${lastPullAt ? new Date(lastPullAt).toLocaleString('id-ID') : 'Belum pernah'}`
              }
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || loadingPreview || totalCount === 0}
              aria-label={isSinkron ? `Konfirmasi sinkronisasi ${totalCount} data` : `Konfirmasi penarikan ${totalCount} data`}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 ${
                isSinkron
                  ? 'bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500'
                  : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSinkron ? 'Menyinkronkan...' : 'Menarik Data...'}
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  {isSinkron
                    ? `Ya, Sinkronkan ${totalCount} Data`
                    : `Ya, Tarik ${totalCount} Data`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
