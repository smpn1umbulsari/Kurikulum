/**
 * KelasRepository - SIKAD v4.0
 * Offline-first repository for Kelas data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { Kelas } from '@/types';

export class KelasRepository extends BaseRepository<Kelas> {
  constructor() {
    super(db.kelass, 'kelas');
  }

  /**
   * Find classes by Academic Term
   */
  async getByAcademicTerm(academicTermId: string): Promise<Kelas[]> {
    const records = await this.table.where('academic_term_id').equals(academicTermId).toArray();
    return records;
  }
}

export const kelasRepository = new KelasRepository();
