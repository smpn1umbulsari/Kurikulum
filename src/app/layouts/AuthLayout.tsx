import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-card shadow-modal border border-neutral-200 p-8 space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
