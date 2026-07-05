/**
 * useExamSupervisor - SIKAD v4.0
 * TanStack Query hooks for exam supervisor scheduling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examSupervisorRepository, type SupervisorConflict } from '../repositories/examSupervisorRepository';
import type { ExamSupervisor } from '@/types';

// ============ SUPERVISOR HOOKS ============

export function useExamSupervisors() {
  return useQuery<ExamSupervisor[]>({
    queryKey: ['examSupervisors'],
    queryFn: () => examSupervisorRepository.getAll(),
  });
}

export function useExamSupervisorsByTerm(academicTermId: string) {
  return useQuery<ExamSupervisor[]>({
    queryKey: ['examSupervisors', academicTermId],
    queryFn: () => examSupervisorRepository.getByAcademicTerm(academicTermId),
    enabled: !!academicTermId,
  });
}

export function useExamSupervisorsByRoom(roomId: string) {
  return useQuery<ExamSupervisor[]>({
    queryKey: ['examSupervisors', 'room', roomId],
    queryFn: () => examSupervisorRepository.getByRoom(roomId),
    enabled: !!roomId,
  });
}

export function useExamSupervisorsByTeacher(guruId: string) {
  return useQuery<ExamSupervisor[]>({
    queryKey: ['examSupervisors', 'teacher', guruId],
    queryFn: () => examSupervisorRepository.getByTeacher(guruId),
    enabled: !!guruId,
  });
}

export function useExamSupervisorsByExam(examId: string) {
  return useQuery<ExamSupervisor[]>({
    queryKey: ['examSupervisors', 'exam', examId],
    queryFn: () => examSupervisorRepository.getByExam(examId),
    enabled: !!examId,
  });
}

export function useSaveExamSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supervisor: ExamSupervisor) => {
      return examSupervisorRepository.save(supervisor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSupervisors'] });
    },
  });
}

export function useSaveBulkExamSupervisors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supervisors: ExamSupervisor[]) => {
      return examSupervisorRepository.saveBulk(supervisors);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSupervisors'] });
    },
  });
}

export function useDeleteExamSupervisor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return examSupervisorRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSupervisors'] });
    },
  });
}

// ============ CONFLICT DETECTION ============

export function useSupervisorConflicts(academicTermId: string) {
  return useQuery<SupervisorConflict[]>({
    queryKey: ['examSupervisors', academicTermId, 'conflicts'],
    queryFn: () => examSupervisorRepository.checkConflicts(academicTermId),
    enabled: !!academicTermId,
  });
}

// ============ AVAILABILITY ============

export function useAvailableTeachers(
  academicTermId: string,
  slotWaktu: string,
  allTeacherIds: string[]
) {
  return useQuery<string[]>({
    queryKey: ['examSupervisors', academicTermId, 'available', slotWaktu],
    queryFn: () => examSupervisorRepository.getAvailableTeachers(academicTermId, slotWaktu, allTeacherIds),
    enabled: !!academicTermId && !!slotWaktu && allTeacherIds.length > 0,
  });
}

// ============ SCHEDULE TIMELINE ============

export function useSupervisorScheduleTimeline(academicTermId: string) {
  return useQuery<Map<string, ExamSupervisor[]>>({
    queryKey: ['examSupervisors', academicTermId, 'timeline'],
    queryFn: () => examSupervisorRepository.getScheduleTimeline(academicTermId),
    enabled: !!academicTermId,
  });
}
