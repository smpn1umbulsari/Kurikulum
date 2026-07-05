/**
 * KelasService - SIKAD v4.0
 * Handles data sync logic and validations for Kelas master data
 */

import { BaseService } from '../../../services/baseService';
import { kelasRepository } from '../repositories/kelasRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { Kelas } from '@/types';

export class KelasService extends BaseService {
  /**
   * Sync kelas from Supabase and cache locally in Dexie
   */
  async syncKelas(): Promise<Kelas[]> {
    try {
      console.log('[KelasService] Syncing kelas from Supabase...');
      const { data, error } = await supabase
        .from('kelas')
        .select('*')
        .order('nama_kelas', { ascending: true });

      if (error) {
        console.error('[KelasService] Supabase error:', error);
        throw new Error(`Failed to sync kelas: ${error.message}`);
      }

      console.log(`[KelasService] Received ${data?.length || 0} kelas from cloud`);
      const kelass = data || [];
      
      // Cache inside local offline DB
      for (const kelas of kelass) {
        await kelasRepository.save(kelas, true);
      }

      return kelass;
    } catch (err) {
      console.error('[KelasService] Sync failed:', err);
      // Return empty array so app doesn't crash
      return [];
    }
  }
}

export const kelasService = new KelasService();
