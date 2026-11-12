// stores/uiStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type InspectorTab = 'style' | 'content' | 'package' | 'animation' | 'slide';

export type Workspace = 'editor' | 'animation' | 'slide' | 'integration' | 'presentation';

interface UIState {
  // Workspace (abas do topo)
  workspace: Workspace;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  /** Seção aberta por grupo do inspetor (acordeão). `''` = todas fechadas. */
  openSections: Record<string, string>;

  // Panels
  leftPanelWidth: number;
  rightPanelWidth: number;
  inspectorActiveTab: InspectorTab;
  animationPreviewNonce: number;

  // Modals
  isPackageManagerOpen: boolean;
  isNewSlideOpen: boolean;
  /** Cores mais comuns do slide ativo (aba Slides). */
  slidePalette: string[];
  setSlidePalette: (colors: string[]) => void;
  /** `deck`: a tela escolhe o modelo de uma apresentação nova; `slide`: adiciona um slide. */
  newSlideMode: 'slide' | 'deck';
  isWelcomeOpen: boolean;
  /** Há um rascunho salvo neste navegador (carregado no boot). */
  hasDraft: boolean;
  isExportModalOpen: boolean;
  isSettingsOpen: boolean;
  /** Tooltips ricos ligados (Configurações). */
  tooltipsEnabled: boolean;

  // Preview mode
  isPreviewMode: boolean;
  isPresenting: boolean;
  /** Aba em que o usuário estava antes de entrar na Apresentação (para voltar a ela). */
  workspaceBeforePresentation: Workspace;

  // Toast
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  initialize: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setWorkspace: (workspace: Workspace) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setOpenSection: (group: string, id: string) => void;
  replayAnimations: () => void;
  openPackageManager: () => void;
  openNewSlide: (mode?: 'slide' | 'deck') => void;
  closeNewSlide: () => void;
  closePackageManager: () => void;
  openWelcome: () => void;
  setHasDraft: (value: boolean) => void;
  closeWelcome: (remember?: boolean) => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setTooltipsEnabled: (value: boolean) => void;
  setWelcomeOnStart: (value: boolean) => void;
  setPreviewMode: (enabled: boolean) => void;
  setPresenting: (enabled: boolean) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  hideToast: () => void;
}

const WELCOME_KEY = 'mastermind:welcome';

const TOOLTIP_KEY = 'mastermind:tooltips';

function readTooltipPref(): boolean {
  try {
    return window.localStorage.getItem(TOOLTIP_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function readWelcomeOnStart(): boolean {
  return readWelcomePref();
}

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
    workspace: 'editor',
    showLeftPanel: true,
    showRightPanel: true,
    openSections: {},
    leftPanelWidth: 248,
    rightPanelWidth: 344,
    inspectorActiveTab: 'style',
    animationPreviewNonce: 0,

    isPackageManagerOpen: false,
    isNewSlideOpen: false,
    slidePalette: [],
    setSlidePalette: (colors) => set({ slidePalette: colors }),
    newSlideMode: 'slide',
    isWelcomeOpen: readWelcomePref(),
    hasDraft: false,
    isExportModalOpen: false,
    isSettingsOpen: false,
    tooltipsEnabled: readTooltipPref(),

    isPreviewMode: false,
    isPresenting: false,
    workspaceBeforePresentation: 'editor',

    toast: null,

    initialize: () => {},

    setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(200, Math.min(400, width)) }),
    setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(280, Math.min(500, width)) }),

    setInspectorTab: (tab) => set({ inspectorActiveTab: tab }),
    setWorkspace: (workspace) =>
      set((state) => {
        if (workspace === 'presentation' && state.workspace !== 'presentation') {
          state.workspaceBeforePresentation = state.workspace;
        }
        state.workspace = workspace;
        state.isPreviewMode = false;
        state.isPresenting = workspace === 'presentation';
        // Cada área de trabalho tem o seu inspetor: Estilo no Editor, Animação na Animação.
        const tab = state.inspectorActiveTab;
        if (workspace === 'slide') state.inspectorActiveTab = 'slide';
        else if (workspace === 'animation' && tab !== 'package')
          state.inspectorActiveTab = 'animation';
        else if (workspace !== 'animation' && (tab === 'animation' || tab === 'slide'))
          state.inspectorActiveTab = 'style';
      }),
    toggleLeftPanel: () =>
      set((state) => {
        state.showLeftPanel = !state.showLeftPanel;
      }),
    toggleRightPanel: () =>
      set((state) => {
        state.showRightPanel = !state.showRightPanel;
      }),
    setOpenSection: (group, id) =>
      set((state) => {
        state.openSections[group] = id;
      }),
    replayAnimations: () =>
      set((state) => {
        state.animationPreviewNonce += 1;
      }),

    openPackageManager: () => set({ isPackageManagerOpen: true }),
    openNewSlide: (mode = 'slide') => set({ isNewSlideOpen: true, newSlideMode: mode }),
    closeNewSlide: () => set({ isNewSlideOpen: false }),
    closePackageManager: () => set({ isPackageManagerOpen: false }),

    openWelcome: () => set({ isWelcomeOpen: true }),
    setHasDraft: (value) => set({ hasDraft: value }),
    closeWelcome: (remember = false) => {
      if (remember) writeWelcomePref(false);
      set({ isWelcomeOpen: false });
    },

    openExportModal: () => set({ isExportModalOpen: true }),
    closeExportModal: () => set({ isExportModalOpen: false }),
    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),
    setTooltipsEnabled: (value) => {
      try {
        window.localStorage.setItem(TOOLTIP_KEY, value ? 'on' : 'off');
      } catch {
        // Sem localStorage: vale só nesta sessão.
      }
      set({ tooltipsEnabled: value });
    },
    setWelcomeOnStart: (value) => writeWelcomePref(value),

    setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
    setPresenting: (enabled) =>
      set((state) => {
        state.isPresenting = enabled;
        // Sair da apresentação devolve o usuário à aba em que ele estava.
        if (!enabled && state.workspace === 'presentation') {
          const back = state.workspaceBeforePresentation;
          state.workspace = back === 'presentation' ? 'editor' : back;
          const tab = state.inspectorActiveTab;
          if (state.workspace === 'slide') state.inspectorActiveTab = 'slide';
          else if (state.workspace === 'animation' && tab !== 'package')
            state.inspectorActiveTab = 'animation';
          else if (state.workspace !== 'animation' && (tab === 'animation' || tab === 'slide'))
            state.inspectorActiveTab = 'style';
        }
      }),

    showToast: (message, type = 'info') => set({ toast: { message, type } }),
    hideToast: () => set({ toast: null }),
  }))
);
