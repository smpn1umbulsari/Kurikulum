/**
 * CustomAuthService - SIKAD v4.0
 * Handles authentication using custom username/password
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { BaseService } from '../../../services/baseService';

export interface CustomLoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    email: string | null;
    role: string;
    role_name: string;
  };
}

export class CustomAuthService extends BaseService {
  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<CustomLoginResponse> {
    const { data, error } = await supabase.functions.invoke('custom-login', {
      method: 'POST',
      body: { username, password },
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Login failed');
    }

    // Store token and user in localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    return data;
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): CustomLoginResponse['user'] | null {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get stored token
   */
  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Logout - clear stored credentials
   */
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    if (!token) return false;

    // Check token expiration
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Check user role
   */
  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.role === role;
  }

  /**
   * Check if user is superadmin
   */
  isSuperAdmin(): boolean {
    return this.hasRole('SUPERADMIN');
  }
}

export const customAuthService = new CustomAuthService();
