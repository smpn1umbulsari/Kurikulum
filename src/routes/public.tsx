import { RouteObject, Navigate } from 'react-router-dom';
import AuthLayout from '@/app/layouts/AuthLayout';
import LoginPage from '@/modules/auth/pages/LoginPage';

export const publicRoutes: RouteObject[] = [
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: '', element: <Navigate to="/auth/login" replace /> }
    ]
  }
];
