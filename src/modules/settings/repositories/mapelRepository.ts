/**
 * MapelRepository - SIKAD v4.0
 * Offline-first repository for MataPelajaran master data access
 */

import { BaseRepository } from '../../../database/repositories/baseRepository';
import { db } from '../../../database/dexie/schema';
import type { MataPelajaran } from '@/types';

export class MapelRepository extends BaseRepository<MataPelajaran> {
  constructor() {
    super(db.mataPelajarans, 'mata_pelajarans');
  }
}

export const mapelRepository = new MapelRepository();
