/**
 * TugasTambahanService - SIKAD v4.0
 * Handles data sync logic and validation for Additional Teacher Assignments
 */

import { BaseService } from '../../../services/baseService';
import { tugasTambahanRepository } from '../repositories/tugasTambahanRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { TugasTambahan } from '@/types';

export class TugasTambahanService extends BaseService {
  /**
   * Sync Tugas Tambahan from Supabase and cache locally in Dexie
   */
  async syncTugasTambahans(): Promise<TugasTambahan[]> {
    const { data, error } = await supabase
      .from('tugas_tambahans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to sync tugas tambahan: ${error.message}`);
    }

    const tugasList = data || [];
    
    for (const item of tugasList) {
      await tugasTambahanRepository.save(item, true);
    }

    return tugasList;
  }
}

export const tugasTambahanService = new TugasTambahanService();
