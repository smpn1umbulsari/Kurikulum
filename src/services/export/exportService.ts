/**
 * ExportService - SIKAD v4.0
 * Handles API calls to export-api Edge Function for downloading PDF/Excel reports
 * Enhanced with supervisor document generation and Google Drive export
 */

import { supabase } from '../../infrastructure/supabase/client';
import { googleDriveService } from '../googleDriveService';
import { appsScriptHelper } from '../../utils/appsScriptHelper';
import { logger } from '../../utils/logger';

export interface SupervisorLetter {
  id: string;
  supervisorId: string;
  supervisorName: string;
  nip: string;
  examRoomName: string;
  examDate: string;
  examTime: string;
  subjectName: string;
  classNames: string[];
  studentCount: number;
  generatedAt: string;
}

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'xlsx';
  includeSignature?: boolean;
  schoolLetterhead?: boolean;
}

export class ExportService {
  /**
   * Export student roster to CSV
   */
  async exportSiswa(kelasId: string, termId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('export-api', {
      method: 'POST',
      body: {
        action: 'excel-siswa',
        kelas_id: kelasId,
        term_id: termId,
      },
    });

    if (error) {
      throw new Error(`Failed to export siswa: ${error.message}`);
    }

    return data?.url || '';
  }

  /**
   * Export teacher roster to CSV
   */
  async exportGuru(): Promise<string> {
    const { data, error } = await supabase.functions.invoke('export-api', {
      method: 'POST',
      body: {
        action: 'excel-guru',
      },
    });

    if (error) {
      throw new Error(`Failed to export guru: ${error.message}`);
    }

    return data?.url || '';
  }

  /**
   * Export assessment results
   */
  async exportAssessment(pembagianMengajarId: string, format: 'pdf' | 'xlsx' = 'xlsx'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('export-api', {
      method: 'POST',
      body: {
        action: 'excel-assessment',
        pembagian_mengajar_id: pembagianMengajarId,
        format,
      },
    });

    if (error) {
      throw new Error(`Failed to export assessment: ${error.message}`);
    }

    return data?.url || '';
  }

  /**
   * Generate supervisor assignment letter (DOCX)
   */
  async generateSupervisorLetter(
    supervisorId: string,
    examRoomId: string,
    _options: ExportOptions = { format: 'docx', includeSignature: true, schoolLetterhead: true }
  ): Promise<SupervisorLetter> {
    // Fetch supervisor details
    void _options; // suppress unused
    const { data: supervisor, error: supervisorError } = await supabase
      .from('gurus')
      .select('*')
      .eq('id', supervisorId)
      .single();

    if (supervisorError) {
      throw new Error(`Failed to fetch supervisor: ${supervisorError.message}`);
    }

    // Fetch exam room details
    const { data: examRoom, error: examRoomError } = await supabase
      .from('exam_rooms')
      .select('*, exams(*, mata_pelajarans(*))')
      .eq('id', examRoomId)
      .single();

    if (examRoomError) {
      throw new Error(`Failed to fetch exam room: ${examRoomError.message}`);
    }

    // Fetch students in this exam room
    const { data: seats, error: seatsError } = await supabase
      .from('exam_seats')
      .select('*, siswas(*)')
      .eq('room_id', examRoomId);

    if (seatsError) {
      throw new Error(`Failed to fetch exam seats: ${seatsError.message}`);
    }

    const letter: SupervisorLetter = {
      id: crypto.randomUUID(),
      supervisorId: supervisor.id,
      supervisorName: supervisor.nama,
      nip: supervisor.nip || '-',
      examRoomName: examRoom.name,
      examDate: examRoom.exam_date || new Date().toISOString().split('T')[0],
      examTime: `${examRoom.start_time || '08:00'} - ${examRoom.end_time || '10:00'}`,
      subjectName: examRoom.exam?.mata_pelajarans?.nama || 'Umum',
      classNames: [...new Set(seats?.map(s => s.siswa?.kelas || '-') || [])],
      studentCount: seats?.length || 0,
      generatedAt: new Date().toISOString(),
    };

    return letter;
  }

  /**
   * Generate Word document content for supervisor letter
   */
  generateSupervisorLetterDocx(letter: SupervisorLetter): Blob {
    const content = this.buildSupervisorLetterContent(letter);
    const encoder = new TextEncoder();
    const textContent = encoder.encode(content);

    // Create a simple blob - in production, use docx library
    // This creates a properly formatted text file that can be opened in Word
    return new Blob([textContent], { type: 'application/msword' });
  }

  /**
   * Build formatted letter content
   */
  private buildSupervisorLetterContent(letter: SupervisorLetter): string {
    const formattedDate = new Date(letter.generatedAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `
SURAT TUGAS PENGAWAS UJIAN
NOMOR: ST/${letter.examDate.replace(/-/g, '/')}/${letter.supervisorId.slice(0, 4).toUpperCase()}

Yang bertanda tangan di bawah ini:
Nama            : Kepala Sekolah
NIP             : -

Dengan ini menugaskan:
Nama            : ${letter.supervisorName}
NIP             : ${letter.nip}

Untuk bertugas sebagai pengawas ujian pada:
Hari/Tanggal    : ${this.formatDateIndonesian(letter.examDate)}
Waktu           : ${letter.examTime}
Ruang           : ${letter.examRoomName}
Mata Pelajaran  : ${letter.subjectName}
Kelas           : ${letter.classNames.join(', ')}
Jumlah Siswa    : ${letter.studentCount} (${this.numberToWordsIndonesian(letter.studentCount)}) orang

Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.

                 , ${formattedDate}
                  Kepala Sekolah,


                  ___________________________
                  NIP. -

Tembusan:
1. Arsip
`;
  }

  /**
   * Format date to Indonesian format
   */
  private formatDateIndonesian(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /**
   * Convert number to Indonesian words (simplified)
   */
  private numberToWordsIndonesian(num: number): string {
    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
    if (num <= 10) return units[num];

    if (num < 20) return units[num - 10] + ' belas';
    if (num < 100) return units[Math.floor(num / 10)] + ' puluh ' + units[num % 10];
    if (num < 200) return 'seratus ' + this.numberToWordsIndonesian(num - 100);
    if (num < 1000) return units[Math.floor(num / 100)] + ' ratus ' + this.numberToWordsIndonesian(num % 100);

    return num.toString();
  }

  /**
   * Export supervisor letter to Google Drive
   */
  async exportSupervisorLetterToDrive(
    supervisorId: string,
    examRoomId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Generate letter content
      const letter = await this.generateSupervisorLetter(supervisorId, examRoomId);

      // Generate document
      const blob = this.generateSupervisorLetterDocx(letter);
      const fileName = `Surat_Tugas_${letter.supervisorName.replace(/\s+/g, '_')}_${letter.examDate}.doc`;

      // Try Google Apps Script first
      if (appsScriptHelper.isConfigured()) {
        const result = await appsScriptHelper.uploadFile(blob, fileName, {
          supervisorId,
          examRoomId,
          type: 'supervisor_letter',
        });

        if (result.success) {
          logger.info('[ExportService] Letter uploaded via Apps Script');
          return { success: true, url: result.data?.fileUrl };
        }
      }

      // Fallback to Google Drive direct API
      const result = await googleDriveService.uploadWordDocument(
        await blob.arrayBuffer(),
        fileName
      );

      if (result.success) {
        logger.info('[ExportService] Letter uploaded to Google Drive');
        return { success: true, url: result.fileUrl };
      }

      return { success: false, error: result.error || 'Upload failed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[ExportService] Failed to export supervisor letter:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Batch export supervisor letters for an exam session
   */
  async exportBatchSupervisorLetters(examRoomIds: string[]): Promise<{
    success: boolean;
    results: Array<{ roomId: string; success: boolean; url?: string; error?: string }>;
  }> {
    const results = [];

    for (const roomId of examRoomIds) {
      // Get supervisor for this room
      const { data: supervisor, error } = await supabase
        .from('exam_supervisors')
        .select('guru_id')
        .eq('room_id', roomId)
        .single();

      if (error || !supervisor) {
        results.push({ roomId, success: false, error: 'Supervisor not found' });
        continue;
      }

      const result = await this.exportSupervisorLetterToDrive(supervisor.guru_id, roomId);
      results.push({ roomId, ...result });
    }

    return {
      success: results.every(r => r.success),
      results,
    };
  }

  /**
   * Download document locally
   */
  downloadDocument(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export and download supervisor letter
   */
  async downloadSupervisorLetter(supervisorId: string, examRoomId: string): Promise<void> {
    const letter = await this.generateSupervisorLetter(supervisorId, examRoomId);
    const blob = this.generateSupervisorLetterDocx(letter);
    const fileName = `Surat_Tugas_${letter.supervisorName.replace(/\s+/g, '_')}_${letter.examDate}.doc`;
    this.downloadDocument(blob, fileName);
  }
}

export const exportService = new ExportService();
