/**
 * RaporService - SIKAD v4.0
 * Handles data synchronization and finalization logic for student report cards
 */

import { BaseService } from '../../../services/baseService';
import { catatanWaliKelasRepository } from '../repositories/catatanWaliKelasRepository';
import { db } from '../../../database/dexie/schema';
import { supabase } from '../../../infrastructure/supabase/client';
import type { CatatanWaliKelas, RaporSnapshot } from '@/types';

export class RaporService extends BaseService {
  /**
   * Sync Catatan Wali Kelas from Supabase and cache locally in Dexie
   */
  async syncCatatanWaliKelas(): Promise<CatatanWaliKelas[]> {
    const { data, error } = await supabase
      .from('catatan_wali_kelas')
      .select('*');

    if (error) {
      throw new Error(`Failed to sync Catatan Wali Kelas: ${error.message}`);
    }

    const records = data || [];
    for (const rec of records) {
      await catatanWaliKelasRepository.save(rec, true);
    }

    return records;
  }

  /**
   * Sync Rapor Snapshots from Supabase and cache locally in Dexie
   */
  async syncRaporSnapshots(): Promise<RaporSnapshot[]> {
    const { data, error } = await supabase
      .from('rapor_snapshots')
      .select('*');

    if (error) {
      throw new Error(`Failed to sync Rapor Snapshots: ${error.message}`);
    }

    const records = data || [];
    for (const rec of records) {
      await db.raporSnapshots.put(rec);
    }

    return records;
  }

  /**
   * Finalize student report card (locks it and uploads snapshot to cloud)
   */
  async finalizeStudentRapor(siswaId: string, termId: string, kelasId: string, dataRapor: any): Promise<void> {
    const payload: RaporSnapshot = {
      id: crypto.randomUUID(),
      academic_term_id: termId,
      siswa_id: siswaId,
      kelas_id: kelasId,
      data_rapor: dataRapor,
      finalized_by: 'teacher',
      finalized_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Save locally
    await db.raporSnapshots.put(payload);

    // Call Supabase Edge Function to persist and finalize
    const { error } = await supabase.functions.invoke('rapor-api', {
      method: 'POST',
      body: {
        term_id: termId,
        siswa_id: siswaId,
        kelas_id: kelasId,
        catatan: dataRapor.catatan_wali || '',
        action: 'finalize',
      },
    });

    if (error) {
      throw new Error(`Failed to finalize report on server: ${error.message}`);
    }
  }
}

export const raporService = new RaporService();
