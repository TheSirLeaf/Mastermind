// stores/uiStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type InspectorTab = 'style' | 'content' | 'package' | 'animation' | 'slide' | 'packages';

interface UIState {
  // Panels
  leftPanelWidth: number;
  rightPanelWidth: number;
  inspectorActiveTab: InspectorTab;
  animationPreviewNonce: number;

  // Modals
  isPackageManagerOpen: boolean;
  isWelcomeOpen: boolean;
  /** Há um rascunho salvo neste navegador (carregado no boot). */
  hasDraft: boolean;
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
  setInspectorTab: (tab: InspectorTab) => void;
  replayAnimations: () => void;
  openPackageManager: () => void;
  closePackageManager: () => void;
  openWelcome: () => void;
  setHasDraft: (value: boolean) => void;
  closeWelcome: (remember?: boolean) => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  setPreviewMode: (enabled: boolean) => void;
  setPresenting: (enabled: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  hideToast: () => void;
}

const WELCOME_KEY = 'mastermind:welcome';

function readWelcomePref(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_KEY) !== 'off';
  } catch {
    return true;
  }
}

function writeWelcomePref(show: boolean): void {
  try {
    window.localStorage.setItem(WELCOME_KEY, show ? 'on' : 'off');
  } catch {
    // Sem localStorage: o aviso volta na próxima visita.
  }
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    leftPanelWidth: 248,
    rightPanelWidth: 344,
    inspectorActiveTab: 'style',
    animationPreviewNonce: 0,

    isPackageManagerOpen: false,
    isWelcomeOpen: readWelcomePref(),
    hasDraft: false,
    isExportModalOpen: false,

    isPreviewMode: false,
    isPresenting: false,

    toast: null,

    initialize: () => {},

    setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(200, Math.min(400, width)) }),
    setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(280, Math.min(500, width)) }),

    setInspectorTab: (tab) => set({ inspectorActiveTab: tab }),
    replayAnimations: () =>
      set((state) => {
        state.animationPreviewNonce += 1;
      }),

    openPackageManager: () => set({ isPackageManagerOpen: true }),
    closePackageManager: () => set({ isPackageManagerOpen: false }),

    openWelcome: () => set({ isWelcomeOpen: true }),
    setHasDraft: (value) => set({ hasDraft: value }),
    closeWelcome: (remember = false) => {
      if (remember) writeWelcomePref(false);
      set({ isWelcomeOpen: false });
    },

    openExportModal: () => set({ isExportModalOpen: true }),
    closeExportModal: () => set({ isExportModalOpen: false }),

    setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
    setPresenting: (enabled) => set({ isPresenting: enabled }),

    showToast: (message, type = 'info') => set({ toast: { message, type } }),
    hideToast: () => set({ toast: null }),
  }))
);
