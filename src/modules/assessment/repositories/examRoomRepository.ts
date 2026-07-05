/**
 * Exam Room Repository - SIKAD v4.0
 * Local IndexedDB operations for exam room management
 */

import { db } from '@/database/dexie/schema';
import { queueOperation } from '@/services/sync/queueOperation';
import type { ExamRoom } from '@/types';

export class ExamRoomRepository {
  /**
   * Get all exam rooms
   */
  async getAll(): Promise<ExamRoom[]> {
    return await db.examRooms.toArray();
  }

  /**
   * Get exam rooms by academic term
   */
  async getByAcademicTerm(academicTermId: string): Promise<ExamRoom[]> {
    return await db.examRooms
      .where('academic_term_id')
      .equals(academicTermId)
      .toArray();
  }

  /**
   * Get active exam rooms by academic term
   */
  async getActiveByAcademicTerm(academicTermId: string): Promise<ExamRoom[]> {
    return await db.examRooms
      .where('academic_term_id')
      .equals(academicTermId)
      .filter(room => room.is_active)
      .toArray();
  }

  /**
   * Get single exam room by ID
   */
  async getById(id: string): Promise<ExamRoom | undefined> {
    return await db.examRooms.get(id);
  }

  /**
   * Create or update exam room and queue for sync
   */
  async save(room: ExamRoom): Promise<string> {
    const existing = await db.examRooms.get(room.id);
    room.updated_at = new Date().toISOString();
    await db.examRooms.put(room);
    const operation = existing ? 'UPDATE' : 'INSERT';
    await queueOperation('examRooms', room.id, operation, room as unknown as Record<string, unknown>);
    return room.id;
  }

  /**
   * Save multiple exam rooms and queue each for sync
   */
  async saveBulk(rooms: ExamRoom[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const roomsWithTimestamp = rooms.map(room => ({
      ...room,
      updated_at: timestamp,
    }));

    await db.transaction('rw', [db.examRooms, db.syncQueue], async () => {
      for (const room of roomsWithTimestamp) {
        await db.examRooms.put(room);
        const existing = await db.examRooms.get(room.id);
        const operation = existing ? 'UPDATE' : 'INSERT';
        await queueOperation('examRooms', room.id, operation, room as unknown as Record<string, unknown>);
      }
    });
  }

  /**
   * Delete exam room and queue for sync
   */
  async delete(id: string): Promise<void> {
    await db.examRooms.delete(id);
    await queueOperation('examRooms', id, 'DELETE', { id });
  }

  /**
   * Get total capacity by academic term
   */
  async getTotalCapacity(academicTermId: string): Promise<number> {
    const rooms = await this.getActiveByAcademicTerm(academicTermId);
    return rooms.reduce((sum, room) => sum + room.kapasitas, 0);
  }

  /**
   * Search rooms by name
   */
  async searchByName(academicTermId: string, query: string): Promise<ExamRoom[]> {
    const rooms = await this.getByAcademicTerm(academicTermId);
    const lowerQuery = query.toLowerCase();
    return rooms.filter(room =>
      room.nama_ruang.toLowerCase().includes(lowerQuery) ||
      room.lokasi?.toLowerCase().includes(lowerQuery)
    );
  }
}

export const examRoomRepository = new ExamRoomRepository();
