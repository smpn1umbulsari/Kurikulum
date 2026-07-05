/**
 * AssessmentService - SIKAD v4.0
 * Handles data synchronization and grade lock validations
 */

import { BaseService } from '../../../services/baseService';
import { assessmentRepository } from '../repositories/assessmentRepository';
import { assessmentDetailRepository } from '../repositories/assessmentDetailRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { Assessment, AssessmentDetail } from '@/types';

export class AssessmentService extends BaseService {
  /**
   * Sync assessments from Supabase and cache in local Dexie
   */
  async syncAssessments(): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*');

    if (error) {
      throw new Error(`Failed to sync assessments: ${error.message}`);
    }

    const list = data || [];
    for (const item of list) {
      await assessmentRepository.save(item, true);
    }

    return list;
  }

  /**
   * Sync assessment details for a specific assessment from Supabase and cache locally
   */
  async syncAssessmentDetails(assessmentId: string): Promise<AssessmentDetail[]> {
    const { data, error } = await supabase
      .from('assessment_details')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (error) {
      throw new Error(`Failed to sync assessment details: ${error.message}`);
    }

    const list = data || [];
    for (const item of list) {
      await assessmentDetailRepository.save(item, true);
    }

    return list;
  }
}

export const assessmentService = new AssessmentService();
