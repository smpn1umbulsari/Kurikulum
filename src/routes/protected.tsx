import { RouteObject, Navigate } from 'react-router-dom';
import MainLayout from '@/app/layouts/MainLayout';
import { useAuthStore, type AuthState } from '../store/authStore';
import { dashboardRoutes } from './dashboard';
import { guruRoutes } from './guru';
import { kurikulumRoutes } from './kurikulum';
import { adminRoutes } from './admin';

// Guard wrapper component
function ProtectedGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <>{children}</>;
}

export const protectedRoutes: RouteObject[] = [
  {
    path: '/',
    element: (
      <ProtectedGuard>
        <MainLayout />
      </ProtectedGuard>
    ),
    children: [
      ...dashboardRoutes,
      ...guruRoutes,
      ...kurikulumRoutes,
      ...adminRoutes,
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
];
