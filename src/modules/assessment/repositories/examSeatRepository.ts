/**
 * Exam Seat Repository - SIKAD v4.0
 * Local IndexedDB operations for exam seat assignment
 */

import { db } from '@/database/dexie/schema';
import { queueOperation } from '@/services/sync/queueOperation';
import type { ExamSeat } from '@/types';

export class ExamSeatRepository {
  /**
   * Get all exam seats
   */
  async getAll(): Promise<ExamSeat[]> {
    return await db.examSeats.toArray();
  }

  /**
   * Get seats by room ID
   */
  async getByRoom(roomId: string): Promise<ExamSeat[]> {
    return await db.examSeats
      .where('room_id')
      .equals(roomId)
      .sortBy('nomor_kursi');
  }

  /**
   * Get seats by exam/assessment ID
   */
  async getByExam(examId: string): Promise<ExamSeat[]> {
    return await db.examSeats
      .where('exam_id')
      .equals(examId)
      .toArray();
  }

  /**
   * Get seats by student ID
   */
  async getByStudent(siswaId: string): Promise<ExamSeat[]> {
    return await db.examSeats
      .where('siswa_id')
      .equals(siswaId)
      .toArray();
  }

  /**
   * Get seat by room and seat number
   */
  async getByRoomAndSeat(roomId: string, seatNumber: number): Promise<ExamSeat | undefined> {
    const seats = await db.examSeats
      .where('[room_id+nomor_kursi]')
      .equals([roomId, seatNumber])
      .first();
    return seats;
  }

  /**
   * Get seat by room and student
   */
  async getByRoomAndStudent(roomId: string, siswaId: string): Promise<ExamSeat | undefined> {
    const seats = await db.examSeats
      .where('[room_id+siswa_id]')
      .equals([roomId, siswaId])
      .first();
    return seats;
  }

  /**
   * Create or update exam seat and queue for sync
   */
  async save(seat: ExamSeat): Promise<string> {
    const existing = await db.examSeats.get(seat.id);
    await db.examSeats.put(seat);
    const operation = existing ? 'UPDATE' : 'INSERT';
    await queueOperation('examSeats', seat.id, operation, seat as unknown as Record<string, unknown>);
    return seat.id;
  }

  /**
   * Save multiple exam seats and queue each for sync
   */
  async saveBulk(seats: ExamSeat[]): Promise<void> {
    await db.transaction('rw', [db.examSeats, db.syncQueue], async () => {
      for (const seat of seats) {
        await db.examSeats.put(seat);
        const existing = await db.examSeats.get(seat.id);
        const operation = existing ? 'UPDATE' : 'INSERT';
        await queueOperation('examSeats', seat.id, operation, seat as unknown as Record<string, unknown>);
      }
    });
  }

  /**
   * Delete exam seat and queue for sync
   */
  async delete(id: string): Promise<void> {
    await db.examSeats.delete(id);
    await queueOperation('examSeats', id, 'DELETE', { id });
  }

  /**
   * Delete all seats in a room (no queue — batch cleanup)
   */
  async deleteByRoom(roomId: string): Promise<void> {
    await db.examSeats.where('room_id').equals(roomId).delete();
  }

  /**
   * Clear all seats for an exam (no queue — batch cleanup)
   */
  async clearByExam(examId: string): Promise<void> {
    await db.examSeats.where('exam_id').equals(examId).delete();
  }

  /**
   * Get seat count in a room
   */
  async getSeatCount(roomId: string): Promise<number> {
    return await db.examSeats.where('room_id').equals(roomId).count();
  }

  /**
   * Get assigned seats in a room
   */
  async getAssignedSeats(roomId: string): Promise<ExamSeat[]> {
    return await db.examSeats
      .where('room_id')
      .equals(roomId)
      .filter(seat => !!seat.siswa_id)
      .toArray();
  }

  /**
   * Auto-generate seat layout for a room
   */
  async generateSeats(roomId: string, capacity: number): Promise<ExamSeat[]> {
    const existingSeats = await this.getByRoom(roomId);
    const existingNumbers = new Set(existingSeats.map(s => s.nomor_kursi));

    const seats: ExamSeat[] = [];
    for (let i = 1; i <= capacity; i++) {
      if (!existingNumbers.has(i)) {
        seats.push({
          id: crypto.randomUUID(),
          room_id: roomId,
          siswa_id: '',
          nomor_kursi: i,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (seats.length > 0) {
      await this.saveBulk(seats);
    }

    return seats;
  }
}

export const examSeatRepository = new ExamSeatRepository();
