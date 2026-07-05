import { useState } from 'react';
import { useSiswas } from '../../siswa/hooks/useSiswa';
import { useKelass } from '../../kelas/hooks/useKelas';
import { useRaporPreview, useClassSummary, useExportRapor } from '../hooks/useReporting';
import { useAppStore } from '../../../store/appStore';
import { Download, FileText, Users, BarChart3, Printer } from 'lucide-react';
import { LoadingState } from '../../../components/ui/LoadingState';
import { AppPrint } from '../../../utils/printHelper';
import { calculateStudentGradesOffline, generateRaporPrintHtml } from '../../rapor/utils/raporPrintFormat';
import { toast } from '../../../store/toastStore';

export default function ReportingPage() {
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedSiswa, setSelectedSiswa] = useState<string>('');
  
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);
  const { data: siswas = [] } = useSiswas();
  const { data: kelass = [] } = useKelass();
  
  const { data: raporPreview } = useRaporPreview(selectedSiswa);
  const { data: classSummary, isLoading: loadingSummary } = useClassSummary(selectedKelas);
  
  const exportRapor = useExportRapor();

  const filteredSiswas = selectedKelas
    ? siswas.filter((s: any) => s.kelas_id === selectedKelas)
    : siswas;

  const handleExport = async () => {
    if (!selectedSiswa || !currentAcademicTerm) return;
    
    try {
      const url = await exportRapor.mutateAsync({
        siswaId: selectedSiswa,
        academicTermId: currentAcademicTerm.id,
      });
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePrintOffline = async () => {
    if (!selectedSiswa || !currentAcademicTerm) return;
    try {
      const printData = await calculateStudentGradesOffline(selectedSiswa, currentAcademicTerm.id);
      if (!printData) {
        toast.error('Data rapor tidak ditemukan atau siswa belum terdaftar.');
        return;
      }
      const html = generateRaporPrintHtml(printData);
      AppPrint.openHtml(html, {
        documentTitle: `Rapor_${printData.siswa.nama.replace(/\s+/g, '_')}`,
        printDelayMs: 500,
      });
    } catch (err) {
      console.error('Failed to print Rapor:', err);
      toast.error('Gagal menghasilkan cetakan rapor secara offline.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-800 font-sans">Laporan & Reporting</h2>
        <p className="text-sm text-neutral-500">
          Generate rapor siswa, laporan kelas, dan dokumen akademik lainnya.
        </p>
      </div>

      {/* Academic Term Info */}
      {currentAcademicTerm && (
        <div className="bg-primary-50 border border-primary-200 rounded-card p-4">
          <p className="text-sm text-primary-800">
            <strong>Tahun Ajaran Aktif:</strong> {currentAcademicTerm.tahun_ajaran} - {currentAcademicTerm.semester}
          </p>
        </div>
      )}

      {/* Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Selection */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Laporan Per Kelas
          </h3>
          
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="w-full h-11 px-4 border border-neutral-300 rounded-medium text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Pilih Kelas</option>
            {kelass.map((kelas: any) => (
              <option key={kelas.id} value={kelas.id}>
                {kelas.nama_kelas}
              </option>
            ))}
          </select>

          {selectedKelas && (
            <div className="mt-4 space-y-4">
              {loadingSummary ? (
                <LoadingState message="Memuat ringkasan kelas..." />
              ) : classSummary ? (
                <div className="bg-neutral-50 rounded-medium p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Total Siswa</span>
                    <span className="text-sm font-bold text-neutral-800">{classSummary.total_siswa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Rata-rata Kelas</span>
                    <span className="text-sm font-bold text-success-600">
                      {classSummary.rata_rata_kelas.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Student Selection */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Rapor Siswa
          </h3>
          
          <select
            value={selectedSiswa}
            onChange={(e) => setSelectedSiswa(e.target.value)}
            className="w-full h-11 px-4 border border-neutral-300 rounded-medium text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">Pilih Siswa</option>
            {filteredSiswas.map((siswa: any) => (
              <option key={siswa.id} value={siswa.id}>
                {siswa.nama} ({siswa.nisn || siswa.nipd})
              </option>
            ))}
          </select>

          {selectedSiswa && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleExport}
                disabled={exportRapor.isPending}
                className="flex-1 flex items-center justify-center px-4 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-medium text-xs font-bold transition-all border border-neutral-300 disabled:opacity-50"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportRapor.isPending ? 'Memproses...' : 'Export PDF'}
              </button>
              <button
                onClick={handlePrintOffline}
                className="flex-1 flex items-center justify-center px-4 h-11 bg-primary-600 hover:bg-primary-700 text-white rounded-medium text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="mr-2 h-4 w-4" />
                Cetak Rapor (Luring)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {selectedSiswa && raporPreview && (
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" /> Preview Rapor: {raporPreview.siswa_name}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-medium p-4">
              <p className="text-xs text-neutral-500">Rata-rata Nilai</p>
              <p className="text-2xl font-bold text-success-600">
                {raporPreview.rata_rata.toFixed(2)}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-medium p-4">
              <p className="text-xs text-neutral-500">Total Kehadiran</p>
              <p className="text-2xl font-bold text-primary-600">
                {raporPreview.kehadiran.hadir}x
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
