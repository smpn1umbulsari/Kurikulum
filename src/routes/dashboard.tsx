import { RouteObject } from 'react-router-dom';
import DashboardPage from '@/modules/dashboard-kurikulum/pages/DashboardPage';

export const dashboardRoutes: RouteObject[] = [
  {
    index: true,
    element: <DashboardPage />
  }
];
