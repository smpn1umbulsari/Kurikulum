/**
 * GuruRepository - SIKAD v4.0
 * Offline-first repository for Guru master data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { Guru } from '@/types';

export class GuruRepository extends BaseRepository<Guru> {
  constructor() {
    super(db.gurus, 'gurus');
  }
}

export const guruRepository = new GuruRepository();
