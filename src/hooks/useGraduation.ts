/**
 * useGraduation - SIKAD v4.0
 * TanStack Query hooks for student graduation management
 */

import { useMutation } from '@tanstack/react-query';
import { graduationService } from '../services/workload/graduationService';

export function useGraduationPreview() {
  return useMutation({
    mutationFn: async (academicTermId: string) => {
      return await graduationService.previewGraduation(academicTermId);
    },
  });
}

export function useExecuteGraduation() {
  return useMutation({
    mutationFn: async ({ academicTermId, tahunLulus }: { academicTermId: string; tahunLulus: number }) => {
      return await graduationService.executeGraduation(academicTermId, tahunLulus);
    },
  });
}
