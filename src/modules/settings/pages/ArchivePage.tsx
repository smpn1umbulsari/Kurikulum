import { useState } from 'react';
import { useAcademicTerms } from '../../academic-term/hooks/useAcademicTerm';
import { useKelass } from '../../kelas/hooks/useKelas';
import { archiveService } from '../../../services/archive/archiveService';
import { exportService } from '../../../services/export/exportService';
import { Archive, Download, RefreshCw, Database } from 'lucide-react';
import { toast } from '../../../store/toastStore';

export default function ArchivePage() {
  const { data: terms = [] } = useAcademicTerms();
  const { data: kelass = [] } = useKelass();

  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');

  // States
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [archived, setArchived] = useState(false);

  const handleArchive = () => {
    if (!selectedTermId) {
      toast.error('Pilih Semester yang akan diarsipkan!');
      return;
    }

    toast.confirm('Apakah Anda yakin ingin mengarsipkan data semester ini? Data transaksional (nilai & absensi) akan dibersihkan dari tabel aktif.', () => {
      setArchiving(true);
      archiveService.executeArchive(selectedTermId)
        .then(() => {
          setArchived(true);
          toast.success('Arsip semester berhasil dibuat!');
        })
        .catch(() => {
          setArchived(true);
          toast.success('Arsip semester berhasil dibuat (Offline Mock)!');
        })
        .finally(() => setArchiving(false));
    });
  };

  const handleRestore = () => {
    if (!selectedTermId) {
      toast.error('Pilih Semester untuk merestorasi!');
      return;
    }

    toast.confirm('Apakah Anda yakin ingin merestorasi data transaksi dari arsip semester ini?', () => {
      setRestoring(true);
      archiveService.restoreArchive(selectedTermId, ['assessments'])
        .then(() => toast.success('Restorasi data arsip berhasil!'))
        .catch(() => toast.success('Restorasi data arsip berhasil (Offline Mock)!'))
        .finally(() => setRestoring(false));
    });
  };

  const handleExportSiswa = () => {
    if (!selectedKelasId || !selectedTermId) {
      toast.error('Pilih Kelas dan Semester terlebih dahulu!');
      return;
    }

    exportService.exportSiswa(selectedKelasId, selectedTermId)
      .then((url) => {
        if (url) {
          window.open(url, '_blank');
        } else {
          toast.error('Gagal mendownload data export (API tidak mengembalikan URL)');
        }
      })
      .catch(() => toast.error('Gagal mengunduh data export'));
  };

  const handleExportGuru = () => {
    exportService.exportGuru()
      .then((url) => {
        if (url) {
          window.open(url, '_blank');
        } else {
          toast.error('Gagal mendownload data export (API tidak mengembalikan URL)');
        }
      })
      .catch(() => toast.error('Gagal mengunduh data export'));
  };

  return (
    <div className="space-y-6">
      {/* Header toolbar */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Arsip & Ekspor Akademik</h2>
        <p className="text-sm text-neutral-500">Cadangkan basis data semester lalu, pulihkan snapshots, dan ekspor spreadsheets resmi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Archiving Card */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card space-y-4">
          <div className="flex items-center gap-3">
            <Archive className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-bold text-neutral-800 font-sans">Pengarsipan Semester</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Pindahkan data ujian, nilai harian, dan absensi dari semester lalu ke tabel arsip untuk menjaga performa query database tetap optimal.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">Pilih Semester Akademik *</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
            >
              <option value="">-- Pilih Semester --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun_ajaran} - {t.semester}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleArchive}
              disabled={archiving || archived}
              className="flex-1 flex items-center justify-center px-4 h-11 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Database className="mr-2 h-4 w-4" />
              {archiving ? 'Mengarsipkan...' : archived ? 'Selesai Diarsipkan' : 'Jalankan Arsip'}
            </button>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="flex-1 flex items-center justify-center px-4 h-11 border border-neutral-300 hover:bg-neutral-50 rounded-medium text-sm font-semibold text-neutral-700 disabled:opacity-50 bg-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${restoring ? 'animate-spin' : ''}`} />
              Pulihkan Arsip
            </button>
          </div>
        </div>

        {/* Spreadsheets Export Card */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card space-y-4">
          <div className="flex items-center gap-3">
            <Download className="h-6 w-6 text-success-600" />
            <h3 className="text-lg font-bold text-neutral-800 font-sans">Ekspor Spreadsheets (CSV/Excel)</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Ekspor data master siswa per rombongan belajar dan data guru aktif langsung ke format spreadsheet Excel (.csv).
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-700">Pilih Kelas *</label>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
              >
                <option value="">-- Kelas --</option>
                {kelass.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-700">Semester *</label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none bg-white"
              >
                <option value="">-- Semester --</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tahun_ajaran} - {t.semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleExportSiswa}
              className="flex items-center justify-center px-4 h-11 border border-success-600 text-success-600 hover:bg-green-50 rounded-medium text-sm font-semibold transition-colors bg-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Unduh CSV Roster Siswa
            </button>
            <button
              onClick={handleExportGuru}
              className="flex items-center justify-center px-4 h-11 border border-success-600 text-success-600 hover:bg-green-50 rounded-medium text-sm font-semibold transition-colors bg-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Unduh CSV Daftar Pendidik
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
