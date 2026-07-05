/**
 * Assessment Service - SIKAD v4.0
 * Business logic for assessment operations
 */

import { BaseService, validators, type ServiceResponse } from './baseService';
import { assessmentRepository } from '@/repositories';
import type { Tables } from '@/repositories/baseRepository';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export interface CreateAssessmentPayload {
  assessment_type_id: string;
  pembagian_mengajar_id: string;
  academic_term_id: string;
  tanggal: string;
  bobot?: number;
  deskripsi?: string;
}

export interface UpdateAssessmentPayload {
  tanggal?: string;
  bobot?: number;
  deskripsi?: string;
}

export interface UpdateScorePayload {
  siswa_id: string;
  nilai?: number;
  deskripsi?: string;
}

export class AssessmentService extends BaseService {
  /**
   * Get assessments by pembagian mengajar
   */
  async getAssessmentsByPM(
    pmId: string,
    options?: { stage?: string }
  ): Promise<ServiceResponse<Tables['assessments']['Row'][]>> {
    try {
      const result = await assessmentRepository.findByPembagianMengajar(pmId, options);
      if (result.error) {
        return this.errorResponse({
          code: 'FETCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data || []);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getAssessmentsByPM'));
    }
  }

  /**
   * Get assessments by class and subject
   */
  async getAssessmentsByKelasMapel(
    kelasId: string,
    mapelId: string,
    academicTermId: string,
    options?: { stage?: string }
  ): Promise<ServiceResponse<any[]>> {
    try {
      const result = await assessmentRepository.findByKelasAndMapel(
        kelasId,
        mapelId,
        academicTermId,
        options
      );
      if (result.error) {
        return this.errorResponse({
          code: 'FETCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data || []);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getAssessmentsByKelasMapel'));
    }
  }

  /**
   * Get assessment with all student scores
   */
  async getAssessmentWithScores(
    assessmentId: string
  ): Promise<ServiceResponse<any>> {
    try {
      const result = await assessmentRepository.findWithDetails(assessmentId);
      if (result.error) {
        return this.errorResponse({
          code: 'FETCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getAssessmentWithScores'));
    }
  }

  /**
   * Create new assessment with student scores
   */
  async createAssessment(
    payload: CreateAssessmentPayload,
    studentScores?: UpdateScorePayload[]
  ): Promise<ServiceResponse<Tables['assessments']['Row']>> {
    // Validate payload
    const validationError = this.validatePayload(payload, {
      assessment_type_id: validators.uuid,
      pembagian_mengajar_id: validators.uuid,
      academic_term_id: validators.uuid,
      tanggal: (v) => validators.required(v) && !isNaN(Date.parse(v)),
    });

    if (validationError) {
      return this.errorResponse(validationError);
    }

    return this.callApi<Tables['assessments']['Row']>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          payload,
          student_scores: studentScores,
        }),
      }
    );
  }

  /**
   * Update assessment details
   */
  async updateAssessment(
    id: string,
    payload: UpdateAssessmentPayload
  ): Promise<ServiceResponse<Tables['assessments']['Row']>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid assessment ID format',
      });
    }

    return this.callApi<Tables['assessments']['Row']>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'update', id, payload }),
      }
    );
  }

  /**
   * Update student score for an assessment
   */
  async updateScore(
    assessmentId: string,
    payload: UpdateScorePayload
  ): Promise<ServiceResponse<any>> {
    if (!validators.uuid(assessmentId)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid assessment ID format',
      });
    }

    if (!validators.uuid(payload.siswa_id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid siswa ID format',
      });
    }

    return this.callApi<any>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_score',
          assessment_id: assessmentId,
          payload,
        }),
      }
    );
  }

  /**
   * Bulk update student scores
   */
  async bulkUpdateScores(
    assessmentId: string,
    scores: UpdateScorePayload[]
  ): Promise<ServiceResponse<any>> {
    if (!validators.uuid(assessmentId)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid assessment ID format',
      });
    }

    // Validate all siswa_ids
    for (const score of scores) {
      if (!validators.uuid(score.siswa_id)) {
        return this.errorResponse({
          code: 'VALIDATION_ERROR',
          message: `Invalid siswa ID format: ${score.siswa_id}`,
        });
      }
    }

    return this.callApi<any>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'bulk_update_scores',
          assessment_id: assessmentId,
          scores,
        }),
      }
    );
  }

  /**
   * Publish assessment (change stage to PUBLISH)
   */
  async publishAssessment(id: string): Promise<ServiceResponse<Tables['assessments']['Row']>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid assessment ID format',
      });
    }

    return this.callApi<Tables['assessments']['Row']>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'publish', id }),
      }
    );
  }

  /**
   * Finalize assessment (change stage to FINAL)
   */
  async finalizeAssessment(id: string): Promise<ServiceResponse<Tables['assessments']['Row']>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid assessment ID format',
      });
    }

    return this.callApi<Tables['assessments']['Row']>(
      `${SUPABASE_URL}/functions/v1/assessment-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'finalize', id }),
      }
    );
  }

  /**
   * Get assessment summary by type
   */
  async getSummaryByType(
    academicTermId: string,
    kelasId?: string
  ): Promise<ServiceResponse<any[]>> {
    try {
      const result = await assessmentRepository.getSummaryByType(academicTermId, kelasId);
      if (result.error) {
        return this.errorResponse({
          code: 'FETCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data || []);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getSummaryByType'));
    }
  }
}

// Singleton instance
export const assessmentService = new AssessmentService();
