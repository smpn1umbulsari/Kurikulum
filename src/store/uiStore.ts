/**
 * UI Store - SIKAD v4.0
 * Zustand store for UI visibility states (sidebar, drawer, fullscreen)
 */

import { create } from 'zustand';

// ============ STATE TYPE ============

export interface UiState {
  sidebarOpen: boolean;
  drawerOpen: boolean;
  fullscreen: boolean;

  setSidebarOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setFullscreen: (active: boolean) => void;
  toggleSidebar: () => void;
  reset: () => void;
}

// ============ STORE ============

export const useUiStore = create<UiState>()((set) => ({
  // Initial state
  sidebarOpen: true,
  drawerOpen: false,
  fullscreen: false,

  // Actions
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setDrawerOpen: (open: boolean) => set({ drawerOpen: open }),
  setFullscreen: (active: boolean) => set({ fullscreen: active }),
  toggleSidebar: () => set((state: UiState) => ({ sidebarOpen: !state.sidebarOpen })),
  reset: () => set({ sidebarOpen: true, drawerOpen: false, fullscreen: false }),
}));

// ============ SELECTORS ============

export const selectSidebarOpen = (state: UiState) => state.sidebarOpen;
export const selectDrawerOpen = (state: UiState) => state.drawerOpen;
export const selectFullscreen = (state: UiState) => state.fullscreen;
