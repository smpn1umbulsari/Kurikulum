/**
 * useReporting - SIKAD v4.0
 * TanStack Query hooks for report generation
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { reportingService, type RaporPreview } from '../services/reportingService';
import { useAppStore } from '../../../store/appStore';

export function useRaporPreview(siswaId: string) {
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);

  return useQuery({
    queryKey: ['raporPreview', siswaId, currentAcademicTerm?.id],
    queryFn: async (): Promise<RaporPreview | null> => {
      if (!currentAcademicTerm) {
        return null;
      }
      return await reportingService.generateRaporPreview(
        siswaId,
        currentAcademicTerm.id
      );
    },
    enabled: !!siswaId && !!currentAcademicTerm,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useClassSummary(kelasId: string) {
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);

  return useQuery({
    queryKey: ['classSummary', kelasId, currentAcademicTerm?.id],
    queryFn: async () => {
      if (!currentAcademicTerm) {
        return null;
      }
      return await reportingService.generateClassSummary(
        kelasId,
        currentAcademicTerm.id
      );
    },
    enabled: !!kelasId && !!currentAcademicTerm,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExportRapor() {
  return useMutation({
    mutationFn: async ({
      siswaId,
      academicTermId,
    }: {
      siswaId: string;
      academicTermId: string;
    }) => {
      return await reportingService.exportRaporPdf(siswaId, academicTermId);
    },
  });
}
