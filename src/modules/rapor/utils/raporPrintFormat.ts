import { db } from '../../../database/dexie/schema';
import { supabase } from '../../../infrastructure/supabase/client';
import type { Siswa, AcademicTerm, Kelas, Guru } from '@/types';

export interface RaporMapelGrade {
  mapelId: string;
  kode: string;
  nama: string;
  kelompok: 'A' | 'B';
  mapping: number;
  uh1: number | null;
  uh2: number | null;
  uh3: number | null;
  pts: number | null;
  pas: number | null;
}

export interface RaporPrintData {
  siswa: Siswa;
  kelas: Kelas;
  waliKelas: Guru | null;
  term: AcademicTerm;
  grades: RaporMapelGrade[];
  attendance: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  catatanWali: string;
}

/**
 * Calculates and returns detailed grades for a student locally using Dexie.
 * Integrates fallback logic using assignment title-matching when offline.
 */
export async function calculateStudentGradesOffline(siswaId: string, termId: string): Promise<RaporPrintData | null> {
  const siswa = await db.siswas.get(siswaId);
  if (!siswa) return null;

  const kelas = await db.kelass.get(siswa.kelas_id || '');
  if (!kelas) return null;

  // Fetch Wali Kelas details
  let waliKelas: Guru | null = null;
  if (kelas.wali_kelas_id) {
    const guru = await db.gurus.get(kelas.wali_kelas_id);
    if (guru) waliKelas = guru;
  }

  const term = await db.academicTerms.get(termId);
  if (!term) return null;

  // Fetch student's homeroom notes (Catatan Wali Kelas)
  const allNotes = await db.catatanWaliKelass.toArray();
  const noteObj = allNotes.find(
    (n) => n.siswa_id === siswaId && n.kelas_id === kelas.id && n.academic_term_id === termId
  );
  const catatanWali = noteObj ? noteObj.catatan : '';

  // Fetch student's attendance summary (from rekap_kehadiran or snapshots)
  // Fallback to offline values computed locally or zero
  const attendance = { sakit: 0, izin: 0, alpa: 0 };
  try {
    const { data: rekap } = await supabase
      .from('rekap_kehadiran')
      .select('*')
      .eq('siswa_id', siswaId)
      .eq('academic_term_id', termId)
      .maybeSingle();

    if (rekap) {
      attendance.sakit = rekap.total_sakit || 0;
      attendance.izin = rekap.total_izin || 0;
      attendance.alpa = rekap.total_alpa || 0;
    }
  } catch (err) {
    console.warn('[RaporPrintFormat] Failed to load online attendance, falling back to 0:', err);
  }

  // Fetch all class pembagianMengajars for this term
  const allPms = await db.pembagianMengajars
    .where('kelas_id')
    .equals(siswa.kelas_id || '')
    .toArray();
  const termPms = allPms.filter((pm) => pm.academic_term_id === termId);

  // Fetch all assessments in this term
  const allAssessments = await db.assessments
    .where('academic_term_id')
    .equals(termId)
    .toArray();

  // Fetch all student details
  const studentDetails = await db.assessmentDetails
    .where('siswa_id')
    .equals(siswaId)
    .toArray();

  // Get assessment types for online matching fallback
  let assessmentTypes: any[] = [];
  try {
    const { data } = await supabase.from('assessment_types').select('id, kode, nama');
    if (data) assessmentTypes = data;
  } catch {}

  const grades: RaporMapelGrade[] = [];

  for (const pm of termPms) {
    const mapel = await db.mataPelajarans.get(pm.mapel_id);
    if (!mapel) continue;

    // Filter assessments for this subject
    const pmAssessments = allAssessments.filter((a) => a.pembagian_mengajar_id === pm.id);
    
    // Sort by date or creation
    pmAssessments.sort((a, b) => new Date(a.tanggal || a.created_at).getTime() - new Date(b.tanggal || b.created_at).getTime());

    const uhScores: number[] = [];
    let ptsScore: number | null = null;
    let pasScore: number | null = null;

    for (const assessment of pmAssessments) {
      const detail = studentDetails.find((d) => d.assessment_id === assessment.id);
      if (!detail) continue;

      const typeObj = assessmentTypes.find((t) => t.id === assessment.assessment_type_id);
      const code = typeObj?.kode?.toUpperCase() || '';
      const title = (assessment.judul || '').toUpperCase();

      if (code === 'PTS' || title.includes('PTS') || title.includes('TENGAH')) {
        ptsScore = detail.nilai;
      } else if (code === 'PAS' || title.includes('PAS') || title.includes('AKHIR')) {
        pasScore = detail.nilai;
      } else {
        uhScores.push(detail.nilai);
      }
    }

    grades.push({
      mapelId: mapel.id,
      kode: mapel.kode,
      nama: mapel.nama,
      kelompok: mapel.kelompok_mapel || 'A',
      mapping: mapel.mapping || 99,
      uh1: uhScores[0] ?? null,
      uh2: uhScores[1] ?? null,
      uh3: uhScores[2] ?? null,
      pts: ptsScore,
      pas: pasScore,
    });
  }

  // Sort by Kelompok ('A' then 'B') then mapping
  grades.sort((a, b) => {
    if (a.kelompok !== b.kelompok) {
      return a.kelompok.localeCompare(b.kelompok);
    }
    return a.mapping - b.mapping;
  });

  return {
    siswa,
    kelas,
    waliKelas,
    term,
    grades,
    attendance,
    catatanWali,
  };
}

/**
 * Format Roman numerals for school grade level.
 */
export function formatRaporDisplayClass(namaKelas: string): string {
  if (!namaKelas) return '-';
  const match = namaKelas.match(/^([789])(.*)$/);
  if (!match) return namaKelas;
  const romanMap: Record<string, string> = { '7': 'VII', '8': 'VIII', '9': 'IX' };
  return `${romanMap[match[1]]}${match[2]}`;
}

function escapeRaporHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatRaporDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate official report card print page.
 */
export function generateRaporPrintHtml(data: RaporPrintData): string {
  const { siswa, kelas, waliKelas, term, grades, attendance, catatanWali } = data;
  
  // Principal settings matching Spenturi config
  const kepalaNama = 'Dra. MAMIK SASMIATI, M.Pd';
  const kepalaNip = '19660601 199003 2 010';
  const paperWidth = '210mm'; // A4 width
  const paperHeight = '297mm'; // A4 height
  const pageSize = 'A4';

  // Group maps
  const kelompokARows = grades.filter(g => g.kelompok === 'A');
  const kelompokBRows = grades.filter(g => g.kelompok === 'B');

  const renderRows = (rows: RaporMapelGrade[], offset: number) => {
    let num = offset;
    return rows.map(r => `
      <tr>
        <td style="text-align: center;">${num++}</td>
        <td>${escapeRaporHtml(r.nama)}</td>
        <td style="text-align: center;">${r.uh1 !== null ? r.uh1 : '-'}</td>
        <td style="text-align: center;">${r.uh2 !== null ? r.uh2 : '-'}</td>
        <td style="text-align: center;">${r.uh3 !== null ? r.uh3 : '-'}</td>
        <td style="text-align: center; font-weight: bold;">${r.pts !== null ? r.pts : '-'}</td>
      </tr>
    `).join('');
  };

  const aRowsHtml = renderRows(kelompokARows, 1);
  const bRowsHtml = renderRows(kelompokBRows, 1);

  const tableBodyHtml = `
    <tr class="rapor-group-row"><td colspan="6" style="text-align: left; font-weight: bold; background: #f8f8f8;">KELOMPOK A</td></tr>
    ${aRowsHtml || '<tr><td colspan="6" style="text-align: center; color: #888;">Tidak ada data mata pelajaran</td></tr>'}
    <tr class="rapor-group-row"><td colspan="6" style="text-align: left; font-weight: bold; background: #f8f8f8;">KELOMPOK B</td></tr>
    ${bRowsHtml || '<tr><td colspan="6" style="text-align: center; color: #888;">Tidak ada data mata pelajaran</td></tr>'}
  `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Cetak Rapor - ${escapeRaporHtml(siswa.nama)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
          .rapor-print-page { width: ${paperWidth}; height: ${paperHeight}; padding: 13mm 16mm 16mm; margin: 0 auto; page-break-after: always; font-size: 11pt; display: flex; flex-direction: column; overflow: hidden; }
          .rapor-kop { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; gap: 12px; padding-bottom: 7px; border-bottom: 3px solid #111; }
          .rapor-logo { display: grid; place-items: center; height: 62px; }
          .rapor-logo img { max-width: 62px; max-height: 62px; object-fit: contain; }
          .rapor-logo-placeholder { width: 62px; height: 62px; border: 1px solid transparent; }
          .rapor-kop-text { text-align: center; line-height: 1.1; }
          .rapor-kop-text h2, .rapor-kop-text h3, .rapor-kop-text h4, .rapor-kop-text p { margin: 0; }
          .rapor-kop-text h2 { font-size: 16pt; letter-spacing: .2px; font-weight: bold; }
          .rapor-kop-text h3 { font-size: 11pt; font-weight: bold; }
          .rapor-kop-text h4 { font-size: 11pt; font-weight: bold; }
          .rapor-kop-text p { font-size: 8pt; line-height: 1.12; }
          .rapor-title { text-align: center; margin: 8px 0 8px; line-height: 1.1; }
          .rapor-title h3 { margin: 0; font-size: 10pt; font-weight: bold; }
          .rapor-title h3:last-child { margin-bottom: 2px; }
          .rapor-identity { display: grid; grid-template-columns: 1fr 180px; gap: 4px 16px; margin-bottom: 6px; font-size: 9pt; }
          .rapor-identity div { display: grid; grid-template-columns: 94px 10px 1fr; gap: 2px; white-space: nowrap; }
          .rapor-identity span { text-align: center; }
          .rapor-identity b { white-space: nowrap; font-weight: bold; }
          .rapor-section-title { margin: 5px 0 2px; font-size: 9.5pt; font-weight: bold; }
          .rapor-sikap-row { display: flex; align-items: baseline; gap: 4px; margin: 1px 0 1px 16px; font-size: 8.5pt; white-space: nowrap; }
          .rapor-sikap-row strong { display: inline-block; min-width: 170px; font-weight: 700; white-space: nowrap; }
          .rapor-sikap-row span { display: inline-block; flex: 0 0 auto; white-space: nowrap; }
          .rapor-sikap-row b { display: inline-block; min-width: 12px; text-align: left; font-weight: bold; white-space: nowrap; }
          .rapor-description { border: 1px solid #555; min-height: 19px; padding: 4px 7px; margin: 0 0 3px 16px; font-size: 8pt; line-height: 1.2; }
          table { border-collapse: collapse; width: 100%; }
          .rapor-score-table { flex: 1 1 auto; margin-bottom: 4px; }
          .rapor-score-table th, .rapor-score-table td { border: 1px solid #333; padding: 2px 4px; font-size: 8.5pt; line-height: 1.1; }
          .rapor-score-table th { text-align: center; background: #efefef; font-weight: bold; }
          .rapor-score-table td:nth-child(2) { text-align: left; width: 45%; }
          .rapor-note-table th, .rapor-note-table td { border: 1px solid #333; padding: 3px 5px; font-size: 8.5pt; line-height: 1.1; }
          .rapor-note-table th { background: #f4b183; font-weight: bold; text-align: center; }
          .rapor-note-table td:first-child, .rapor-note-table td:nth-child(3) { text-align: center; width: 62px; }
          .rapor-note-table td:last-child { width: 45%; }
          .rapor-catatan-print { vertical-align: top; white-space: pre-wrap; line-height: 1.35; padding: 4px 6px; font-size: 9pt; }
          .rapor-date-line, .rapor-date-placeholder { display: block; min-height: 12px; font-size: 8.5pt; text-align: center; }
          .rapor-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 6px; text-align: center; font-size: 8.5pt; align-items: start; }
          .rapor-signatures div { display: grid; align-content: start; min-height: 60px; gap: 1px; }
          .rapor-signatures strong { margin-top: 0; text-decoration: underline; font-size: 8.5pt; min-height: 12px; font-weight: bold; }
          .rapor-signatures small { font-size: 7.5pt; min-height: 10px; }
          .rapor-signature-space { display: block; height: 32px; }
          @page { size: ${pageSize} portrait; margin: 0; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .rapor-print-page { margin: 0; page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <section class="rapor-print-page">
          <header class="rapor-kop">
            <div class="rapor-logo">
              <!-- Spenturi Pemda Logo -->
              <div class="rapor-logo-placeholder"></div>
            </div>
            <div class="rapor-kop-text">
              <h4>PEMERINTAH KABUPATEN JEMBER</h4>
              <h2>SMP NEGERI 1 UMBULSARI</h2>
              <p>Jl. PB. Sudirman No. 12 Gunungsari - Umbulsari, Kode Pos 68166. Telp. (0331) 3231441</p>
              <p>E-mail: smpnegeri1umbulsari@yahoo.com</p>
            </div>
            <div class="rapor-logo">
              <!-- Spenturi School Logo -->
              <div class="rapor-logo-placeholder"></div>
            </div>
          </header>

          <div class="rapor-title">
            <h3>LAPORAN</h3>
            <h3>HASIL BELAJAR PESERTA DIDIK TENGAH SEMESTER ${escapeRaporHtml(String(term.semester).toUpperCase())}</h3>
            <h3>TAHUN PELAJARAN ${escapeRaporHtml(term.tahun_ajaran)}</h3>
          </div>

          <div class="rapor-identity">
            <div><strong>NAMA MURID</strong><span>:</span><b>${escapeRaporHtml(siswa.nama)}</b></div>
            <div><strong>Kelas</strong><span>:</span><b>${escapeRaporHtml(formatRaporDisplayClass(kelas.nama_kelas))}</b></div>
            <div><strong>NIPD / NISN</strong><span>:</span><b>${escapeRaporHtml([siswa.nipd, siswa.nisn].filter(Boolean).join(' / ') || '-')}</b></div>
          </div>

          <div class="rapor-section-title">A. SIKAP</div>
          <div class="rapor-sikap-row"><strong>1. Sikap Spiritual</strong><b>: B</b></div>
          <div class="rapor-description">Memiliki ketakwaan dan toleransi beragama yang mulai berkembang</div>
          <div class="rapor-sikap-row"><strong>2. Sikap Sosial</strong><b>: B</b></div>
          <div class="rapor-description">Memiliki sifat jujur, disiplin, tanggung jawab dan sopan santun yang baik</div>

          <div class="rapor-section-title">B. NILAI</div>
          <table class="rapor-score-table">
            <thead>
              <tr>
                <th rowspan="3" style="width: 40px;">NO.</th>
                <th rowspan="3">MATA PELAJARAN</th>
                <th colspan="3">PENILAIAN</th>
                <th rowspan="3" style="width: 60px;">PTS</th>
              </tr>
              <tr>
                <th colspan="3">SUMATIF HARIAN</th>
              </tr>
              <tr>
                <th style="width: 50px;">1</th>
                <th style="width: 50px;">2</th>
                <th style="width: 50px;">3</th>
              </tr>
            </thead>
            <tbody>
              ${tableBodyHtml}
            </tbody>
          </table>

          <div class="rapor-section-title">KETIDAKHADIRAN DAN CATATAN WALI KELAS</div>
          <table class="rapor-note-table">
            <thead>
              <tr>
                <th style="width: 40px;">No.</th>
                <th>Ketidakhadiran</th>
                <th style="width: 90px;">Jumlah (Hari)</th>
                <th>Catatan Wali Kelas</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Sakit</td>
                <td>${escapeRaporHtml(attendance.sakit)}</td>
                <td class="rapor-catatan-print" rowspan="3">${escapeRaporHtml(catatanWali || 'Pertahankan semangat belajarmu.')}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Izin</td>
                <td>${escapeRaporHtml(attendance.izin)}</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Tanpa Keterangan</td>
                <td>${escapeRaporHtml(attendance.alpa)}</td>
              </tr>
            </tbody>
          </table>

          <div class="rapor-signatures">
            <div>
              <span class="rapor-date-placeholder">&nbsp;</span>
              <span>Wali Murid,</span>
              <span class="rapor-signature-space"></span>
              <strong>________________</strong>
              <small>&nbsp;</small>
            </div>
            <div>
              <span class="rapor-date-placeholder">&nbsp;</span>
              <span>Wali Kelas,</span>
              <span class="rapor-signature-space"></span>
              <strong>${escapeRaporHtml(waliKelas?.nama || '-')}</strong>
              <small>NIP. ${escapeRaporHtml(waliKelas?.nip || '-')}</small>
            </div>
            <div>
              <span class="rapor-date-line">Jember, ${escapeRaporHtml(formatRaporDate(new Date().toISOString().slice(0, 10)))}</span>
              <span>Kepala Sekolah,</span>
              <span class="rapor-signature-space"></span>
              <strong>${escapeRaporHtml(kepalaNama)}</strong>
              <small>NIP. ${escapeRaporHtml(kepalaNip)}</small>
            </div>
          </div>
        </section>
      </body>
    </html>
  `;
}
