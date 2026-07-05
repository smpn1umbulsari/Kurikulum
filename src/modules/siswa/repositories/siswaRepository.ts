/**
 * SiswaRepository - SIKAD v4.0
 * Offline-first repository for Siswa master data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { Siswa } from '@/types';

export class SiswaRepository extends BaseRepository<Siswa> {
  constructor() {
    super(db.siswas, 'siswas');
  }
}

export const siswaRepository = new SiswaRepository();
