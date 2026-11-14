// stores/uiStore.ts
import type { TextFormatInfo } from '@packages/core/iframeBridge';
import type { LucideIcon } from 'lucide-react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type InspectorTab = 'style' | 'content' | 'package' | 'animation' | 'slide';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

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
  /** Keyframe em edição na linha do tempo (o elemento aparece na pose dele no palco). */
  activeKeyframe: { path: number[]; index: number } | null;
  setActiveKeyframe: (value: { path: number[]; index: number } | null) => void;
  isPrefsOpen: boolean;
  /** Menu de contexto aberto (posição na tela e itens). */
  contextMenu: { x: number; y: number; items: Array<ContextMenuItem | 'separator'> } | null;
  openContextMenu: (x: number, y: number, items: Array<ContextMenuItem | 'separator'>) => void;
  closeContextMenu: () => void;
  /** O palco espera o clique que escolhe o pai do elemento selecionado. */
  pickingParent: boolean;
  /** Trecho selecionado no texto em edição (barra de formatação). */
  textFormat: TextFormatInfo | null;
  setTextFormat: (format: TextFormatInfo | null) => void;
  setPickingParent: (on: boolean) => void;
  /** Altura da lista de slides base na barra da esquerda (px). */
  basesPanelHeight: number;
  setBasesPanelHeight: (px: number) => void;
  setPrefsOpen: (open: boolean) => void;
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

function readBasesHeight(): number {
  try {
    const n = Number(localStorage.getItem('mm-bases-height'));
    return Number.isFinite(n) && n >= 70 ? n : 150;
  } catch {
    return 150;
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
    activeKeyframe: null,
    setActiveKeyframe: (value) => set({ activeKeyframe: value }),
    isPrefsOpen: false,
    contextMenu: null,
    openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
    closeContextMenu: () => set({ contextMenu: null }),
    pickingParent: false,
    textFormat: null,
    setTextFormat: (format) => set({ textFormat: format }),
    setPickingParent: (on) => set({ pickingParent: on }),
    basesPanelHeight: readBasesHeight(),
    setBasesPanelHeight: (px) => {
      const value = Math.round(Math.max(70, Math.min(800, px)));
      try {
        localStorage.setItem('mm-bases-height', String(value));
      } catch {
        // sem armazenamento: só não lembra
      }
      set({ basesPanelHeight: value });
    },
    setPrefsOpen: (open) => set({ isPrefsOpen: open }),
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
        state.activeKeyframe = null;
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
