/**
 * Exam Supervisor Repository - SIKAD v4.0
 * Local IndexedDB operations for exam supervisor scheduling
 */

import { db } from '@/database/dexie/schema';
import { queueOperation } from '@/services/sync/queueOperation';
import type { ExamSupervisor } from '@/types';

export interface SupervisorConflict {
  guruId: string;
  slotWaktu: string;
  shift: string;
  rooms: string[];
  examIds: string[];
}

export class ExamSupervisorRepository {
  /**
   * Get all exam supervisors
   */
  async getAll(): Promise<ExamSupervisor[]> {
    return await db.examSupervisors.toArray();
  }

  /**
   * Get supervisors by academic term
   */
  async getByAcademicTerm(academicTermId: string): Promise<ExamSupervisor[]> {
    return await db.examSupervisors
      .where('academic_term_id')
      .equals(academicTermId)
      .toArray();
  }

  /**
   * Get supervisors by room ID
   */
  async getByRoom(roomId: string): Promise<ExamSupervisor[]> {
    return await db.examSupervisors
      .where('room_id')
      .equals(roomId)
      .toArray();
  }

  /**
   * Get supervisors by teacher/guru ID
   */
  async getByTeacher(guruId: string): Promise<ExamSupervisor[]> {
    return await db.examSupervisors
      .where('guru_id')
      .equals(guruId)
      .toArray();
  }

  /**
   * Get supervisors by exam/assessment ID
   */
  async getByExam(examId: string): Promise<ExamSupervisor[]> {
    return await db.examSupervisors
      .where('exam_id')
      .equals(examId)
      .toArray();
  }

  /**
   * Get supervisor by teacher and time slot
   */
  async getByTeacherAndSlot(guruId: string, slotWaktu: string): Promise<ExamSupervisor[]> {
    return await db.examSupervisors
      .where('[guru_id+slot_waktu]')
      .equals([guruId, slotWaktu])
      .toArray();
  }

  /**
   * Create or update exam supervisor and queue for sync
   */
  async save(supervisor: ExamSupervisor): Promise<string> {
    const existing = await db.examSupervisors.get(supervisor.id);
    await db.examSupervisors.put(supervisor);
    const operation = existing ? 'UPDATE' : 'INSERT';
    await queueOperation('examSupervisors', supervisor.id, operation, supervisor as unknown as Record<string, unknown>);
    return supervisor.id;
  }

  /**
   * Save multiple exam supervisors and queue each for sync
   */
  async saveBulk(supervisors: ExamSupervisor[]): Promise<void> {
    await db.transaction('rw', [db.examSupervisors, db.syncQueue], async () => {
      for (const supervisor of supervisors) {
        await db.examSupervisors.put(supervisor);
        const existing = await db.examSupervisors.get(supervisor.id);
        const operation = existing ? 'UPDATE' : 'INSERT';
        await queueOperation('examSupervisors', supervisor.id, operation, supervisor as unknown as Record<string, unknown>);
      }
    });
  }

  /**
   * Delete exam supervisor and queue for sync
   */
  async delete(id: string): Promise<void> {
    await db.examSupervisors.delete(id);
    await queueOperation('examSupervisors', id, 'DELETE', { id });
  }

  /**
   * Delete all supervisors for a room (no queue — batch cleanup)
   */
  async deleteByRoom(roomId: string): Promise<void> {
    await db.examSupervisors.where('room_id').equals(roomId).delete();
  }

  /**
   * Clear all supervisors for an exam (no queue — batch cleanup)
   */
  async clearByExam(examId: string): Promise<void> {
    await db.examSupervisors.where('exam_id').equals(examId).delete();
  }

  /**
   * Check for scheduling conflicts
   * Returns supervisors who have overlapping assignments
   */
  async checkConflicts(academicTermId: string): Promise<SupervisorConflict[]> {
    const supervisors = await this.getByAcademicTerm(academicTermId);

    const slotMap = new Map<string, ExamSupervisor[]>();

    // Group by guru and slot
    supervisors.forEach(sup => {
      const key = `${sup.guru_id}-${sup.slot_waktu}-${sup.shift || 'ALL'}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, []);
      }
      slotMap.get(key)!.push(sup);
    });

    // Find conflicts (same guru assigned to multiple rooms at same slot)
    const conflicts: SupervisorConflict[] = [];

    supervisors.forEach(sup => {
      const sameTeacherSlot = supervisors.filter(
        s => s.guru_id === sup.guru_id &&
             s.slot_waktu === sup.slot_waktu &&
             (s.shift === sup.shift || (!s.shift && !sup.shift))
      );

      if (sameTeacherSlot.length > 1) {
        const existing = conflicts.find(
          c => c.guruId === sup.guru_id && c.slotWaktu === sup.slot_waktu
        );

        if (!existing) {
          conflicts.push({
            guruId: sup.guru_id,
            slotWaktu: sup.slot_waktu,
            shift: sup.shift || 'ALL',
            rooms: [...new Set(sameTeacherSlot.map(s => s.room_id).filter(Boolean) as string[])],
            examIds: [...new Set(sameTeacherSlot.map(s => s.exam_id || '').filter(Boolean))],
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Get available teachers for a specific slot
   * Teachers who are NOT assigned to any room at that slot
   */
  async getAvailableTeachers(
    academicTermId: string,
    slotWaktu: string,
    allTeachers: string[]
  ): Promise<string[]> {
    const assignedSupervisors = await this.getByAcademicTerm(academicTermId);
    const assignedInSlot = assignedSupervisors.filter(s => s.slot_waktu === slotWaktu);
    const assignedTeacherIds = new Set(assignedInSlot.map(s => s.guru_id));

    return allTeachers.filter(id => !assignedTeacherIds.has(id));
  }

  /**
   * Get supervisor schedule timeline
   */
  async getScheduleTimeline(academicTermId: string): Promise<Map<string, ExamSupervisor[]>> {
    const supervisors = await this.getByAcademicTerm(academicTermId);

    const timeline = new Map<string, ExamSupervisor[]>();

    supervisors.forEach(sup => {
      const key = `${sup.slot_waktu}-${sup.shift || 'ALL'}`;
      if (!timeline.has(key)) {
        timeline.set(key, []);
      }
      timeline.get(key)!.push(sup);
    });

    return timeline;
  }
}

export const examSupervisorRepository = new ExamSupervisorRepository();
