/**
 * AuthService - SIKAD v4.0
 * Handles authentication using Supabase Auth
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { BaseService } from '../../../services/baseService';
import type { User } from '@/types';

export class AuthService extends BaseService {
  /**
   * Login with username and password
   * Automatically adds @spenturi suffix to username for Supabase Auth
   */
  async login(usernameOrEmail: string, password: string) {
    // Add @spenturi suffix if not already present
    const email = usernameOrEmail.includes('@') 
      ? usernameOrEmail 
      : `${usernameOrEmail}@spenturi`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, userData: Partial<User>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    if (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Logout current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Session error: ${error.message}`);
    }
    return data.session;
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userData: Partial<User>) {
    const { data, error } = await supabase.auth.updateUser({
      data: userData,
    });

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }

    return data;
  }
}

export const authService = new AuthService();
