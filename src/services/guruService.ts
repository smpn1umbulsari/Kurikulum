/**
 * Guru Service - SIKAD v4.0
 * Business logic for guru (teacher) operations
 */

import { BaseService, validators, type ServiceResponse } from './baseService';
import { guruRepository, type GuruFilters } from '@/repositories';
import type { Tables } from '@/repositories/baseRepository';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export interface CreateGuruPayload {
  nip: string;
  nama: string;
  email?: string;
  no_hp?: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
}

export interface UpdateGuruPayload {
  nama?: string;
  email?: string;
  no_hp?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  photo_url?: string;
}

export class GuruService extends BaseService {
  /**
   * Get paginated list of active gurus
   */
  async getGurus(
    page = 1,
    limit = 20,
    filters?: GuruFilters
  ): Promise<ServiceResponse<{
    items: Tables['gurus']['Row'][];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    try {
      const result = await guruRepository.findActive({
        page,
        limit,
        jenisKelamin: filters?.jenis_kelamin,
      });
      return this.successResponse(result);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getGurus'));
    }
  }

  /**
   * Get single guru by ID
   */
  async getGuruById(id: string): Promise<ServiceResponse<Tables['gurus']['Row']>> {
    try {
      const result = await guruRepository.findById(id);
      if (result.error) {
        return this.errorResponse({
          code: 'NOT_FOUND',
          message: `Guru with ID ${id} not found`,
        });
      }
      return this.successResponse(result.data!);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getGuruById'));
    }
  }

  /**
   * Search gurus by name or NIP
   */
  async searchGurus(
    query: string,
    options?: { limit?: number; statusAktif?: boolean }
  ): Promise<ServiceResponse<Tables['gurus']['Row'][]>> {
    try {
      const result = await guruRepository.search(query, options);
      if (result.error) {
        return this.errorResponse({
          code: 'SEARCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data || []);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'searchGurus'));
    }
  }

  /**
   * Create new guru via Edge Function
   */
  async createGuru(payload: CreateGuruPayload): Promise<ServiceResponse<Tables['gurus']['Row']>> {
    // Validate payload
    const validationError = this.validatePayload(payload, {
      nip: (v) => validators.required(v) && validators.minLength(5)(v),
      nama: (v) => validators.required(v) && validators.minLength(2)(v),
      jenis_kelamin: (v) => validators.required(v) && ['L', 'P'].includes(v),
    });

    if (validationError) {
      return this.errorResponse(validationError);
    }

    return this.callApi<Tables['gurus']['Row']>(
      `${SUPABASE_URL}/functions/v1/guru-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'create', payload }),
      }
    );
  }

  /**
   * Update guru via Edge Function
   */
  async updateGuru(
    id: string,
    payload: UpdateGuruPayload
  ): Promise<ServiceResponse<Tables['gurus']['Row']>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid guru ID format',
      });
    }

    return this.callApi<Tables['gurus']['Row']>(
      `${SUPABASE_URL}/functions/v1/guru-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'update', id, payload }),
      }
    );
  }

  /**
   * Delete guru (soft delete by setting status_aktif = false)
   */
  async deactivateGuru(id: string): Promise<ServiceResponse<null>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid guru ID format',
      });
    }

    return this.callApi<null>(
      `${SUPABASE_URL}/functions/v1/guru-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'deactivate', id }),
      }
    );
  }

  /**
   * Get guru statistics
   */
  async getStats(): Promise<ServiceResponse<{
    total: number;
    aktif: number;
    nonAktif: number;
    byJenisKelamin: { L: number; P: number };
  }>> {
    try {
      const [activeResult, allResult] = await Promise.all([
        guruRepository.findActive({ limit: 1 }),
        guruRepository.findAll({ limit: 1 }),
      ]);

      return this.successResponse({
        total: allResult.total,
        aktif: activeResult.total,
        nonAktif: allResult.total - activeResult.total,
        byJenisKelamin: { L: 0, P: 0 }, // Would need aggregation query
      });
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getStats'));
    }
  }
}

// Singleton instance
export const guruService = new GuruService();
