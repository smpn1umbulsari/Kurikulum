/**
 * Siswa Service - SIKAD v4.0
 * Business logic for siswa (student) operations
 */

import { BaseService, validators, type ServiceResponse } from './baseService';
import { siswaRepository, type SiswaFilters } from '@/repositories';
import type { Tables } from '@/repositories/baseRepository';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export interface CreateSiswaPayload {
  nisn: string;
  nipd: string;
  nama: string;
  email?: string;
  no_hp?: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  pekerjaan_ayah?: string;
  pekerjaan_ibu?: string;
}

export interface UpdateSiswaPayload {
  nama?: string;
  email?: string;
  no_hp?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  pekerjaan_ayah?: string;
  pekerjaan_ibu?: string;
  photo_url?: string;
}

export class SiswaService extends BaseService {
  /**
   * Get paginated list of siswa
   */
  async getSiswas(
    page = 1,
    limit = 20,
    filters?: SiswaFilters
  ): Promise<ServiceResponse<{
    items: Tables['siswas']['Row'][];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    try {
      const result = await siswaRepository.findAll({
        page,
        limit,
        filters: filters as Record<string, any>,
      });
      return this.successResponse(result);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getSiswas'));
    }
  }

  /**
   * Get single siswa by ID
   */
  async getSiswaById(id: string): Promise<ServiceResponse<Tables['siswas']['Row']>> {
    try {
      const result = await siswaRepository.findById(id);
      if (result.error) {
        return this.errorResponse({
          code: 'NOT_FOUND',
          message: `Siswa with ID ${id} not found`,
        });
      }
      return this.successResponse(result.data!);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getSiswaById'));
    }
  }

  /**
   * Search siswas by name, NISN, or NIPD
   */
  async searchSiswas(
    query: string,
    options?: { limit?: number; statusAktif?: boolean }
  ): Promise<ServiceResponse<Tables['siswas']['Row'][]>> {
    try {
      const result = await siswaRepository.search(query, options);
      if (result.error) {
        return this.errorResponse({
          code: 'SEARCH_ERROR',
          message: result.error,
        });
      }
      return this.successResponse(result.data || []);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'searchSiswas'));
    }
  }

  /**
   * Get students in a specific class
   */
  async getSiswasByKelas(
    kelasId: string,
    page = 1,
    limit = 50
  ): Promise<ServiceResponse<{
    items: Tables['siswas']['Row'][];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>> {
    try {
      const result = await siswaRepository.findByKelas(kelasId, { page, limit });
      return this.successResponse(result);
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getSiswasByKelas'));
    }
  }

  /**
   * Create new siswa via Edge Function
   */
  async createSiswa(payload: CreateSiswaPayload): Promise<ServiceResponse<Tables['siswas']['Row']>> {
    // Validate payload
    const validationError = this.validatePayload(payload, {
      nisn: (v) => validators.required(v) && validators.minLength(4)(v),
      nipd: (v) => validators.required(v) && validators.minLength(4)(v),
      nama: (v) => validators.required(v) && validators.minLength(2)(v),
      jenis_kelamin: (v) => validators.required(v) && ['L', 'P'].includes(v),
    });

    if (validationError) {
      return this.errorResponse(validationError);
    }

    return this.callApi<Tables['siswas']['Row']>(
      `${SUPABASE_URL}/functions/v1/siswa-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'create', payload }),
      }
    );
  }

  /**
   * Update siswa via Edge Function
   */
  async updateSiswa(
    id: string,
    payload: UpdateSiswaPayload
  ): Promise<ServiceResponse<Tables['siswas']['Row']>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid siswa ID format',
      });
    }

    return this.callApi<Tables['siswas']['Row']>(
      `${SUPABASE_URL}/functions/v1/siswa-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'update', id, payload }),
      }
    );
  }

  /**
   * Mutate siswa (graduate/transfer)
   */
  async mutateSiswa(
    id: string,
    mutationType: 'GRADUATE' | 'TRANSFER' | 'DROP_OUT'
  ): Promise<ServiceResponse<null>> {
    if (!validators.uuid(id)) {
      return this.errorResponse({
        code: 'VALIDATION_ERROR',
        message: 'Invalid siswa ID format',
      });
    }

    return this.callApi<null>(
      `${SUPABASE_URL}/functions/v1/promotion-api`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'mutate', siswa_id: id, type: mutationType }),
      }
    );
  }

  /**
   * Get siswa statistics
   */
  async getStats(_academicTermId?: string): Promise<ServiceResponse<{
    total: number;
    aktif: number;
    nonAktif: number;
    byTingkat?: Record<number, number>;
  }>> {
    try {
      const result = await siswaRepository.findAll({ limit: 1 });
      
      return this.successResponse({
        total: result.total,
        aktif: result.total, // Would need filter for active only
        nonAktif: 0,
      });
    } catch (error) {
      return this.errorResponse(this.handleError(error, 'getStats'));
    }
  }
}

// Singleton instance
export const siswaService = new SiswaService();
