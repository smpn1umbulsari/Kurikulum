/**
 * Kelas Repository - SIKAD v4.0
 * Repository for kelas (class) data operations
 */

import { BaseRepository, type RepositoryResult } from './baseRepository';
import type { Tables } from './baseRepository';
import { supabase } from '@/infrastructure/supabase/client';

export class KelasRepository extends BaseRepository<'kelas'> {
  constructor() {
    super({
      tableName: 'kelas',
      primaryKey: 'id',
      selectableFields: [
        'id',
        'nama_kelas',
        'tingkat',
        'academic_term_id',
        'wali_kelas_id',
        'created_at',
        'updated_at',
      ],
    });
  }

  /**
   * Find kelas by name
   */
  async findByName(namaKelas: string): Promise<RepositoryResult<Tables['kelas']['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nama_kelas', namaKelas)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['kelas']['Row'], error: null };
  }

  /**
   * Get kelas by academic term
   */
  async findByAcademicTerm(
    academicTermId: string,
    options?: { tingkat?: number }
  ): Promise<RepositoryResult<Tables['kelas']['Row'][]>> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *,
        gurus (
          id,
          nama
        )
      `)
      .eq('academic_term_id', academicTermId)
      .order('tingkat')
      .order('nama_kelas');

    if (options?.tingkat !== undefined) {
      query = query.eq('tingkat', options.tingkat);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['kelas']['Row'][], error: null };
  }

  /**
   * Get active kelas with wali kelas info
   */
  async findActiveWithWaliKelas(): Promise<RepositoryResult<any[]>> {
    const { data, error } = await supabase
      .from('kelas')
      .select(`
        *,
        gurus!kelas_wali_kelas_id_fkey (
          id,
          nip,
          nama
        )
      `)
      .order('tingkat')
      .order('nama_kelas');

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  /**
   * Get kelas statistics (student count)
   */
  async findWithStats(academicTermId: string): Promise<RepositoryResult<any[]>> {
    const { data, error } = await supabase
      .from('kelas')
      .select(`
        *,
        gurus!kelas_wali_kelas_id_fkey (
          id,
          nama
        ),
        riwayat_kelas (
          siswa_id
        )
      `)
      .eq('academic_term_id', academicTermId)
      .order('tingkat')
      .order('nama_kelas');

    if (error) {
      return { data: null, error: error.message };
    }

    // Transform to include student count
    const result = data?.map((kelas: any) => ({
      ...kelas,
      student_count: kelas.riwayat_kelas?.length || 0,
    })) || [];

    return { data: result, error: null };
  }
}

// Singleton instance
export const kelasRepository = new KelasRepository();
