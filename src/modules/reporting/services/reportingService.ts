/**
 * ReportingService - SIKAD v4.0
 * Handles report generation for academic data
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { BaseService } from '../../../services/baseService';

export interface RaporPreview {
  siswa_id: string;
  siswa_name: string;
  kelas: string;
  nilai: Record<string, number[]>;
  rata_rata: number;
  kehadiran: {
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
  };
}

export class ReportingService extends BaseService {
  /**
   * Generate student report preview
   */
  async generateRaporPreview(
    siswaId: string,
    academicTermId: string
  ): Promise<RaporPreview | null> {
    try {
      // Fetch siswa data
      const { data: siswa, error: siswaError } = await supabase
        .from('siswas')
        .select('*')
        .eq('id', siswaId)
        .single();

      if (siswaError || !siswa) {
        throw new Error('Siswa not found');
      }

      // Fetch assessment details for this siswa
      const { data: nilais, error: nilaiError } = await supabase
        .from('assessment_details')
        .select(`
          nilai,
          assessment:assessments(
            assessment_type_id,
            bobot
          )
        `)
        .eq('siswa_id', siswaId);

      if (nilaiError) {
        throw new Error('Failed to fetch nilai');
      }

      // Fetch rekapitulasi kehadiran data
      const { data: rekapKehadiran, error: rekapError } = await supabase
        .from('rekap_kehadiran')
        .select('*')
        .eq('siswa_id', siswaId)
        .eq('academic_term_id', academicTermId)
        .single();

      if (rekapError) {
        console.warn('[ReportingService] rekap_kehadiran not found, using zeros');
      }

      // Calculate averages
      const nilaiMap: Record<string, number[]> = {};
      let totalNilai = 0;
      let totalBobot = 0;

      for (const nilai of nilais || []) {
        const typeId = (nilai as any).assessment?.assessment_type_id;
        if (typeId) {
          if (!nilaiMap[typeId]) {
            nilaiMap[typeId] = [];
          }
          nilaiMap[typeId].push(nilai.nilai);
        }
        totalNilai += nilai.nilai * ((nilai as any).assessment?.bobot || 1);
        totalBobot += (nilai as any).assessment?.bobot || 1;
      }

      // Use rekapitulasi kehadiran summary
      const hadirSummary = {
        hadir: rekapKehadiran?.total_hadir || 0,
        izin: rekapKehadiran?.total_izin || 0,
        sakit: rekapKehadiran?.total_sakit || 0,
        alpa: rekapKehadiran?.total_alpa || 0,
      };

      return {
        siswa_id: siswaId,
        siswa_name: siswa.nama,
        kelas: siswa.kelas || 'N/A',
        nilai: nilaiMap,
        rata_rata: totalBobot > 0 ? totalNilai / totalBobot : 0,
        kehadiran: hadirSummary,
      };
    } catch (error) {
      console.error('[ReportingService] Failed to generate rapor preview:', error);
      return null;
    }
  }

  /**
   * Generate class summary report
   */
  async generateClassSummary(kelasId: string, academicTermId: string) {
    try {
      const { data: siswas } = await supabase
        .from('siswas')
        .select('*')
        .eq('kelas_id', kelasId);

      const summaries = await Promise.all(
        (siswas || []).map((siswa) =>
          this.generateRaporPreview(siswa.id, academicTermId)
        )
      );

      const validSummaries = summaries.filter(Boolean);

      return {
        total_siswa: validSummaries.length,
        rata_rata_kelas:
          validSummaries.reduce((sum, s) => sum + (s?.rata_rata || 0), 0) /
          (validSummaries.length || 1),
        summaries: validSummaries,
      };
    } catch (error) {
      console.error('[ReportingService] Failed to generate class summary:', error);
      return null;
    }
  }

  /**
   * Export rapor to PDF (calls edge function)
   */
  async exportRaporPdf(siswaId: string, academicTermId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('export-api', {
      method: 'POST',
      body: {
        action: 'rapor-pdf',
        siswa_id: siswaId,
        term_id: academicTermId,
      },
    });

    if (error) {
      throw new Error(`Failed to export rapor: ${error.message}`);
    }

    return data?.url || '';
  }
}

export const reportingService = new ReportingService();
