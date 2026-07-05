import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type AuthState } from '../../../store/authStore';

import { authService } from '../../auth/services/authService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state: AuthState) => state.setSession);
  const setPermissions = useAuthStore((state: AuthState) => state.setPermissions);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Login with username - @spenturi suffix added automatically
      const { session } = await authService.login(username, password);
      
      if (!session) {
        throw new Error('Tidak ada sesi yang dikembalikan dari server');
      }

      setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || Date.now() + 3600000,
        user: {
          id: session.user.id,
          email: session.user.email || `${username}@spenturi`,
          role: session.user.user_metadata?.role_kode || 'SUPERADMIN',
          name: session.user.user_metadata?.full_name || username,
          created_at: session.user.created_at || new Date().toISOString(),
        } as any,
      });
    setPermissions([
      'guru:create', 'guru:read', 'guru:update', 'guru:delete',
      'siswa:create', 'siswa:read', 'siswa:update', 'siswa:delete',
      'assessment:create', 'assessment:read', 'assessment:update', 'assessment:delete',
      'attendance:create', 'attendance:read', 'attendance:update',
      'rapor:read', 'rapor:write'
    ]);
    navigate('/');
    } catch (error: any) {
      alert(`Gagal login: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-800">Login SIKAD v4.0</h2>
        <p className="mt-2 text-sm text-neutral-600">Sistem Informasi Kurikulum & Akademik</p>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="block w-full px-4 py-3 border border-neutral-300 rounded-medium shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          placeholder="superadmin"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full px-4 py-3 border border-neutral-300 rounded-medium shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
