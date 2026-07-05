/**
 * AssessmentRepository - SIKAD v4.0
 * Offline-first repository for Assessment (exams/tasks) data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { Assessment } from '@/types';

export class AssessmentRepository extends BaseRepository<Assessment> {
  constructor() {
    super(db.assessments, 'assessments');
  }

  /**
   * Get assessments by allocation
   */
  async getByAllocation(pembagianMengajarId: string): Promise<Assessment[]> {
    return await this.table
      .where('pembagian_mengajar_id')
      .equals(pembagianMengajarId)
      .toArray();
  }
}

export const assessmentRepository = new AssessmentRepository();
