/**
 * MutationService - SIKAD v4.0
 * Handles student mutation operations: naik kelas, kelulusan, mutasi
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { BaseService } from '../../../services/baseService';
import { siswaRepository } from '../repositories/siswaRepository';
import { logger } from '../../../utils/logger';
import type {
  StudentMutation,
  MutationJob,
  MutationPreview,
  MutationPreviewItem,
  MutationPreviewWarning,
} from '../types/mutationTypes';
import {
  DEFAULT_PROMOTION_CRITERIA as promotionCriteria,
  DEFAULT_GRADUATION_CRITERIA as graduationCriteria,
} from '../types/mutationTypes';

export class MutationService extends BaseService {
  /**
   * Preview student promotions (naik kelas)
   */
  async previewNaikKelas(sourceTermId: string, _targetTermId: string): Promise<MutationPreview> {
    return this.handleOperation(async () => {
      // Get all students in the source term
      const { data: kelas, error: kelasError } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tingkat')
        .eq('academic_term_id', sourceTermId);

      if (kelasError) throw new Error(`Failed to fetch classes: ${kelasError.message}`);

      const kelasIds = kelas?.map(k => k.id) || [];
      if (kelasIds.length === 0) {
        return { eligible: [], ineligible: [], warnings: [] };
      }

      // Get students with their academic data
      const { data: siswas, error: siswaError } = await supabase
        .from('siswas')
        .select('*')
        .eq('status_aktif', true)
        .in('kelas_id', kelasIds);

      if (siswaError) throw new Error(`Failed to fetch students: ${siswaError.message}`);

      // Get assessment averages for each student
      const eligible: MutationPreviewItem[] = [];
      const ineligible: MutationPreviewItem[] = [];
      const warnings: MutationPreviewWarning[] = [];

      for (const siswa of siswas || []) {
        const { data: assessments } = await supabase
          .from('assessment_details')
          .select('nilai')
          .eq('siswa_id', siswa.id);

        const avgScore = assessments && assessments.length > 0
          ? assessments.reduce((sum, a) => sum + (a.nilai || 0), 0) / assessments.length
          : promotionCriteria.minimumAverageScore; // Default to eligible if no data

        const item: MutationPreviewItem = {
          siswaId: siswa.id,
          siswaName: siswa.nama,
          nisn: siswa.nisn || '-',
          currentKelas: kelas?.find(k => k.id === siswa.kelas_id)?.nama_kelas || '-',
          targetKelas: this.getNextKelasName(siswa.kelas_id, kelas || []),
        };

        if (avgScore >= promotionCriteria.minimumAverageScore) {
          eligible.push(item);
        } else {
          item.reason = `Rata-rata nilai ${avgScore.toFixed(1)} di bawah minimum ${promotionCriteria.minimumAverageScore}`;
          ineligible.push(item);
        }


      }

      return { eligible, ineligible, warnings };
    });
  }

  /**
   * Execute student promotions (naik kelas)
   */
  async naikKelas(sourceTermId: string, targetTermId: string, siswaIds?: string[]): Promise<MutationJob> {
    return this.handleOperation(async () => {
      const preview = await this.previewNaikKelas(sourceTermId, targetTermId);
      const toProcess = siswaIds
        ? [...preview.eligible, ...preview.eligible.filter(i => siswaIds.includes(i.siswaId))]
        : preview.eligible;

      const job: MutationJob = {
        id: crypto.randomUUID(),
        type: 'NAIK_KELAS',
        status: 'IN_PROGRESS',
        sourceTermId,
        targetTermId,
        totalStudents: toProcess.length,
        processedStudents: 0,
        successCount: 0,
        failedCount: 0,
        errors: [],
        initiatedBy: 'system',
        initiatedAt: new Date().toISOString(),
      };

      // Get target term classes
      const { data: targetKelas } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tingkat')
        .eq('academic_term_id', targetTermId);

      for (const item of toProcess) {
        try {
          const targetKelasId = this.findTargetKelas(item.currentKelas, targetKelas || []);
          if (!targetKelasId) {
            job.errors.push({
              siswaId: item.siswaId,
              siswaName: item.siswaName,
              error: 'Target kelas tidak ditemukan',
              timestamp: new Date().toISOString(),
            });
            job.failedCount++;
            continue;
          }

          // Update student class
          const { error } = await supabase
            .from('siswas')
            .update({
              kelas_id: targetKelasId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.siswaId);

          if (error) throw error;

          // Create mutation record
          await this.createMutationRecord({
            siswaId: item.siswaId,
            type: 'NAIK_KELAS',
            status: 'COMPLETED',
            source: 'BULK',
            sourceKelasId: item.currentKelas,
            targetKelasId,
            targetTermId,
            initiatedAt: job.initiatedAt,
          });

          // Update local cache
          await siswaRepository.save({ id: item.siswaId, kelas_id: targetKelasId } as any, true);

          job.successCount++;
        } catch (error) {
          job.errors.push({
            siswaId: item.siswaId,
            siswaName: item.siswaName,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          job.failedCount++;
        }
        job.processedStudents++;
      }

      job.status = job.failedCount === 0 ? 'COMPLETED' : 'COMPLETED';
      job.completedAt = new Date().toISOString();

      return job;
    });
  }

  /**
   * Preview graduation candidates
   */
  async previewKelulusan(academicTermId: string): Promise<MutationPreview> {
    return this.handleOperation(async () => {
      // Get final year classes (typically tingkat 9)
      const { data: kelas, error: kelasError } = await supabase
        .from('kelas')
        .select('id, nama_kelas, tingkat')
        .eq('academic_term_id', academicTermId)
        .eq('tingkat', 9); // Assuming final year is grade 9

      if (kelasError) throw new Error(`Failed to fetch classes: ${kelasError.message}`);

      const kelasIds = kelas?.map(k => k.id) || [];
      if (kelasIds.length === 0) {
        return { eligible: [], ineligible: [], warnings: [] };
      }

      const { data: siswas, error: siswaError } = await supabase
        .from('siswas')
        .select('*')
        .eq('status_aktif', true)
        .in('kelas_id', kelasIds);

      if (siswaError) throw new Error(`Failed to fetch students: ${siswaError.message}`);

      const eligible: MutationPreviewItem[] = [];
      const ineligible: MutationPreviewItem[] = [];
      const warnings: MutationPreviewWarning[] = [];

      for (const siswa of siswas || []) {
        const { data: assessments } = await supabase
          .from('assessment_details')
          .select('nilai')
          .eq('siswa_id', siswa.id);

        const avgScore = assessments && assessments.length > 0
          ? assessments.reduce((sum, a) => sum + (a.nilai || 0), 0) / assessments.length
          : 0;

        const item: MutationPreviewItem = {
          siswaId: siswa.id,
          siswaName: siswa.nama,
          nisn: siswa.nisn || '-',
          currentKelas: kelas?.find(k => k.id === siswa.kelas_id)?.nama_kelas || '-',
        };

        if (avgScore >= graduationCriteria.minimumAverageScore) {
          eligible.push(item);
        } else {
          item.reason = `Rata-rata nilai ${avgScore.toFixed(1)} tidak memenuhi criteria kelulusan`;
          ineligible.push(item);
        }
      }

      return { eligible, ineligible, warnings };
    });
  }

  /**
   * Execute graduation
   */
  async kelulusan(academicTermId: string, tahunLulus: number, siswaIds?: string[]): Promise<MutationJob> {
    return this.handleOperation(async () => {
      const preview = await this.previewKelulusan(academicTermId);
      const toProcess = siswaIds
        ? preview.eligible.filter(i => siswaIds.includes(i.siswaId))
        : preview.eligible;

      const job: MutationJob = {
        id: crypto.randomUUID(),
        type: 'KELULUSAN',
        status: 'IN_PROGRESS',
        sourceTermId: academicTermId,
        tahunAjaran: tahunLulus,
        totalStudents: toProcess.length,
        processedStudents: 0,
        successCount: 0,
        failedCount: 0,
        errors: [],
        initiatedBy: 'system',
        initiatedAt: new Date().toISOString(),
      };

      for (const item of toProcess) {
        try {
          // Update student status
          const { error } = await supabase
            .from('siswas')
            .update({
              status_aktif: false,
              tahun_lulus: tahunLulus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.siswaId);

          if (error) throw error;

          // Create mutation record
          await this.createMutationRecord({
            siswaId: item.siswaId,
            type: 'KELULUSAN',
            status: 'COMPLETED',
            source: 'BULK',
            sourceTermId: academicTermId,
            tahunLulus,
            initiatedAt: job.initiatedAt,
          });

          // Update local cache
          await siswaRepository.save({
            id: item.siswaId,
            status_aktif: false,
            tahun_lulus: tahunLulus,
          } as any, true);

          job.successCount++;
        } catch (error) {
          job.errors.push({
            siswaId: item.siswaId,
            siswaName: item.siswaName,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
          job.failedCount++;
        }
        job.processedStudents++;
      }

      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();

      return job;
    });
  }

  /**
   * Handle student transfer (mutasi keluar)
   */
  async mutasi(
    siswaId: string,
    targetSekolah: string,
    reason: string,
    notes?: string
  ): Promise<StudentMutation> {
    return this.handleOperation(async () => {
      // Get student details
      const { data: siswa, error: siswaError } = await supabase
        .from('siswas')
        .select('*, kelas(*)')
        .eq('id', siswaId)
        .single();

      if (siswaError) throw new Error(`Failed to fetch student: ${siswaError.message}`);
      if (!siswa) throw new Error('Student not found');

      // Create mutation record
      const mutation = await this.createMutationRecord({
        siswaId,
        type: 'PINDAH',
        status: 'PENDING',
        source: 'MANUAL',
        sourceKelasId: siswa.kelas_id,
        sourceTermId: siswa.kelas?.academic_term_id,
        targetSekolah,
        reason: reason as any,
        notes,
        initiatedAt: new Date().toISOString(),
      });

      // Update student status to inactive
      const { error: updateError } = await supabase
        .from('siswas')
        .update({
          status_aktif: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', siswaId);

      if (updateError) throw updateError;

      // Update local cache
      await siswaRepository.save({ id: siswaId, status_aktif: false } as any, true);

      return mutation;
    });
  }

  /**
   * Get mutation history for a student
   */
  async getMutationHistory(siswaId: string): Promise<StudentMutation[]> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('student_mutations')
        .select('*')
        .eq('siswa_id', siswaId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch mutation history: ${error.message}`);

      return data || [];
    });
  }

  /**
   * Get mutation job status
   */
  async getJobStatus(jobId: string): Promise<MutationJob | null> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('mutation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Failed to fetch job: ${error.message}`);
      }

      return data;
    });
  }

  /**
   * Rollback a mutation job
   */
  async rollbackMutation(jobId: string): Promise<boolean> {
    return this.handleOperation(async () => {
      const { data: job, error: jobError } = await supabase
        .from('mutation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw new Error(`Failed to fetch job: ${jobError.message}`);

      // Revert based on job type
      if (job.type === 'NAIK_KELAS') {
        // Revert class changes
        const { data: mutations } = await supabase
          .from('student_mutations')
          .select('*')
          .eq('job_id', jobId);

        for (const mutation of mutations || []) {
          await supabase
            .from('siswas')
            .update({ kelas_id: mutation.source_kelas_id })
            .eq('id', mutation.siswa_id);
        }
      } else if (job.type === 'KELULUSAN') {
        // Revert graduation status
        const { data: mutations } = await supabase
          .from('student_mutations')
          .select('*')
          .eq('job_id', jobId);

        for (const mutation of mutations || []) {
          await supabase
            .from('siswas')
            .update({ status_aktif: true, tahun_lulus: null })
            .eq('id', mutation.siswa_id);
        }
      }

      // Update job status
      await supabase
        .from('mutation_jobs')
        .update({ status: 'ROLLED_BACK' })
        .eq('id', jobId);

      logger.info(`[MutationService] Rolled back job ${jobId}`);
      return true;
    });
  }

  /**
   * Helper: Get next class name based on current class
   */
  private getNextKelasName(currentKelasId: string, allKelas: Array<{ id: string; nama_kelas: string; tingkat: number }>): string | undefined {
    const current = allKelas.find(k => k.id === currentKelasId);
    if (!current) return undefined;

    const nextTingkat = current.tingkat + 1;
    if (nextTingkat > 9) return undefined; // No promotion beyond grade 9

    const nextKelas = allKelas.find(k => k.tingkat === nextTingkat);
    return nextKelas?.nama_kelas;
  }

  /**
   * Helper: Find target class ID
   */
  private findTargetKelas(currentKelasName: string, targetKelas: Array<{ id: string; nama_kelas: string; tingkat: number }>): string | undefined {
    // Match by extracting tingkat from kelas name
    const match = currentKelasName.match(/VII|VIII|IX|X/);
    if (!match) return undefined;

    const currentRoman = match[0];
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const currentIndex = romanNumerals.indexOf(currentRoman);
    const nextRoman = romanNumerals[currentIndex + 1];

    return targetKelas.find(k => k.nama_kelas.includes(nextRoman))?.id;
  }

  /**
   * Create a mutation record
   */
  private async createMutationRecord(data: Partial<StudentMutation>): Promise<StudentMutation> {
    const record: StudentMutation = {
      id: crypto.randomUUID(),
      siswaId: data.siswaId || '',
      type: data.type || 'PINDAH',
      status: data.status || 'PENDING',
      source: data.source || 'MANUAL',
      sourceKelasId: data.sourceKelasId,
      sourceTermId: data.sourceTermId,
      targetKelasId: data.targetKelasId,
      targetTermId: data.targetTermId,
      targetSekolah: data.targetSekolah,
      tahunLulus: data.tahunLulus,
      reason: data.reason,
      notes: data.notes,
      initiatedAt: data.initiatedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('student_mutations')
      .insert(record)
      .select()
      .single();

    if (error) {
      logger.error('[MutationService] Failed to create mutation record:', error);
      throw new Error(`Failed to create mutation record: ${error.message}`);
    }

    return result;
  }
}

export const mutationService = new MutationService();
