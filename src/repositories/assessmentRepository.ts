/**
 * Assessment Repository - SIKAD v4.0
 * Repository for assessment data operations
 */

import { BaseRepository, type RepositoryResult } from './baseRepository';
import type { Tables } from './baseRepository';
import { supabase } from '@/infrastructure/supabase/client';

export interface AssessmentFilters {
  assessment_type_id?: string;
  stage?: 'DRAFT' | 'PUBLISH' | 'FINAL';
  guru_id?: string;
  kelas_id?: string;
  mapel_id?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AssessmentRepository extends BaseRepository<'assessments'> {
  constructor() {
    super({
      tableName: 'assessments',
      primaryKey: 'id',
      selectableFields: [
        'id',
        'assessment_type_id',
        'pembagian_mengajar_id',
        'academic_term_id',
        'tanggal',
        'stage',
        'bobot',
        'deskripsi',
        'created_by',
        'created_at',
        'updated_at',
      ],
    });
  }

  /**
   * Find assessments by pembagian mengajar (teacher assignment)
   */
  async findByPembagianMengajar(
    pmId: string,
    options?: { stage?: string }
  ): Promise<RepositoryResult<Tables['assessments']['Row'][]>> {
    let query = supabase
      .from(this.tableName)
      .select(`
        *,
        assessment_types (
          id,
          nama,
          kode,
          kategori
        )
      `)
      .eq('pembagian_mengajar_id', pmId)
      .order('tanggal', { ascending: false });

    if (options?.stage) {
      query = query.eq('stage', options.stage);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Tables['assessments']['Row'][], error: null };
  }

  /**
   * Find assessments by class and subject
   */
  async findByKelasAndMapel(
    kelasId: string,
    mapelId: string,
    academicTermId: string,
    options?: { stage?: string }
  ): Promise<RepositoryResult<any[]>> {
    // First get pembagian_mengajar_id
    const { data: pm } = await supabase
      .from('pembagian_mengajar')
      .select('id')
      .eq('kelas_id', kelasId)
      .eq('mapel_id', mapelId)
      .eq('academic_term_id', academicTermId)
      .single();

    if (!pm) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('assessments')
      .select(`
        *,
        assessment_types (
          id,
          nama,
          kode,
          kategori
        )
      `)
      .eq('pembagian_mengajar_id', pm.id)
      .order('tanggal', { ascending: false });

    if (options?.stage) {
      query = query.eq('stage', options.stage);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  }

  /**
   * Get assessment with details (student scores)
   */
  async findWithDetails(
    assessmentId: string
  ): Promise<RepositoryResult<any>> {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        assessment_types (
          id,
          nama,
          kode,
          kategori,
          bobot_default
        ),
        pembagian_mengajar (
          id,
          kelas_id,
          mapel_id,
          kelas (
            id,
            nama_kelas,
            tingkat
          ),
          mata_pelajarans (
            id,
            nama,
            kode
          )
        ),
        assessment_details (
          *,
          siswas (
            id,
            nipd,
            nama
          )
        )
      `)
      .eq('id', assessmentId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  /**
   * Create assessment with details (batch insert)
   */
  async createWithDetails(
    assessment: Tables['assessments']['Insert'],
    details: { siswa_id: string; nilai?: number; deskripsi?: string }[]
  ): Promise<RepositoryResult<any>> {
    // Create assessment first
    const { data: assessmentData, error: assessmentError } = await supabase
      .from(this.tableName)
      .insert(assessment)
      .select()
      .single();

    if (assessmentError || !assessmentData) {
      return { data: null, error: assessmentError?.message || 'Failed to create assessment' };
    }

    // Create assessment details
    if (details.length > 0) {
      const detailRecords = details.map((d) => ({
        assessment_id: assessmentData.id,
        siswa_id: d.siswa_id,
        nilai: d.nilai,
        deskripsi: d.deskripsi,
      }));

      const { error: detailsError } = await supabase
        .from('assessment_details')
        .insert(detailRecords);

      if (detailsError) {
        // Rollback assessment creation
        await supabase.from(this.tableName).delete().eq('id', assessmentData.id);
        return { data: null, error: detailsError.message };
      }
    }

    return { data: assessmentData, error: null };
  }

  /**
   * Update assessment stage
   */
  async updateStage(
    id: string,
    stage: 'DRAFT' | 'PUBLISH' | 'FINAL'
  ): Promise<RepositoryResult<Tables['assessments']['Row']>> {
    return this.update(id, { stage });
  }

  /**
   * Get assessment summary by type
   */
  async getSummaryByType(
    academicTermId: string,
    kelasId?: string
  ): Promise<RepositoryResult<any[]>> {
    let query = supabase
      .from('assessments')
      .select(`
        assessment_type_id,
        assessment_types (
          nama,
          kategori
        ),
        stage
      `)
      .eq('academic_term_id', academicTermId);

    if (kelasId) {
      query = query.eq('pembagian_mengajar.kelas_id', kelasId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    // Aggregate by type
    const summary: Record<string, any> = {};
    data?.forEach((a: any) => {
      const typeId = a.assessment_type_id;
      if (!summary[typeId]) {
        summary[typeId] = {
          type: a.assessment_types,
          total: 0,
          by_stage: { DRAFT: 0, PUBLISH: 0, FINAL: 0 },
        };
      }
      summary[typeId].total++;
      summary[typeId].by_stage[a.stage]++;
    });

    return { data: Object.values(summary), error: null };
  }
}

// Singleton instance
export const assessmentRepository = new AssessmentRepository();
