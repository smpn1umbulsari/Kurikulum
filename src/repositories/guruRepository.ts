/**
 * Guru Repository - SIKAD v4.0
 * Repository for guru (teacher) data operations
 */

import { BaseRepository, type RepositoryResult } from './baseRepository';
import type { Tables } from './baseRepository';
import { supabase } from '@/infrastructure/supabase/client';

export interface GuruFilters {
  status_aktif?: boolean;
  jenis_kelamin?: string;
  search?: string;
}

export class GuruRepository extends BaseRepository<'gurus'> {
  constructor() {
    super({
      tableName: 'gurus',
      primaryKey: 'id',
      selectableFields: [
        'id',
        'nip',
        'nama',
        'email',
        'no_hp',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'alamat',
        'status_aktif',
        'photo_url',
        'created_at',
        'updated_at',
      ],
    });
  }

  /**
   * Find guru by NIP
   */
  async findByNip(nip: string): Promise<RepositoryResult<Tables['gurus']['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nip', nip)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['gurus']['Row'], error: null };
  }

  /**
   * Search gurus by name or NIP
   */
  async search(
    query: string,
    options?: { limit?: number; statusAktif?: boolean }
  ): Promise<RepositoryResult<Tables['gurus']['Row'][]>> {
    let builder = supabase
      .from(this.tableName)
      .select('*')
      .or(`nama.ilike.%${query}%,nip.ilike.%${query}%`)
      .order('nama');

    if (options?.statusAktif !== undefined) {
      builder = builder.eq('status_aktif', options.statusAktif);
    }

    if (options?.limit) {
      builder = builder.limit(options.limit);
    }

    const { data, error } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['gurus']['Row'][], error: null };
  }

  /**
   * Get active gurus with pagination
   */
  async findActive(options?: {
    page?: number;
    limit?: number;
    jenisKelamin?: string;
  }): Promise<{
    items: Tables['gurus']['Row'][];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, jenisKelamin } = options || {};

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .eq('status_aktif', true)
      .order('nama')
      .range((page - 1) * limit, page * limit - 1);

    if (jenisKelamin) {
      query = query.eq('jenis_kelamin', jenisKelamin);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch active gurus: ${error.message}`);
    }

    return {
      items: (data as Tables['gurus']['Row'][]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get guru with user account info
   */
  async findWithUser(id: string): Promise<RepositoryResult<any>> {
    const { data, error } = await supabase
      .from('gurus')
      .select(`
        *,
        user_roles (
          role_id,
          roles (
            name,
            display_name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }
}

// Singleton instance
export const guruRepository = new GuruRepository();
