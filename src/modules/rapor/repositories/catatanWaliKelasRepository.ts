/**
 * CatatanWaliKelasRepository - SIKAD v4.0
 * Offline-first repository for Catatan Wali Kelas (homeroom teacher notes)
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { CatatanWaliKelas } from '@/types';

export class CatatanWaliKelasRepository extends BaseRepository<CatatanWaliKelas> {
  constructor() {
    super(db.catatanWaliKelass, 'catatan_wali_kelas');
  }

  /**
   * Find homeroom teacher notes by class and academic term
   */
  async getByClassAndTerm(kelasId: string, academicTermId: string): Promise<CatatanWaliKelas[]> {
    return await this.table
      .where('kelas_id')
      .equals(kelasId)
      .filter((c) => c.academic_term_id === academicTermId)
      .toArray();
  }
}

export const catatanWaliKelasRepository = new CatatanWaliKelasRepository();
