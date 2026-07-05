/**
 * PembagianMengajarService - SIKAD v4.0
 * Handles data sync logic and constraints for teacher workload allocation
 */

import { BaseService } from '../../../services/baseService';
import { pembagianMengajarRepository } from '../repositories/pembagianMengajarRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { PembagianMengajar } from '@/types';

export class PembagianMengajarService extends BaseService {
  /**
   * Sync pembagian mengajar allocations from Supabase and cache locally in Dexie
   */
  async syncPembagianMengajar(): Promise<PembagianMengajar[]> {
    const { data, error } = await supabase
      .from('pembagian_mengajar')
      .select('*');

    if (error) {
      throw new Error(`Failed to sync pembagian mengajar: ${error.message}`);
    }

    const allocations = data || [];
    
    // Cache inside local offline DB
    for (const allocation of allocations) {
      await pembagianMengajarRepository.save(allocation, true);
    }

    return allocations;
  }
}

export const pembagianMengajarService = new PembagianMengajarService();
