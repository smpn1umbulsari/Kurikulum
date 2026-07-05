/**
 * GraduationService - SIKAD v4.0
 * Handles API calls to graduation-api Edge Function for student graduation
 */

import { supabase } from '../../infrastructure/supabase/client';
import type { GraduationJob } from '@/types';

export class GraduationService {
  /**
   * Preview graduation candidates
   */
  async previewGraduation(academicTermId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('graduation-api', {
      method: 'POST',
      body: {
        action: 'preview',
        academic_term_id: academicTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to preview graduation: ${error.message}`);
    }

    return data;
  }

  /**
   * Execute graduation job
   */
  async executeGraduation(academicTermId: string, tahunLulus: number): Promise<GraduationJob> {
    const { data, error } = await supabase.functions.invoke('graduation-api', {
      method: 'POST',
      body: {
        action: 'execute',
        academic_term_id: academicTermId,
        tahun_lulus: tahunLulus,
      },
    });

    if (error) {
      throw new Error(`Failed to execute graduation: ${error.message}`);
    }

    return data?.data || data;
  }

  /**
   * Get graduation job details
   */
  async getJobDetails(jobId: string): Promise<GraduationJob> {
    const { data, error } = await supabase.functions.invoke('graduation-api', {
      method: 'GET',
      headers: {
        'x-job-id': jobId,
      },
    });

    if (error) {
      throw new Error(`Failed to fetch job details: ${error.message}`);
    }

    return data?.data || data;
  }
}

export const graduationService = new GraduationService();
