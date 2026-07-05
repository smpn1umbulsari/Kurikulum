/**
 * GuruService - SIKAD v4.0
 * Handles data sync logic and constraints checking for Guru master data
 */

import { BaseService } from '../../../services/baseService';
import { guruRepository } from '../repositories/guruRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { Guru } from '@/types';

export class GuruService extends BaseService {
  /**
   * Sync Gurus from Supabase and cache locally in Dexie
   */
  async syncGurus(): Promise<Guru[]> {
    const { data, error } = await supabase
      .from('gurus')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      throw new Error(`Failed to sync gurus: ${error.message}`);
    }

    const gurus = data || [];
    
    // Cache inside local offline DB
    for (const guru of gurus) {
      await guruRepository.save(guru, true);
    }

    return gurus;
  }
}

export const guruService = new GuruService();
