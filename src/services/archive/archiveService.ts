/**
 * ArchiveService - SIKAD v4.0
 * Handles API calls to archive-api Edge Function for database archiving
 */

import { supabase } from '../../infrastructure/supabase/client';

export class ArchiveService {
  /**
   * Preview archive details
   */
  async previewArchive(academicTermId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('archive-api', {
      method: 'POST',
      body: {
        action: 'preview',
        academic_term_id: academicTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to preview archive: ${error.message}`);
    }

    return data;
  }

  /**
   * Create and execute archive job
   */
  async executeArchive(academicTermId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('archive-api', {
      method: 'POST',
      body: {
        action: 'execute',
        academic_term_id: academicTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to execute archive: ${error.message}`);
    }

    return data;
  }

  /**
   * Restore tables from an archive job
   */
  async restoreArchive(jobId: string, tables: string[]): Promise<void> {
    const { error } = await supabase.functions.invoke('archive-api', {
      method: 'POST',
      body: {
        action: 'restore',
        job_id: jobId,
        tables,
      },
    });

    if (error) {
      throw new Error(`Failed to restore archive: ${error.message}`);
    }
  }
}

export const archiveService = new ArchiveService();
