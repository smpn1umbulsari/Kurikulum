import { useEffect, useState } from 'react';
import { useGurus } from '../../guru/hooks/useGuru';
import { useSiswas } from '../../siswa/hooks/useSiswa';
import { useKelass } from '../../kelas/hooks/useKelas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Award, ShieldCheck, Heart } from 'lucide-react';

export default function KepsekDashboardPage() {
  const { data: gurus = [] } = useGurus();
  const { data: siswas = [] } = useSiswas();
  const { data: kelass = [] } = useKelass();

  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0 });

  useEffect(() => {
    setStats({
      teachers: gurus.length,
      students: siswas.filter(s => s.status_aktif).length,
      classes: kelass.length
    });
  }, [gurus, siswas, kelass]);

  // Chart 1: Grade distributions across levels
  const levelGradeData = [
    { level: 'Kelas 10', 'Nilai Rata-rata': 78 },
    { level: 'Kelas 11', 'Nilai Rata-rata': 82 },
    { level: 'Kelas 12', 'Nilai Rata-rata': 85 },
  ];

  // Chart 2: Attendance rate percentages
  const attendanceRateData = [
    { bulan: 'Januari', rate: 94 },
    { bulan: 'Februari', rate: 96 },
    { bulan: 'Maret', rate: 95 },
    { bulan: 'April', rate: 98 },
    { bulan: 'Mei', rate: 97 },
    { bulan: 'Juni', rate: 99 },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 font-sans">Dashboard Kepala Sekolah</h2>
          <p className="text-sm text-neutral-500">Pratinjau metrik mutu akademik, kehadiran siswa, dan statistik alumni secara terpadu.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-success-700 bg-success-50 border border-success-200 px-3 py-1.5 rounded-medium shadow-sm">
          <ShieldCheck className="h-4 w-4 text-success-500" />
          Mutu Sekolah Terjaga
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
          <div>
            <p className="text-sm font-medium text-neutral-500">Rasio Guru & Siswa</p>
            <p className="text-3xl font-bold text-neutral-800 mt-1">1 : {Math.round(stats.students / (stats.teachers || 1))}</p>
          </div>
          <UsersIcon className="h-10 w-10 text-primary-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
          <div>
            <p className="text-sm font-medium text-neutral-500">Indeks Mutu Belajar</p>
            <p className="text-3xl font-bold text-success-600 mt-1">A (Amat Baik)</p>
          </div>
          <Award className="h-10 w-10 text-success-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
          <div>
            <p className="text-sm font-medium text-neutral-500">Rata-rata Presensi</p>
            <p className="text-3xl font-bold text-warning-600 mt-1">97.8 %</p>
          </div>
          <Heart className="h-10 w-10 text-warning-500" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 font-sans">Rata-rata Nilai Siswa per Tingkatan</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelGradeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Nilai Rata-rata" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 font-sans">Tren Grafik Persentase Kehadiran</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
