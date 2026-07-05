import { RouteObject } from 'react-router-dom';

export const adminRoutes: RouteObject[] = [
  {
    path: 'admin',
    element: (
      <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card space-y-4">
        <h2 className="text-2xl font-bold text-neutral-800">Sistem Administrasi</h2>
        <p className="text-neutral-600">Modul ini hanya dapat diakses oleh SUPER_ADMIN dan ADMIN untuk mengelola pengguna, sinkronisasi, dan sistem audit.</p>
      </div>
    )
  }
];
