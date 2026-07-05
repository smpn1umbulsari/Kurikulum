import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, type AuthState } from '../../store/authStore';
import { useSyncStore, type SyncState } from '../../store/syncStore';
import { useAppStore, type AppState } from '../../store/appStore';
import { academicTermRepository } from '../../modules/academic-term/repositories/academicTermRepository';
import { SyncToolbar } from '../../components/sync/SyncToolbar';
import { LogOut, Database, User, Shield, Compass, BookOpen, Award, Calendar, CalendarDays, BookMarked, School, BookOpenCheck, TrendingUp, GraduationCap, Archive, Activity, Terminal, Menu, X, Type, Eye } from 'lucide-react';

export default function MainLayout() {
  const user = useAuthStore((state: AuthState) => state.user);
  const logout = useAuthStore((state: AuthState) => state.logout);
  const pendingCount = useSyncStore((state: SyncState) => state.pendingCount);
  const isOnline = useSyncStore((state: SyncState) => state.isOnline);
  const currentAcademicTerm = useAppStore((state: AppState) => state.currentAcademicTerm);
  const setCurrentAcademicTerm = useAppStore((state: AppState) => state.setCurrentAcademicTerm);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Elderly accessibility states
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Load active academic term if not set
  useEffect(() => {
    if (!currentAcademicTerm) {
      academicTermRepository.getActiveTerm()
        .then((active) => {
          if (active) {
            setCurrentAcademicTerm(active);
          }
        })
        .catch((err) => console.error('Failed to load active term in layout:', err));
    }
  }, [currentAcademicTerm, setCurrentAcademicTerm]);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  // Helper to determine page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/guru')) return 'Data Guru';
    if (path.startsWith('/siswa')) return 'Data Siswa';
    if (path.startsWith('/kelas')) return 'Manajemen Kelas';
    if (path.startsWith('/pembagian-mengajar')) return 'Pembagian Jam Mengajar';
    if (path.startsWith('/promotion')) return 'Kenaikan Kelas';
    if (path.startsWith('/graduation')) return 'Kelulusan Siswa';
    if (path.startsWith('/archive')) return 'Arsip & Ekspor';
    if (path.startsWith('/dashboard-kepsek')) return 'Dashboard Kepala Sekolah';
    if (path.startsWith('/monitoring')) return 'Pusat Pemantauan & Konflik';
    if (path.startsWith('/assessment')) return 'Asesmen & Penilaian';
    if (path.startsWith('/rapor')) return 'Rapor Semester';
    if (path.startsWith('/academic-term')) return 'Tahun Ajaran';
    if (path.startsWith('/calendar')) return 'Kalender Pendidikan';
    if (path.startsWith('/mapel')) return 'Mata Pelajaran';
    return 'SIKAD v4.0';
  };

  // Menu sections: Umum, Master Sekolah, Data Akademik, Kurikulum, Arsip & Pengaturan
  const renderNavLink = (to: string, icon: React.ReactNode, label: string) => {
    const isActive = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        onClick={() => setMobileSidebarOpen(false)}
        className={`flex items-center px-4 py-2.5 rounded-lg font-medium active:scale-[0.98] transition-[transform,background-color,color] duration-150 ease-out ${
          isActive
            ? 'bg-primary-100 text-primary-700 font-semibold'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
        }`}
      >
        <span className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-neutral-400'}`}>{icon}</span>
        {label}
      </Link>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 pl-4 pt-4 pb-1 mt-2 first:mt-0">
      {title}
    </div>
  );

  const navLinks = (
    <>
      {/* ==================== SECTION 1: UMUM ==================== */}
      <SectionHeader title="Umum" />

      {renderNavLink("/", <Compass className="h-5 w-5" />, "Dashboard")}
      {renderNavLink("/calendar", <CalendarDays className="h-5 w-5" />, "Kalender & Jadwal")}
      {renderNavLink("/dashboard-kepsek", <Activity className="h-5 w-5" />, "Dashboard Kepsek")}

      {/* ==================== SECTION 2: MASTER SEKOLAH ==================== */}
      <SectionHeader title="Master Sekolah" />

      {renderNavLink("/guru", <User className="h-5 w-5" />, "Data Guru")}
      {renderNavLink("/siswa", <Shield className="h-5 w-5" />, "Data Siswa")}
      {renderNavLink("/mapel", <BookMarked className="h-5 w-5" />, "Mata Pelajaran")}

      {/* ==================== SECTION 3: DATA AKADEMIK ==================== */}
      <SectionHeader title="Data Akademik" />

      {renderNavLink("/academic-term", <Calendar className="h-5 w-5" />, "Tahun Ajaran")}
      {renderNavLink("/kelas", <School className="h-5 w-5" />, "Kelas & Rombel")}
      {renderNavLink("/pembagian-mengajar", <BookOpenCheck className="h-5 w-5" />, "Pembagian Mengajar")}
      {renderNavLink("/promotion", <TrendingUp className="h-5 w-5" />, "Kenaikan Kelas")}
      {renderNavLink("/graduation", <GraduationCap className="h-5 w-5" />, "Kelulusan")}

      {/* ==================== SECTION 4: KURIKULUM ==================== */}
      <SectionHeader title="Kurikulum" />

      {renderNavLink("/assessment", <BookOpen className="h-5 w-5" />, "Asesmen & Penilaian")}
      {renderNavLink("/rapor", <Award className="h-5 w-5" />, "Rapor Semester")}

      {/* ==================== SECTION 5: ARSIP & PENGATURAN ==================== */}
      <SectionHeader title="Arsip & Pengaturan" />

      {renderNavLink("/archive", <Archive className="h-5 w-5" />, "Arsip & Ekspor Data")}
      {renderNavLink("/monitoring", <Terminal className="h-5 w-5" />, "Pusat Monitoring")}
    </>
  );

  return (
    <div className={`flex h-screen overflow-hidden ${largeText ? 'text-lg' : 'text-sm'} ${highContrast ? 'bg-black text-yellow-400 contrast-125' : 'bg-neutral-50 text-neutral-800'}`}>
      
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden bg-black bg-opacity-50">
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex flex-shrink-0 items-center px-6">
              <span className="text-xl font-bold text-primary-600">SIKAD v4.0</span>
            </div>
            <div className="mt-5 h-0 flex-1 overflow-y-auto">
              <nav className="space-y-1 px-4">{navLinks}</nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0 w-64 flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center px-6 border-b border-neutral-200">
          <span className="text-xl font-bold text-primary-600 font-sans">SIKAD v4.0</span>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 space-y-1 px-4">{navLinks}</nav>
        </div>
        <div className="flex flex-shrink-0 border-t border-neutral-200 p-4 bg-neutral-50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-xs font-semibold text-neutral-800">{(user?.name || 'User').split('@')[0]}</p>
                <p className="text-[10px] text-neutral-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-neutral-500 hover:text-red-600 transition-[transform,colors] duration-150 ease-out active:scale-90">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header toolbar */}
        <header className="app-panel--toolbar flex h-16 items-center justify-between px-6 border-b border-neutral-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-neutral-500 hover:text-neutral-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-base font-bold text-neutral-800 font-sans">{getPageTitle()}</h1>
          </div>

          {/* Sync & Active Term display */}
          <div className="flex items-center space-x-4">
            
            {/* Elderly Accessibility buttons */}
            <div className="flex items-center gap-1 border-r border-neutral-200 pr-4">
              <button
                onClick={() => setLargeText(!largeText)}
                title="Perbesar Teks"
                className={`p-2 rounded hover:bg-neutral-100 transition-[transform,colors] duration-150 ease-out active:scale-90 ${largeText ? 'bg-primary-100 text-primary-600' : 'text-neutral-500'}`}
              >
                <Type className="h-4 w-4" />
              </button>
              <button
                onClick={() => setHighContrast(!highContrast)}
                title="Kontras Tinggi"
                className={`p-2 rounded hover:bg-neutral-100 transition-[transform,colors] duration-150 ease-out active:scale-90 ${highContrast ? 'bg-yellow-100 text-yellow-800' : 'text-neutral-500'}`} /* impeccable-disable-line gray-on-color */
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            {/* Active Term Indicator */}
            {currentAcademicTerm ? (
              <div className="hidden sm:flex items-center space-x-2 text-[10px] font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-medium">
                <Calendar className="h-3.5 w-3.5 text-primary-500" />
                <span>Semester: {currentAcademicTerm.tahun_ajaran} - {currentAcademicTerm.semester}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2 text-[10px] font-semibold text-neutral-500 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-medium">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <span>Tahun Ajaran Tidak Aktif</span>
              </div>
            )}

            {/* Manual sync controls */}
            <SyncToolbar />

            {/* Sync status */}
            <div className="flex items-center space-x-2 text-neutral-500">
              <Database className={`h-4 w-4 ${isOnline ? 'text-green-500' : 'text-neutral-400'}`} />
              <span className="text-[10px] font-medium hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
              {pendingCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content body */}
        <main className={`flex-1 overflow-y-auto p-6 focus:outline-none ${highContrast ? 'bg-black' : 'bg-neutral-50'}`}>
          <div className="w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
