/**
 * PromotionService - SIKAD v4.0
 * Handles API calls to promotion-api Edge Function for student class promotion
 */

import { supabase } from '../../infrastructure/supabase/client';
import type { PromotionJob } from '@/types';

export class PromotionService {
  /**
   * Preview student promotions
   */
  async previewPromotion(sourceTermId: string, targetTermId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('promotion-api', {
      method: 'POST',
      body: {
        action: 'preview',
        source_term_id: sourceTermId,
        target_term_id: targetTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to preview promotion: ${error.message}`);
    }

    return data;
  }

  /**
   * Execute promotion job
   */
  async executePromotion(sourceTermId: string, targetTermId: string): Promise<PromotionJob> {
    const { data, error } = await supabase.functions.invoke('promotion-api', {
      method: 'POST',
      body: {
        action: 'execute',
        source_term_id: sourceTermId,
        target_term_id: targetTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to execute promotion: ${error.message}`);
    }

    return data?.data || data;
  }

  /**
   * Get promotion job details
   */
  async getJobDetails(jobId: string): Promise<PromotionJob> {
    const { data, error } = await supabase.functions.invoke('promotion-api', {
      method: 'GET',
      headers: {
        'x-job-id': jobId, // Or passed in query/headers depending on implementation
      },
    });

    if (error) {
      throw new Error(`Failed to fetch job details: ${error.message}`);
    }

    return data?.data || data;
  }

  /**
   * Rollback a promotion job
   */
  async rollbackPromotion(jobId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('promotion-api', {
      method: 'POST',
      body: {
        action: 'rollback',
        job_id: jobId,
      },
    });

    if (error) {
      throw new Error(`Failed to rollback promotion: ${error.message}`);
    }
  }
}

export const promotionService = new PromotionService();
