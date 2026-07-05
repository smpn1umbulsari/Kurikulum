/**
 * AcademicTermService - SIKAD v4.0
 * Handles data synchronization and active term logic coordination
 */

import { BaseService } from '../../../services/baseService';
import { academicTermRepository } from '../repositories/academicTermRepository';
import { supabase } from '../../../infrastructure/supabase/client';
import type { AcademicTerm } from '@/types';

export class AcademicTermService extends BaseService {
  /**
   * Sync academic terms from Supabase and cache locally in Dexie
   */
  async syncAcademicTerms(): Promise<AcademicTerm[]> {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .order('tahun_ajaran', { ascending: false });

    if (error) {
      throw new Error(`Failed to sync academic terms: ${error.message}`);
    }

    const terms = data || [];
    
    // Update local offline IndexedDB cache
    for (const term of terms) {
      await academicTermRepository.save(term, true);
    }

    return terms;
  }

  /**
   * Sets a specific academic term as active locally (enforcing single active term constraint)
   */
  async setActiveTermLocal(termId: string): Promise<void> {
    const terms = await db.academicTerms.toArray();
    
    await db.transaction('rw', [db.academicTerms], async () => {
      for (const term of terms) {
        const isTarget = term.id === termId;
        if (term.status !== isTarget) {
          term.status = isTarget;
          await academicTermRepository.save(term);
        }
      }
    });
  }
}

import { db } from '../../../database/dexie/schema';
export const academicTermService = new AcademicTermService();
