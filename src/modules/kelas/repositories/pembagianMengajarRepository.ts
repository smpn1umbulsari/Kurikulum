/**
 * PembagianMengajarRepository - SIKAD v4.0
 * Offline-first repository for Pembagian Mengajar data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { PembagianMengajar } from '@/types';

export class PembagianMengajarRepository extends BaseRepository<PembagianMengajar> {
  constructor() {
    super(db.pembagianMengajars, 'pembagian_mengajar');
  }

  /**
   * Get allocations by academic term
   */
  async getByAcademicTerm(academicTermId: string): Promise<PembagianMengajar[]> {
    return await this.table.where('academic_term_id').equals(academicTermId).toArray();
  }
}

export const pembagianMengajarRepository = new PembagianMengajarRepository();
