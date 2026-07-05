/**
 * ExamPrintPage - SIKAD v4.0
 * Print templates for exam cards, labels, and supervisor letters
 */

import { useState, useMemo } from 'react';
import { Printer, CreditCard, Tag, FileText } from 'lucide-react';
import type { ExamSeat, Siswa, Guru } from '@/types';
import { AppPrint } from '../../../utils/printHelper';

function escapeRaporHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface ExamConfig {
  examId: string;
  examName: string;
  examDate: string;
  examTime: string;
  schoolName: string;
  schoolAddress: string;
  principalName: string;
}

export default function ExamPrintPage() {
  const [printType, setPrintType] = useState<'card' | 'label' | 'supervisor'>('card');
  const [examConfig, setExamConfig] = useState<ExamConfig>({
    examId: '',
    examName: 'Ujian Tengah Semester',
    examDate: '',
    examTime: '07:00 - 09:00',
    schoolName: 'SMP NEGERI 1 UMBULSARI',
    schoolAddress: 'Jl. Raya Umbulsari No. 1, Jawa Timur',
    principalName: 'Dr. H. Ahmad Dahlan, M.Pd.',
  });

  // For demo purposes, use mock data

  // Mock data for preview
  const mockSeats: ExamSeat[] = useMemo(() => [
    { id: '1', room_id: 'r1', siswa_id: 's1', exam_id: 'e1', nomor_kursi: 1, created_at: '' },
    { id: '2', room_id: 'r1', siswa_id: 's2', exam_id: 'e1', nomor_kursi: 2, created_at: '' },
    { id: '3', room_id: 'r1', siswa_id: 's3', exam_id: 'e1', nomor_kursi: 3, created_at: '' },
    { id: '4', room_id: 'r1', siswa_id: 's4', exam_id: 'e1', nomor_kursi: 4, created_at: '' },
    { id: '5', room_id: 'r1', siswa_id: 's5', exam_id: 'e1', nomor_kursi: 5, created_at: '' },
    { id: '6', room_id: 'r1', siswa_id: 's6', exam_id: 'e1', nomor_kursi: 6, created_at: '' },
  ], []);

  const mockStudents: Partial<Siswa>[] = useMemo(() => [
    { id: 's1', nama: 'Ahmad Fauzi', nisn: '0012345678', nipd: '2024001' },
    { id: 's2', nama: 'Siti Aminah', nisn: '0012345679', nipd: '2024002' },
    { id: 's3', nama: 'Budi Santoso', nisn: '0012345680', nipd: '2024003' },
    { id: 's4', nama: 'Dewi Lestari', nisn: '0012345681', nipd: '2024004' },
    { id: 's5', nama: 'Eko Prasetyo', nisn: '0012345682', nipd: '2024005' },
    { id: 's6', nama: 'Fitri Handayani', nisn: '0012345683', nipd: '2024006' },
  ], []);

  const mockSupervisors: Partial<Guru>[] = useMemo(() => [
    { id: 'g1', nama: 'Dr. H. Muhammad Ali, M.Pd.' },
    { id: 'g2', nama: 'Hj. Fatimah Zahra, S.Pd.' },
  ], []);

  // Get student by ID
  const getStudent = (id: string) => mockStudents.find(s => s.id === id);

  // Print handlers
  const handlePrint = () => {
    let html = '';
    const styleBlock = `
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #fff; color: #000; }
        .print-btn-container { display: flex; justify-content: center; padding: 10px; margin-bottom: 20px; }
        .print-btn { padding: 10px 20px; background: #10b981; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px; }
        @media print {
          .print-btn-container { display: none; }
          body { padding: 0; }
        }
      </style>
    `;

    if (printType === 'card') {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Kartu Peserta</title>
          ${styleBlock}
          <style>
            .grid-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .card-item { border: 2px solid #000; padding: 15px; background: #fff; page-break-inside: avoid; }
            .card-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            .card-title { font-weight: bold; font-size: 14px; }
            .card-info { font-size: 12px; line-height: 1.5; }
            .card-footer { display: flex; justify-content: space-between; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="print-btn-container">
            <button class="print-btn" onclick="window.print()">PRINT / SIMPAN PDF</button>
          </div>
          <div class="grid-cards">
            ${mockSeats.map(seat => {
              const student = getStudent(seat.siswa_id);
              return `
                <div class="card-item">
                  <div class="card-header">
                    <strong style="display: block; font-size: 12px;">${escapeRaporHtml(examConfig.schoolName)}</strong>
                    <span style="font-size: 10px; display: block;">${escapeRaporHtml(examConfig.schoolAddress)}</span>
                  </div>
                  <div style="text-align: center; margin-bottom: 10px;">
                    <span style="border: 1px solid #000; padding: 3px 8px; font-weight: bold; font-size: 11px; display: inline-block;">KARTU PESERTA UJIAN</span>
                    <div style="font-size: 11px; margin-top: 4px;">${escapeRaporHtml(examConfig.examName)}</div>
                  </div>
                  <div class="card-info" style="display: grid; gap: 3px;">
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">No. Peserta</span><span>: ${escapeRaporHtml(student?.nisn || '-')}</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">Nama</span><span>: ${escapeRaporHtml(student?.nama || '-')}</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">Kelas</span><span>: VII A</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">Ruang</span><span>: 101</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">No. Kursi</span><span>: ${seat.nomor_kursi}</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">Tanggal</span><span>: ${escapeRaporHtml(examConfig.examDate || '15 Juli 2026')}</span></div>
                    <div style="display: flex;"><span style="width: 80px; font-weight: bold;">Waktu</span><span>: ${escapeRaporHtml(examConfig.examTime)}</span></div>
                  </div>
                  <div class="card-footer" style="text-align: center;">
                    <div>
                      <div>Peserta</div>
                      <div style="height: 25px;"></div>
                      <strong>${escapeRaporHtml(student?.nama || '-')}</strong>
                    </div>
                    <div>
                      <div>Kepala Sekolah</div>
                      <div style="height: 25px;"></div>
                      <strong>${escapeRaporHtml(examConfig.principalName.split(',')[0])}</strong>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </body>
        </html>
      `;
    } else if (printType === 'label') {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Label Meja</title>
          ${styleBlock}
          <style>
            .grid-labels { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .label-item { border: 1px solid #000; padding: 10px; text-align: center; background: #fff; page-break-inside: avoid; }
            .label-number { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
            .label-name { font-size: 11px; font-weight: bold; margin-bottom: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
            .label-room { font-size: 10px; color: #555; }
            .label-nisn { font-size: 9px; color: #777; }
          </style>
        </head>
        <body>
          <div class="print-btn-container">
            <button class="print-btn" onclick="window.print()">PRINT / SIMPAN PDF</button>
          </div>
          <div class="grid-labels">
            ${mockSeats.map(seat => {
              const student = getStudent(seat.siswa_id);
              return `
                <div class="label-item">
                  <div class="label-number">${seat.nomor_kursi}</div>
                  <div class="label-name">${escapeRaporHtml(student?.nama || '-')}</div>
                  <div class="label-room">Ruang 101</div>
                  <div class="label-nisn">${escapeRaporHtml(student?.nisn || '-')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </body>
        </html>
      `;
    } else {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Surat Tugas Pengawas</title>
          ${styleBlock}
          <style>
            .letter-container { background: #fff; max-width: 800px; margin: 0 auto; }
            .letter-item { border: 2px solid #000; padding: 30px; background: #fff; margin-bottom: 25px; page-break-inside: avoid; }
            .letter-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; }
            .letter-title { text-align: center; margin-bottom: 20px; }
            .letter-body { font-size: 13px; line-height: 1.6; }
            .letter-sig { display: flex; justify-content: flex-end; margin-top: 30px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="print-btn-container">
            <button class="print-btn" onclick="window.print()">PRINT / SIMPAN PDF</button>
          </div>
          <div class="letter-container">
            ${mockSupervisors.map((supervisor, idx) => `
              <div class="letter-item">
                <div class="letter-header">
                  <strong style="font-size: 16px; display: block;">${escapeRaporHtml(examConfig.schoolName)}</strong>
                  <span style="font-size: 12px; display: block;">${escapeRaporHtml(examConfig.schoolAddress)}</span>
                </div>
                <div class="letter-title">
                  <strong style="font-size: 15px; text-decoration: underline; display: block;">SURAT TUGAS</strong>
                  <span style="font-size: 12px;">Nomor: 421/${idx + 1}/0726/${new Date().getFullYear()}</span>
                </div>
                <div class="letter-body">
                  <p>Yang bertanda tangan di bawah ini:</p>
                  <div style="margin-left: 20px; margin-bottom: 15px;">
                    <div><strong>Nama</strong> : ${escapeRaporHtml(examConfig.principalName)}</div>
                    <div><strong>Jabatan</strong> : Kepala Sekolah</div>
                    <div><strong>Unit Kerja</strong> : ${escapeRaporHtml(examConfig.schoolName)}</div>
                  </div>
                  <p>Dengan ini menugaskan:</p>
                  <div style="margin-left: 20px; margin-bottom: 15px;">
                    <div><strong>Nama</strong> : ${escapeRaporHtml(supervisor.nama || '-')}</div>
                    <div><strong>Sebagai</strong> : Pengawas Ujian</div>
                  </div>
                  <p>Untuk pelaksanaan:</p>
                  <div style="margin-left: 20px; margin-bottom: 15px;">
                    <div><strong>Hari/Tanggal</strong> : ${escapeRaporHtml(examConfig.examDate || 'Selasa, 15 Juli 2026')}</div>
                    <div><strong>Waktu</strong> : ${escapeRaporHtml(examConfig.examTime)}</div>
                    <div><strong>Tempat</strong> : Ruang 101</div>
                  </div>
                  <p style="margin-top: 15px;">Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.</p>
                </div>
                <div class="letter-sig">
                  <div style="text-align: center;">
                    <div>Umbulsari, ${escapeRaporHtml(examConfig.examDate || '15 Juli 2026')}</div>
                    <div style="margin-top: 5px;">Kepala Sekolah</div>
                    <div style="height: 50px;"></div>
                    <strong style="text-decoration: underline; display: block;">${escapeRaporHtml(examConfig.principalName)}</strong>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `;
    }

    AppPrint.openHtml(html, {
      documentTitle: `Cetak_${printType === 'card' ? 'Kartu' : printType === 'label' ? 'Label' : 'Surat_Tugas'}`,
      printDelayMs: 500,
    });
  };

  // Generate print content
  const renderKartuUjian = () => (
    <div className="grid grid-cols-2 gap-4">
      {mockSeats.map((seat) => {
        const student = getStudent(seat.siswa_id);
        return (
          <div key={seat.id} className="border-2 border-black p-4 bg-white print:border-black">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <p className="text-xs font-bold">{examConfig.schoolName}</p>
              <p className="text-[10px]">{examConfig.schoolAddress}</p>
            </div>

            {/* Title */}
            <div className="text-center mb-3">
              <p className="text-sm font-bold border border-black px-2 py-1 inline-block">
                KARTU PESERTA UJIAN
              </p>
              <p className="text-xs mt-1">{examConfig.examName}</p>
            </div>

            {/* Info */}
            <div className="text-xs space-y-1 mb-3">
              <div className="flex">
                <span className="w-20 font-semibold">No. Peserta</span>
                <span>: {student?.nisn}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Nama</span>
                <span>: {student?.nama}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Kelas</span>
                <span>: VII A</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Ruang</span>
                <span>: 101</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">No. Kursi</span>
                <span>: {seat.nomor_kursi}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Tanggal</span>
                <span>: {examConfig.examDate || '15 Juli 2026'}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold">Waktu</span>
                <span>: {examConfig.examTime}</span>
              </div>
            </div>

            {/* Signature */}
            <div className="flex justify-between mt-4 pt-2 border-t border-dashed">
              <div className="text-center">
                <p className="text-[10px]">Peserta</p>
                <div className="h-10" />
                <p className="text-xs font-semibold">{student?.nama}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px]">Kepala Sekolah</p>
                <div className="h-10" />
                <p className="text-xs font-semibold">{examConfig.principalName.split(',')[0]}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLabelMeja = () => (
    <div className="grid grid-cols-4 gap-2">
      {mockSeats.map((seat) => {
        const student = getStudent(seat.siswa_id);
        return (
          <div key={seat.id} className="border border-black p-2 text-center bg-white print:border-black">
            <p className="text-lg font-bold">{seat.nomor_kursi}</p>
            <p className="text-xs font-semibold truncate">{student?.nama}</p>
            <p className="text-[10px]">Ruang 101</p>
            <p className="text-[10px] text-neutral-600">{student?.nisn}</p>
          </div>
        );
      })}
    </div>
  );

  const renderSuratTugasPengawas = () => (
    <div className="space-y-6">
      {mockSupervisors.map((supervisor, idx) => (
        <div key={supervisor.id} className="border-2 border-black p-6 bg-white">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-4">
            <p className="text-sm font-bold">{examConfig.schoolName}</p>
            <p className="text-xs">{examConfig.schoolAddress}</p>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <p className="text-base font-bold underline">SURAT TUGAS</p>
            <p className="text-sm">Nomor: 421/{idx + 1}/0726/{new Date().getFullYear()}</p>
          </div>

          {/* Body */}
          <div className="text-sm space-y-3">
            <p>Yang bertanda tangan di bawah ini:</p>
            <div className="ml-4">
              <p><span className="font-semibold">Nama</span> : {examConfig.principalName}</p>
              <p><span className="font-semibold">Jabatan</span> : Kepala Sekolah</p>
              <p><span className="font-semibold">Unit Kerja</span> : {examConfig.schoolName}</p>
            </div>

            <p>Dengan ini menugaskan:</p>
            <div className="ml-4">
              <p><span className="font-semibold">Nama</span> : {supervisor.nama}</p>
              <p><span className="font-semibold">Sebagai</span> : Pengawas Ujian</p>
            </div>

            <p>Untuk pelaksanaan:</p>
            <div className="ml-4">
              <p><span className="font-semibold">Hari/Tanggal</span> : {examConfig.examDate || 'Selasa, 15 Juli 2026'}</p>
              <p><span className="font-semibold">Waktu</span> : {examConfig.examTime}</p>
              <p><span className="font-semibold">Tempat</span> : Ruang 101</p>
            </div>

            <p className="mt-4">
             Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.
            </p>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-8">
            <div className="text-center">
              <p>Umbulsari, {examConfig.examDate || '15 Juli 2026'}</p>
              <p className="mt-12">Kepala Sekolah</p>
              <div className="h-16" />
              <p className="font-bold underline">{examConfig.principalName}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            Asesmen
          </span>
          <h2 className="text-2xl font-bold text-neutral-900">Cetak Dokumen Ujian</h2>
          <p className="text-sm text-neutral-500 mt-1">Kartu peserta, label meja, dan surat tugas pengawas.</p>
        </div>
      </div>

      {/* Config & Options */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
        <h3 className="font-bold text-neutral-800 mb-4">Konfigurasi Cetakan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Nama Ujian</label>
            <input
              type="text"
              value={examConfig.examName}
              onChange={(e) => setExamConfig({ ...examConfig, examName: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Tanggal Ujian</label>
            <input
              type="date"
              value={examConfig.examDate}
              onChange={(e) => setExamConfig({ ...examConfig, examDate: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Waktu Ujian</label>
            <input
              type="text"
              value={examConfig.examTime}
              onChange={(e) => setExamConfig({ ...examConfig, examTime: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Nama Sekolah</label>
            <input
              type="text"
              value={examConfig.schoolName}
              onChange={(e) => setExamConfig({ ...examConfig, schoolName: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Print Type Selection */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setPrintType('card')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              printType === 'card'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Kartu Peserta
          </button>
          <button
            onClick={() => setPrintType('label')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              printType === 'label'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Tag className="h-4 w-4" />
            Label Meja (121)
          </button>
          <button
            onClick={() => setPrintType('supervisor')}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              printType === 'supervisor'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Surat Tugas Pengawas
          </button>

          <div className="flex-1" />

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
        <h3 className="font-bold text-neutral-800 mb-4">Preview</h3>
        <div className="bg-neutral-100 p-4 rounded-xl min-h-[400px]">
          {printType === 'card' && renderKartuUjian()}
          {printType === 'label' && renderLabelMeja()}
          {printType === 'supervisor' && renderSuratTugasPengawas()}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:border-black, .print\\:border-black * { border-color: black !important; }
          [data-print] { visibility: visible; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}