/**
 * useExamRoom - SIKAD v4.0
 * TanStack Query hooks for exam room management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examRoomRepository } from '../repositories/examRoomRepository';
import { examSeatRepository } from '../repositories/examSeatRepository';
import type { ExamRoom, ExamSeat } from '@/types';

// ============ EXAM ROOM HOOKS ============

export function useExamRooms() {
  return useQuery<ExamRoom[]>({
    queryKey: ['examRooms'],
    queryFn: () => examRoomRepository.getAll(),
  });
}

export function useExamRoomsByTerm(academicTermId: string) {
  return useQuery<ExamRoom[]>({
    queryKey: ['examRooms', academicTermId],
    queryFn: () => examRoomRepository.getByAcademicTerm(academicTermId),
    enabled: !!academicTermId,
  });
}

export function useActiveExamRooms(academicTermId: string) {
  return useQuery<ExamRoom[]>({
    queryKey: ['examRooms', academicTermId, 'active'],
    queryFn: () => examRoomRepository.getActiveByAcademicTerm(academicTermId),
    enabled: !!academicTermId,
  });
}

export function useExamRoom(id: string) {
  return useQuery<ExamRoom | undefined>({
    queryKey: ['examRoom', id],
    queryFn: () => examRoomRepository.getById(id),
    enabled: !!id,
  });
}

export function useSaveExamRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (room: ExamRoom) => {
      return examRoomRepository.save(room);
    },
    onSuccess: (_, room) => {
      queryClient.invalidateQueries({ queryKey: ['examRooms'] });
      queryClient.invalidateQueries({ queryKey: ['examRoom', room.id] });
    },
  });
}

export function useDeleteExamRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await examSeatRepository.deleteByRoom(id);
      return examRoomRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examRooms'] });
    },
  });
}

// ============ EXAM SEAT HOOKS ============

export function useExamSeatsByRoom(roomId: string) {
  return useQuery<ExamSeat[]>({
    queryKey: ['examSeats', roomId],
    queryFn: () => examSeatRepository.getByRoom(roomId),
    enabled: !!roomId,
  });
}

export function useExamSeatsByExam(examId: string) {
  return useQuery<ExamSeat[]>({
    queryKey: ['examSeats', 'exam', examId],
    queryFn: () => examSeatRepository.getByExam(examId),
    enabled: !!examId,
  });
}

export function useExamSeatsByStudent(siswaId: string) {
  return useQuery<ExamSeat[]>({
    queryKey: ['examSeats', 'student', siswaId],
    queryFn: () => examSeatRepository.getByStudent(siswaId),
    enabled: !!siswaId,
  });
}

export function useSaveExamSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seat: ExamSeat) => {
      return examSeatRepository.save(seat);
    },
    onSuccess: (_, seat) => {
      queryClient.invalidateQueries({ queryKey: ['examSeats', seat.room_id] });
      if (seat.exam_id) {
        queryClient.invalidateQueries({ queryKey: ['examSeats', 'exam', seat.exam_id] });
      }
    },
  });
}

export function useSaveBulkExamSeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seats: ExamSeat[]) => {
      return examSeatRepository.saveBulk(seats);
    },
    onSuccess: (_, seats) => {
      const roomIds = [...new Set(seats.map(s => s.room_id))];
      roomIds.forEach(roomId => {
        queryClient.invalidateQueries({ queryKey: ['examSeats', roomId] });
      });
    },
  });
}

export function useAssignStudentToSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      seatNumber,
      siswaId,
      examId
    }: {
      roomId: string;
      seatNumber: number;
      siswaId: string;
      examId?: string;
    }) => {
      // Remove student from any existing seat in this room/exam
      if (examId) {
        const existingSeats = await examSeatRepository.getByExam(examId);
        const existingForStudent = existingSeats.filter(s => s.siswa_id === siswaId);
        for (const seat of existingForStudent) {
          seat.siswa_id = '';
          await examSeatRepository.save(seat);
        }
      }

      // Assign to new seat
      let seat = await examSeatRepository.getByRoomAndSeat(roomId, seatNumber);
      if (!seat) {
        seat = {
          id: crypto.randomUUID(),
          room_id: roomId,
          siswa_id: siswaId,
          exam_id: examId,
          nomor_kursi: seatNumber,
          created_at: new Date().toISOString(),
        };
      } else {
        seat.siswa_id = siswaId;
        if (examId) seat.exam_id = examId;
      }

      return examSeatRepository.save(seat);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['examSeats', variables.roomId] });
    },
  });
}

export function useGenerateRoomSeats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, capacity }: { roomId: string; capacity: number }) => {
      return examSeatRepository.generateSeats(roomId, capacity);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['examSeats', variables.roomId] });
    },
  });
}

// ============ CAPACITY HELPERS ============

export function useTotalExamCapacity(academicTermId: string) {
  return useQuery<number>({
    queryKey: ['examRooms', academicTermId, 'totalCapacity'],
    queryFn: () => examRoomRepository.getTotalCapacity(academicTermId),
    enabled: !!academicTermId,
  });
}
