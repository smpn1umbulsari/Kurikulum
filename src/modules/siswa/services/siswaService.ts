/**
 * SiswaService - SIKAD v4.0
 * Handles data sync logic and validation checks for Siswa master data
 */

import { BaseService } from '../../../services/baseService';
import { siswaRepository } from '../repositories/siswaRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { Siswa } from '@/types';

export class SiswaService extends BaseService {
  /**
   * Sync Siswas from Supabase and cache locally in Dexie
   */
  async syncSiswas(): Promise<Siswa[]> {
    const { data, error } = await supabase
      .from('siswas')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      throw new Error(`Failed to sync siswas: ${error.message}`);
    }

    const siswas = data || [];
    
    // Cache inside local offline DB
    for (const siswa of siswas) {
      await siswaRepository.save(siswa, true);
    }

    return siswas;
  }
}

export const siswaService = new SiswaService();
