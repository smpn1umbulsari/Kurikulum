import { useEffect, useState } from 'react';
import { useGurus } from '../../guru/hooks/useGuru';
import { useSiswas } from '../../siswa/hooks/useSiswa';
import { useKelass } from '../../kelas/hooks/useKelas';
import { useMapels } from '../../settings/hooks/useMapel';
import { usePembagianMengajars } from '../../kelas/hooks/usePembagianMengajar';
import { useRaporSnapshots } from '../../rapor/hooks/useRapor';
import { useSyncStore } from '../../../store/syncStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, BookOpen, GraduationCap, Server, HelpCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { data: gurus = [] } = useGurus();
  const { data: siswas = [] } = useSiswas();
  const { data: kelass = [] } = useKelass();
  const { data: mapels = [] } = useMapels();
  const { data: allocations = [] } = usePembagianMengajars();
  const { data: snapshots = [] } = useRaporSnapshots();
  const pendingSyncCount = useSyncStore((state) => state.pendingCount);

  // Local state for counts
  const [totalGurus, setTotalGurus] = useState(0);
  const [totalSiswas, setTotalSiswas] = useState(0);
  const [totalKelass, setTotalKelass] = useState(0);
  const [totalMapels, setTotalMapels] = useState(0);

  useEffect(() => {
    setTotalGurus(gurus.length);
    setTotalSiswas(siswas.filter(s => s.status_aktif).length);
    setTotalKelass(kelass.length);
    setTotalMapels(mapels.length);
  }, [gurus, siswas, kelass, mapels]);

  // Chart 1: Teacher Workload (JP)
  const workloadData = gurus.slice(0, 5).map((g) => {
    const hours = allocations.filter((a) => a.guru_id === g.id).reduce((sum, curr) => sum + curr.jp, 0);
    return {
      nama: g.nama.split(' ')[0], // First name
      'Beban JP': hours || 2, // fallback for mock
    };
  });

  // Chart 2: Attendance rate trend (last 5 days)
  const attendanceTrendData = [
    { tanggal: '23 Juni', Hadir: 96, Sakit: 2, Izin: 1, Alpa: 1 },
    { tanggal: '24 Juni', Hadir: 98, Sakit: 1, Izin: 1, Alpa: 0 },
    { tanggal: '25 Juni', Hadir: 94, Sakit: 3, Izin: 2, Alpa: 1 },
    { tanggal: '26 Juni', Hadir: 97, Sakit: 1, Izin: 1, Alpa: 1 },
    { tanggal: '27 Juni', Hadir: 99, Sakit: 0, Izin: 1, Alpa: 0 },
  ];

  // Chart 3: Report status
  const finalizedCount = snapshots.length;
  const draftRaporCount = Math.max(0, totalSiswas - finalizedCount);
  const raporStatusData = [
    { name: 'DRAFT Rapor', value: draftRaporCount || 10 },
    { name: 'FINALIZED Rapor', value: finalizedCount || 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-500 p-6 rounded-card text-white shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans">Selamat Datang di SIKAD v4.0</h2>
          <p className="text-sm opacity-90 mt-1">Sistem Informasi Akademik luring-pertama (offline-first) dengan sinkronisasi terenkripsi.</p>
        </div>
        {pendingSyncCount > 0 && (
          <div className="bg-white text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
            <Server className="h-4 w-4" />
            {pendingSyncCount} perubahan tertunda luring
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[110px]">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase">Pendidik</p>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{totalGurus} Guru</p>
          </div>
          <Users className="h-8 w-8 text-primary-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[110px]">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase">Siswa Aktif</p>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{totalSiswas} Siswa</p>
          </div>
          <GraduationCap className="h-8 w-8 text-success-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[110px]">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase">Rombel</p>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{totalKelass} Kelas</p>
          </div>
          <BookOpen className="h-8 w-8 text-warning-500" />
        </div>
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[110px]">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase">Mata Pelajaran</p>
            <p className="text-2xl font-bold text-neutral-800 mt-1">{totalMapels} Mapel</p>
          </div>
          <HelpCircle className="h-8 w-8 text-neutral-400" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1 */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card lg:col-span-2">
          <h3 className="text-sm font-bold text-neutral-800 mb-4">Tren Persentase Kehadiran Kelas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tanggal" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Hadir" stroke="#10b981" strokeWidth={3} />
                <Line type="monotone" dataKey="Izin" stroke="#3b82f6" />
                <Line type="monotone" dataKey="Sakit" stroke="#f59e0b" />
                <Line type="monotone" dataKey="Alpa" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card">
          <h3 className="text-sm font-bold text-neutral-800 mb-4">Status Cetak Rapor</h3>
          <div className="h-72 flex flex-col justify-between items-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={raporStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {raporStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs font-semibold text-neutral-600">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span> Draft
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span> Final
              </span>
            </div>
          </div>
        </div>

        {/* Chart 3 */}
        <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card lg:col-span-3">
          <h3 className="text-sm font-bold text-neutral-800 mb-4 font-sans">Beban Jam Pelajaran (JP) Pendidik Teratas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nama" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Beban JP" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
