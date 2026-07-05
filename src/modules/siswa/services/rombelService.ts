/**
 * RombelService - SIKAD v4.0
 * Handles Rombel Bayangan (Shadow Class) management for student promotions
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { BaseService } from '../../../services/baseService';
import { db } from '../../../database/dexie/schema';
import { logger } from '../../../utils/logger';
import type { RombelBayangan } from '../types/mutationTypes';

interface RombelBayanganLocal extends RombelBayangan {
  // Denormalized for local storage
  kelasId?: string;
  tingkat?: number;
}

export class RombelService extends BaseService {
  /**
   * Create a new Rombel Bayangan (shadow class)
   */
  async createRombelBayangan(
    sourceKelasId: string,
    targetTingkat: number,
    academicYearId: string,
    name?: string
  ): Promise<RombelBayangan> {
    return this.handleOperation(async () => {
      // Get source class details
      const { data: sourceKelas, error: kelasError } = await supabase
        .from('kelas')
        .select('nama_kelas, tingkat, academic_term_id')
        .eq('id', sourceKelasId)
        .single();

      if (kelasError) throw new Error(`Failed to fetch source class: ${kelasError.message}`);

      // Generate name if not provided
      const rombelName = name || `Bayangan ${sourceKelas.nama_kelas} -> Tingkat ${targetTingkat}`;

      const rombel: RombelBayangan = {
        id: crypto.randomUUID(),
        sourceKelasId,
        targetTingkat,
        academicYearId,
        name: rombelName,
        status: 'ACTIVE',
        studentIds: [],
        createdAt: new Date().toISOString(),
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .insert(rombel)
        .select()
        .single();

      if (error) throw new Error(`Failed to create rombel bayangan: ${error.message}`);

      // Cache locally
      await db.rombelBayangans?.put({
        ...data,
        kelasId: sourceKelasId,
        tingkat: targetTingkat,
      } as RombelBayanganLocal);

      logger.info(`[RombelService] Created rombel bayangan: ${rombel.id}`);
      return data;
    });
  }

  /**
   * Assign students to a shadow class
   */
  async assignToRombel(
    rombelId: string,
    siswaIds: string[]
  ): Promise<RombelBayangan> {
    return this.handleOperation(async () => {
      // Verify rombel exists
      const { data: rombel, error: rombelError } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .eq('id', rombelId)
        .single();

      if (rombelError) throw new Error(`Failed to fetch rombel: ${rombelError.message}`);
      if (rombel.status !== 'ACTIVE') throw new Error('Rombel is not active');

      // Get current student IDs
      const currentIds = rombel.studentIds || [];

      // Merge and deduplicate
      const newIds = [...new Set([...currentIds, ...siswaIds])];

      // Update in Supabase
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .update({
          studentIds: newIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rombelId)
        .select()
        .single();

      if (error) throw new Error(`Failed to assign students: ${error.message}`);

      // Update local cache
      await db.rombelBayangans?.put(data as RombelBayanganLocal);

      logger.info(`[RombelService] Assigned ${siswaIds.length} students to rombel ${rombelId}`);
      return data;
    });
  }

  /**
   * Remove students from a shadow class
   */
  async removeFromRombel(
    rombelId: string,
    siswaIds: string[]
  ): Promise<RombelBayangan> {
    return this.handleOperation(async () => {
      const { data: rombel, error: rombelError } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .eq('id', rombelId)
        .single();

      if (rombelError) throw new Error(`Failed to fetch rombel: ${rombelError.message}`);

      // Filter out the students
      const currentIds = rombel.studentIds || [];
      const newIds = currentIds.filter((id: string) => !siswaIds.includes(id));

      const { data, error } = await supabase
        .from('rombel_bayangans')
        .update({
          studentIds: newIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rombelId)
        .select()
        .single();

      if (error) throw new Error(`Failed to remove students: ${error.message}`);

      await db.rombelBayangans?.put(data as RombelBayanganLocal);

      return data;
    });
  }

  /**
   * Promote shadow class to real class
   */
  async promoteToReal(
    rombelId: string,
    targetKelasId: string
  ): Promise<{ success: boolean; promotedCount: number; errors: string[] }> {
    return this.handleOperation(async () => {
      // Fetch rombel
      const { data: rombel, error: rombelError } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .eq('id', rombelId)
        .single();

      if (rombelError) throw new Error(`Failed to fetch rombel: ${rombelError.message}`);
      if (rombel.status !== 'ACTIVE') throw new Error('Rombel is not active');

      const studentIds = rombel.studentIds || [];
      const errors: string[] = [];
      let promotedCount = 0;

      // Promote each student
      for (const siswaId of studentIds) {
        try {
          const { error: updateError } = await supabase
            .from('siswas')
            .update({
              kelas_id: targetKelasId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', siswaId);

          if (updateError) {
            errors.push(`Siswa ${siswaId}: ${updateError.message}`);
          } else {
            promotedCount++;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Siswa ${siswaId}: ${msg}`);
        }
      }

      // Update rombel status
      const { error: statusError } = await supabase
        .from('rombel_bayangans')
        .update({
          status: 'PROMOTED',
          promotedAt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rombelId);

      if (statusError) throw new Error(`Failed to update rombel status: ${statusError.message}`);

      // Update local cache
      await db.rombelBayangans?.update(rombelId, {
        status: 'PROMOTED',
        promotedAt: new Date().toISOString(),
      });

      logger.info(`[RombelService] Promoted ${promotedCount} students from rombel ${rombelId} to kelas ${targetKelasId}`);

      return { success: errors.length === 0, promotedCount, errors };
    });
  }

  /**
   * Get all active shadow classes
   */
  async getActiveRombelBayangans(): Promise<RombelBayangan[]> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch rombel bayangans: ${error.message}`);

      return data || [];
    });
  }

  /**
   * Get shadow class by ID
   */
  async getRombelBayanganById(rombelId: string): Promise<RombelBayangan | null> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .eq('id', rombelId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to fetch rombel: ${error.message}`);
      }

      return data;
    });
  }

  /**
   * Get students in a shadow class
   */
  async getStudentsInRombel(rombelId: string): Promise<any[]> {
    return this.handleOperation(async () => {
      const { data: rombel, error: rombelError } = await supabase
        .from('rombel_bayangans')
        .select('studentIds')
        .eq('id', rombelId)
        .single();

      if (rombelError) throw new Error(`Failed to fetch rombel: ${rombelError.message}`);

      const studentIds = rombel?.studentIds || [];
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('siswas')
        .select('*')
        .in('id', studentIds);

      if (error) throw new Error(`Failed to fetch students: ${error.message}`);

      return data || [];
    });
  }

  /**
   * Archive a shadow class
   */
  async archiveRombel(rombelId: string): Promise<RombelBayangan> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .update({
          status: 'ARCHIVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rombelId)
        .select()
        .single();

      if (error) throw new Error(`Failed to archive rombel: ${error.message}`);

      await db.rombelBayangans?.update(rombelId, { status: 'ARCHIVED' });

      logger.info(`[RombelService] Archived rombel ${rombelId}`);
      return data;
    });
  }

  /**
   * Delete a shadow class (only if empty)
   */
  async deleteRombel(rombelId: string): Promise<boolean> {
    return this.handleOperation(async () => {
      const { data: rombel, error: rombelError } = await supabase
        .from('rombel_bayangans')
        .select('studentIds')
        .eq('id', rombelId)
        .single();

      if (rombelError) throw new Error(`Failed to fetch rombel: ${rombelError.message}`);

      if (rombel.studentIds && rombel.studentIds.length > 0) {
        throw new Error('Cannot delete rombel with students. Remove students first.');
      }

      const { error } = await supabase
        .from('rombel_bayangans')
        .delete()
        .eq('id', rombelId);

      if (error) throw new Error(`Failed to delete rombel: ${error.message}`);

      await db.rombelBayangans?.delete(rombelId);

      logger.info(`[RombelService] Deleted rombel ${rombelId}`);
      return true;
    });
  }

  /**
   * Sync shadow classes from server to local
   */
  async syncRombelBayangans(): Promise<RombelBayangan[]> {
    return this.handleOperation(async () => {
      const { data, error } = await supabase
        .from('rombel_bayangans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Failed to sync rombel bayangans: ${error.message}`);

      // Cache locally
      if (db.rombelBayangans) {
        await db.rombelBayangans.clear();
        await db.rombelBayangans.bulkPut(data as RombelBayanganLocal[]);
      }

      return data || [];
    });
  }
}

export const rombelService = new RombelService();
