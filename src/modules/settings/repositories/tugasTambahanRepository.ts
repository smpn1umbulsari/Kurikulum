/**
 * TugasTambahanRepository - SIKAD v4.0
 * Offline-first repository for Tugas Tambahan (Additional Assignments) data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { TugasTambahan } from '@/types';

export class TugasTambahanRepository extends BaseRepository<TugasTambahan> {
  constructor() {
    super(db.tugasTambahans, 'tugas_tambahans');
  }

  /**
   * Get all assignments for a specific guru
   */
  async getByGuruId(guruId: string): Promise<TugasTambahan[]> {
    const all = await this.getAll();
    return all.filter((t) => t.guru_id === guruId);
  }

  /**
   * Get all assignments for a specific academic term
   */
  async getByTermId(termId: string): Promise<TugasTambahan[]> {
    const all = await this.getAll();
    return all.filter((t) => t.academic_term_id === termId);
  }
}

export const tugasTambahanRepository = new TugasTambahanRepository();
