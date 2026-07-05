import { RouteObject } from 'react-router-dom';
import GuruPage from '@/modules/guru/pages/GuruPage';

export const guruRoutes: RouteObject[] = [
  {
    path: 'guru',
    element: <GuruPage />
  }
];
