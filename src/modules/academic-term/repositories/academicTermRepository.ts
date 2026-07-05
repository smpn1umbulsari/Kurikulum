/**
 * AcademicTermRepository - SIKAD v4.0
 * Offline-first repository for Academic Term data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { AcademicTerm } from '@/types';

export class AcademicTermRepository extends BaseRepository<AcademicTerm> {
  constructor() {
    super(db.academicTerms, 'academic_terms');
  }

  /**
   * Find the currently active academic term
   */
  async getActiveTerm(): Promise<AcademicTerm | undefined> {
    const terms = await this.table.toArray();
    return terms.find((t) => t.status === true);
  }
}

export const academicTermRepository = new AcademicTermRepository();
