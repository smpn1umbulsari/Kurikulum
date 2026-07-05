import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from '@/routes/public';
import { protectedRoutes } from '@/routes/protected';

export const router = createBrowserRouter([
  ...publicRoutes,
  ...protectedRoutes
]);
