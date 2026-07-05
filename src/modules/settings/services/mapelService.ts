/**
 * MapelService - SIKAD v4.0
 * Service for MataPelajaran with extended Data Kurikulum concept
 */

import { mapelRepository } from '../repositories/mapelRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { MataPelajaran } from '@/types';
import { BaseService } from '../../../services/baseService';
import { SyncManager } from '../../../services/sync/SyncManager';
import { getIndukMapelOption } from '../../../utils/mapelHelpers';

export class MapelService extends BaseService {
  /**
   * Sync all mapels from Supabase to local
   */
  async syncMapels(): Promise<MataPelajaran[]> {
    const { data, error } = await supabase
      .from('mata_pelajarans')
      .select('*')
      .order('mapping', { ascending: true });

    if (error) {
      throw error;
    }

    const mapels = data || [];

    // Cache inside local offline DB
    for (const mapel of mapels) {
      // Enrich with induk_nama
      const enrichedMapel: MataPelajaran = {
        ...mapel,
        induk_nama: getIndukMapelOption(mapel.induk_mapel)?.nama || '',
      };
      await mapelRepository.save(enrichedMapel, true);
    }

    return mapels;
  }

  /**
   * Create new mapel with enriched data (Offline-First)
   */
  async createMapel(mapel: Omit<MataPelajaran, 'id' | 'created_at' | 'updated_at'>): Promise<MataPelajaran> {
    const payload: MataPelajaran = {
      ...mapel,
      id: (mapel as any).id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      induk_nama: getIndukMapelOption(mapel.induk_mapel)?.nama || '',
    };
    await mapelRepository.save(payload);
    SyncManager.triggerSync();
    return payload;
  }

  /**
   * Update mapel (Offline-First)
   */
  async updateMapel(id: string, updates: Partial<MataPelajaran>): Promise<MataPelajaran> {
    const existing = await mapelRepository.getById(id);
    if (!existing) {
      throw new Error(`Mata pelajaran with id ${id} not found`);
    }
    const payload: MataPelajaran = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      induk_nama: updates.induk_mapel 
        ? getIndukMapelOption(updates.induk_mapel)?.nama || '' 
        : existing.induk_nama,
    };
    await mapelRepository.save(payload);
    SyncManager.triggerSync();
    return payload;
  }

  /**
   * Delete mapel (Offline-First soft delete to align with repository delete)
   */
  async deleteMapel(id: string, deletedBy = 'system'): Promise<void> {
    await mapelRepository.softDelete(id, deletedBy);
    SyncManager.triggerSync();
  }

  /**
   * Import mapels from Excel/CSV (bulk)
   */
  async importMapels(items: Omit<MataPelajaran, 'id' | 'created_at' | 'updated_at'>[]): Promise<{
    berhasil: number;
    gagal: number;
    baru: number;
    update: number;
  }> {
    const existingMapels = await mapelRepository.getAll();
    const existingCodes = new Set(existingMapels.map((m) => m.kode.toLowerCase()));

    let baru = 0;
    let update = 0;
    let gagal = 0;

    for (const item of items) {
      try {
        const isNew = !existingCodes.has(item.kode.toLowerCase());
        const enrichedItem = {
          ...item,
          induk_nama: getIndukMapelOption(item.induk_mapel)?.nama || '',
        };

        if (isNew) {
          await this.createMapel(enrichedItem);
          baru++;
        } else {
          const existing = existingMapels.find(
            (m) => m.kode.toLowerCase() === item.kode.toLowerCase()
          );
          if (existing) {
            await this.updateMapel(existing.id, enrichedItem);
            update++;
          }
        }
      } catch {
        gagal++;
      }
    }

    return { berhasil: baru + update, baru, update, gagal };
  }
}

export const mapelService = new MapelService();
