/**
 * useAssessment - SIKAD v4.0
 * TanStack Query hooks for managing assessments and grades offline-first
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentRepository } from '../repositories/assessmentRepository';
import { assessmentDetailRepository } from '../repositories/assessmentDetailRepository';
import { assessmentService } from '../services/assessmentService';
import { SyncManager } from '../../../services/sync/SyncManager';
import type { Assessment, AssessmentDetail } from '@/types';

export function useAssessments() {
  return useQuery<Assessment[]>({
    queryKey: ['assessments'],
    queryFn: async () => {
      let local = await assessmentRepository.getAll();

      if (local.length === 0) {
        try {
          await assessmentService.syncAssessments();
          local = await assessmentRepository.getAll();
        } catch (error) {
          console.error('[useAssessments] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
  });
}

export function useAssessmentDetails(assessmentId: string) {
  return useQuery<AssessmentDetail[]>({
    queryKey: ['assessmentDetails', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      let local = await assessmentDetailRepository.getByAssessment(assessmentId);

      if (local.length === 0) {
        try {
          await assessmentService.syncAssessmentDetails(assessmentId);
          local = await assessmentDetailRepository.getByAssessment(assessmentId);
        } catch (error) {
          console.error('[useAssessmentDetails] Sync error, falling back to local database:', error);
        }
      }

      return local;
    },
    enabled: !!assessmentId,
  });
}

export function useSaveAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: Assessment) => {
      await assessmentRepository.save(assessment);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

export function useSaveGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ grades }: { assessmentId: string; grades: AssessmentDetail[] }) => {
      await assessmentDetailRepository.saveBulk(grades);
      SyncManager.triggerSync();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assessmentDetails', variables.assessmentId] });
    },
  });
}
