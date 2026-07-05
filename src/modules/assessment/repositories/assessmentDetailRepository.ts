/**
 * AssessmentDetailRepository - SIKAD v4.0
 * Offline-first repository for Assessment details (grades/nilai)
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { AssessmentDetail } from '@/types';

export class AssessmentDetailRepository extends BaseRepository<AssessmentDetail> {
  constructor() {
    super(db.assessmentDetails, 'assessment_details');
  }

  /**
   * Get all details/grades for a specific assessment
   */
  async getByAssessment(assessmentId: string): Promise<AssessmentDetail[]> {
    return await this.table.where('assessment_id').equals(assessmentId).toArray();
  }

  /**
   * Bulk save grades
   */
  async saveBulk(details: AssessmentDetail[], isSyncPayload = false): Promise<void> {
    await db.transaction('rw', [db.assessmentDetails, db.syncQueue], async () => {
      for (const detail of details) {
        await this.save(detail, isSyncPayload);
      }
    });
  }
}

export const assessmentDetailRepository = new AssessmentDetailRepository();
