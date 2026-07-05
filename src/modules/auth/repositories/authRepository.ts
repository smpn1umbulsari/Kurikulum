/**
 * AuthRepository - SIKAD v4.0
 * Offline-first repository for authentication session caching
 */

import { db } from '../../../database/dexie/schema';
import { BaseRepository } from '../../../database/repositories/baseRepository';
import { queueOperation } from '@/services/sync/queueOperation';

// Local user profile cache type
interface LocalUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

export class AuthRepository extends BaseRepository<LocalUserProfile> {
  constructor() {
    super(db.table('userProfiles'), 'user_profiles');
  }

  /**
   * Get user profile from local cache
   */
  async getProfile(userId: string): Promise<LocalUserProfile | undefined> {
    const profiles = await this.table.toArray();
    return profiles.find((p) => p.id === userId);
  }

  /**
   * Save user profile to local cache and queue for sync
   */
  async saveProfile(profile: LocalUserProfile): Promise<void> {
    const existing = await this.table.get(profile.id);
    await this.table.put(profile);
    const operation = existing ? 'UPDATE' : 'INSERT';
    await queueOperation('userProfiles', profile.id, operation, profile as unknown as Record<string, unknown>);
  }

  /**
   * Clear user profile from local cache and queue for sync
   */
  async clearProfile(userId: string): Promise<void> {
    await this.table.delete(userId);
    await queueOperation('userProfiles', userId, 'DELETE', { id: userId });
  }
}

export const authRepository = new AuthRepository();
