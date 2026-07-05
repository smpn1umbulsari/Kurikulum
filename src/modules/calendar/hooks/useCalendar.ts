/**
 * Calendar Hooks - SIKAD v4.0
 * TanStack Query hooks for managing Academic Calendar Events
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/database/dexie/schema';
import type { AcademicCalendarEvent } from '@/types';
import { SyncManager } from '@/services/sync/SyncManager';
import { useAcademicTerms } from '@/modules/academic-term/hooks/useAcademicTerm';

// Repository pattern for local-first access
class CalendarEventRepository {
  private table = db.academicCalendarEvents;

  async getAll(): Promise<AcademicCalendarEvent[]> {
    return this.table.toArray();
  }

  async getById(id: string): Promise<AcademicCalendarEvent | undefined> {
    return this.table.get(id);
  }

  async getByYear(academicYearId: string): Promise<AcademicCalendarEvent[]> {
    return this.table.where('academic_year_id').equals(academicYearId).toArray();
  }

  async getByDateRange(startDate: string, endDate: string): Promise<AcademicCalendarEvent[]> {
    return this.table.where('date').between(startDate, endDate).toArray();
  }

  async getActiveEvents(): Promise<AcademicCalendarEvent[]> {
    return this.table.where('is_active').equals(1).toArray();
  }

  async save(event: AcademicCalendarEvent): Promise<void> {
    await this.table.put(event);
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  async clear(): Promise<void> {
    await this.table.clear();
  }
}

export const calendarEventRepository = new CalendarEventRepository();

/**
 * Hook to get all calendar events
 */
export function useCalendarEvents() {
  return useQuery<AcademicCalendarEvent[]>({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      let localEvents = await calendarEventRepository.getAll();

      if (localEvents.length === 0) {
        // Try to sync from server
        try {
          await fetchCalendarEventsFromServer();
          localEvents = await calendarEventRepository.getAll();
        } catch (error) {
          console.error('[useCalendarEvents] Sync error:', error);
        }
      }

      return localEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get calendar events for a specific year
 */
export function useCalendarEventsByYear(academicYearId: string) {
  return useQuery<AcademicCalendarEvent[]>({
    queryKey: ['calendarEvents', 'year', academicYearId],
    queryFn: async () => {
      if (!academicYearId) return [];
      return calendarEventRepository.getByYear(academicYearId);
    },
    enabled: !!academicYearId,
  });
}

/**
 * Hook to get calendar events for a date range
 */
export function useCalendarEventsByDateRange(startDate: string, endDate: string) {
  return useQuery<AcademicCalendarEvent[]>({
    queryKey: ['calendarEvents', 'range', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      return calendarEventRepository.getByDateRange(startDate, endDate);
    },
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Hook to save a calendar event
 */
export function useSaveCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: AcademicCalendarEvent) => {
      await calendarEventRepository.save(event);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

/**
 * Hook to delete a calendar event
 */
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await calendarEventRepository.delete(id);
      SyncManager.triggerSync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}

/**
 * Hook to get current academic term
 */
export function useCurrentAcademicTerm() {
  const { data: terms = [] } = useAcademicTerms();
  return terms.find(t => t.status === true);
}

/**
 * Hook to get calendar events for current term
 */
export function useCurrentTermCalendarEvents() {
  const currentTerm = useCurrentAcademicTerm();

  return useQuery<AcademicCalendarEvent[]>({
    queryKey: ['calendarEvents', 'currentTerm', currentTerm?.id],
    queryFn: async () => {
      if (!currentTerm) return [];

      const startDate = currentTerm.tanggal_mulai.split('T')[0];
      const endDate = currentTerm.tanggal_selesai.split('T')[0];

      return calendarEventRepository.getByDateRange(startDate, endDate);
    },
    enabled: !!currentTerm,
  });
}

// Server sync function (placeholder - implement based on API)
async function fetchCalendarEventsFromServer(): Promise<void> {
  const response = await fetch('/api/calendar-events');
  if (!response.ok) throw new Error('Failed to fetch calendar events');

  const data = await response.json();
  if (data.events) {
    for (const event of data.events) {
      await calendarEventRepository.save(event);
    }
  }
}
