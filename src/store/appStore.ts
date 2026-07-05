/**
 * App Store - SIKAD v4.0
 * Zustand store for global application configuration and academic terms
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AcademicTerm } from '@/types';

// ============ STATE TYPE ============

export interface AppState {
  currentSchool: string | null;
  currentAcademicTerm: AcademicTerm | null;
  globalConfig: Record<string, unknown>;

  setCurrentSchool: (school: string | null) => void;
  setCurrentAcademicTerm: (term: AcademicTerm | null) => void;
  setGlobalConfig: (config: Record<string, unknown>) => void;
  reset: () => void;
}

// ============ STORE ============

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      currentSchool: null,
      currentAcademicTerm: null,
      globalConfig: {},

      // Actions
      setCurrentSchool: (school: string | null) => set({ currentSchool: school }),
      setCurrentAcademicTerm: (term: AcademicTerm | null) => set({ currentAcademicTerm: term }),
      setGlobalConfig: (config: Record<string, unknown>) => set({ globalConfig: config }),
      reset: () => set({ currentSchool: null, currentAcademicTerm: null, globalConfig: {} }),
    }),
    {
      name: 'sikad-app',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============ SELECTORS ============

export const selectCurrentSchool = (state: AppState) => state.currentSchool;
export const selectCurrentAcademicTerm = (state: AppState) => state.currentAcademicTerm;
export const selectGlobalConfig = (state: AppState) => state.globalConfig;
