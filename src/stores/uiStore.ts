// stores/uiStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface UIState {
  // Panels
  leftPanelWidth: number;
  rightPanelWidth: number;
  inspectorActiveTab: 'style' | 'content' | 'package';

  // Modals
  isPackageManagerOpen: boolean;
  isWelcomeOpen: boolean;
  isExportModalOpen: boolean;

  // Preview mode
  isPreviewMode: boolean;
  isPresenting: boolean;

  // Toast
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  initialize: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setInspectorTab: (tab: 'style' | 'content' | 'package') => void;
  openPackageManager: () => void;
  closePackageManager: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  setPreviewMode: (enabled: boolean) => void;
  setPresenting: (enabled: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    leftPanelWidth: 248,
    rightPanelWidth: 344,
    inspectorActiveTab: 'style',

    isPackageManagerOpen: false,
    isWelcomeOpen: true,
    isExportModalOpen: false,

    isPreviewMode: false,
    isPresenting: false,

    toast: null,

    initialize: () => {},

    setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(200, Math.min(400, width)) }),
    setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(280, Math.min(500, width)) }),

    setInspectorTab: (tab) => set({ inspectorActiveTab: tab }),

    openPackageManager: () => set({ isPackageManagerOpen: true }),
    closePackageManager: () => set({ isPackageManagerOpen: false }),

    openWelcome: () => set({ isWelcomeOpen: true }),
    closeWelcome: () => set({ isWelcomeOpen: false }),

    openExportModal: () => set({ isExportModalOpen: true }),
    closeExportModal: () => set({ isExportModalOpen: false }),

    setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
    setPresenting: (enabled) => set({ isPresenting: enabled }),

    showToast: (message, type = 'info') => set({ toast: { message, type } }),
    hideToast: () => set({ toast: null }),
  }))
);
