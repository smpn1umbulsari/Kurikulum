/**
 * usePromotion - SIKAD v4.0
 * TanStack Query hooks for class promotion management
 */

import { useMutation } from '@tanstack/react-query';
import { promotionService } from '../services/workload/promotionService';

export function usePromotionPreview() {
  return useMutation({
    mutationFn: async ({ sourceTermId, targetTermId }: { sourceTermId: string; targetTermId: string }) => {
      return await promotionService.previewPromotion(sourceTermId, targetTermId);
    },
  });
}

export function useExecutePromotion() {
  return useMutation({
    mutationFn: async ({ sourceTermId, targetTermId }: { sourceTermId: string; targetTermId: string }) => {
      return await promotionService.executePromotion(sourceTermId, targetTermId);
    },
  });
}

export function useRollbackPromotion() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      await promotionService.rollbackPromotion(jobId);
    },
  });
}
