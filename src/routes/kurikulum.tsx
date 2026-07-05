import { RouteObject } from 'react-router-dom';
import SiswaPage from '@/modules/siswa/pages/SiswaPage';
import AssessmentPage from '@/modules/assessment/pages/AssessmentPage';
import RoomManagementPage from '@/modules/assessment/pages/RoomManagementPage';
import SupervisorSchedulePage from '@/modules/assessment/pages/SupervisorSchedulePage';
import ExamPrintPage from '@/modules/assessment/pages/ExamPrintPage';
import RaporPage from '@/modules/rapor/pages/RaporPage';
import AcademicTermPage from '@/modules/academic-term/pages/AcademicTermPage';
import CalendarPage from '@/modules/calendar/pages/CalendarPage';
import MataPelajaranPage from '@/modules/settings/pages/MataPelajaranPage';
import KelasPage from '@/modules/kelas/pages/KelasPage';
import PembagianMengajarPage from '@/modules/kelas/pages/PembagianMengajarPage';
import PromotionPage from '@/modules/kelas/pages/PromotionPage';
import GraduationPage from '@/modules/kelas/pages/GraduationPage';
import ArchivePage from '@/modules/settings/pages/ArchivePage';
import KepsekDashboardPage from '@/modules/dashboard-kepsek/pages/KepsekDashboardPage';
import MonitoringCenterPage from '@/modules/settings/pages/MonitoringCenterPage';

export const kurikulumRoutes: RouteObject[] = [
  {
    path: 'siswa',
    element: <SiswaPage />
  },
  {
    path: 'kelas',
    element: <KelasPage />
  },
  {
    path: 'pembagian-mengajar',
    element: <PembagianMengajarPage />
  },
  {
    path: 'promotion',
    element: <PromotionPage />
  },
  {
    path: 'graduation',
    element: <GraduationPage />
  },
  {
    path: 'assessment',
    element: <AssessmentPage />
  },
  {
    path: 'assessment/rooms',
    element: <RoomManagementPage />
  },
  {
    path: 'assessment/supervisors',
    element: <SupervisorSchedulePage />
  },
  {
    path: 'assessment/print',
    element: <ExamPrintPage />
  },
  {
    path: 'rapor',
    element: <RaporPage />
  },
  {
    path: 'academic-term',
    element: <AcademicTermPage />
  },
  {
    path: 'calendar',
    element: <CalendarPage />
  },
  {
    path: 'mapel',
    element: <MataPelajaranPage />
  },
  {
    path: 'archive',
    element: <ArchivePage />
  },
  {
    path: 'dashboard-kepsek',
    element: <KepsekDashboardPage />
  },
  {
    path: 'monitoring',
    element: <MonitoringCenterPage />
  }
];
