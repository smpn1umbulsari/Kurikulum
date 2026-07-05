/**
 * Siswa Repository - SIKAD v4.0
 * Repository for siswa (student) data operations
 */

import { BaseRepository, type RepositoryResult } from './baseRepository';
import type { Tables } from './baseRepository';
import { supabase } from '@/infrastructure/supabase/client';

export interface SiswaFilters {
  status_aktif?: boolean;
  jenis_kelamin?: string;
  kelas_id?: string;
  academic_term_id?: string;
  search?: string;
}

export class SiswaRepository extends BaseRepository<'siswas'> {
  constructor() {
    super({
      tableName: 'siswas',
      primaryKey: 'id',
      selectableFields: [
        'id',
        'nisn',
        'nipd',
        'nama',
        'email',
        'no_hp',
        'jenis_kelamin',
        'tempat_lahir',
        'tanggal_lahir',
        'alamat',
        'nama_ayah',
        'nama_ibu',
        'pekerjaan_ayah',
        'pekerjaan_ibu',
        'photo_url',
        'status_aktif',
        'created_at',
        'updated_at',
      ],
    });
  }

  /**
   * Find siswa by NISN
   */
  async findByNisn(nisn: string): Promise<RepositoryResult<Tables['siswas']['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nisn', nisn)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['siswas']['Row'], error: null };
  }

  /**
   * Find siswa by NIPD
   */
  async findByNipd(nipd: string): Promise<RepositoryResult<Tables['siswas']['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nipd', nipd)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['siswas']['Row'], error: null };
  }

  /**
   * Search siswas by name, NISN, or NIPD
   */
  async search(
    query: string,
    options?: { limit?: number; statusAktif?: boolean }
  ): Promise<RepositoryResult<Tables['siswas']['Row'][]>> {
    let builder = supabase
      .from(this.tableName)
      .select('*')
      .or(`nama.ilike.%${query}%,nisn.ilike.%${query}%,nipd.ilike.%${query}%`)
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

    return { data: data as Tables['siswas']['Row'][], error: null };
  }

  /**
   * Get students in a specific class
   */
  async findByKelas(
    kelasId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{
    items: Tables['siswas']['Row'][];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50 } = options || {};

    // First get students in the kelas
    const { data: kelasSiswa, error: kelasError } = await supabase
      .from('riwayat_kelas')
      .select('siswa_id')
      .eq('kelas_id', kelasId)
      .eq('is_active', true);

    if (kelasError) {
      throw new Error(`Failed to fetch kelas students: ${kelasError.message}`);
    }

    const siswaIds = kelasSiswa?.map((k) => k.siswa_id) || [];

    if (siswaIds.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    // Then fetch siswa details
    const { data, error, count } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .in('id', siswaIds)
      .order('nama')
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(`Failed to fetch siswa: ${error.message}`);
    }

    return {
      items: (data as Tables['siswas']['Row'][]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get siswa with their class history
   */
  async findWithKelas(id: string): Promise<RepositoryResult<any>> {
    const { data, error } = await supabase
      .from('siswas')
      .select(`
        *,
        riwayat_kelas (
          id,
          kelas_id,
          is_active,
          kelas (
            nama_kelas,
            tingkat
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
export const siswaRepository = new SiswaRepository();
