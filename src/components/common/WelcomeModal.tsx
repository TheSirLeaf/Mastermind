// components/common/WelcomeModal.tsx
import { useUIStore } from '@stores/uiStore';
import { X, FileText, FolderOpen } from 'lucide-react';

export function WelcomeModal() {
  const { isWelcomeOpen, closeWelcome } = useUIStore();

  if (!isWelcomeOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/92 z-[200] grid place-items-center p-4"
      onClick={closeWelcome}
    >
      <div
        className="w-full max-w-md text-center bg-payday-surface border border-payday-border rounded-2xl p-8"
        onClick={() => {
          /* stop propagation */
        }}
      >
        <h2 className="font-serif font-bold text-3xl text-gold-DEFAULT mb-2">
          Bem-vindo ao Mastermind
        </h2>
        <p className="text-payday-textMuted mb-6">
          Editor de apresentações com sistema de pacotes extensível
        </p>

        <div className="space-y-3 mb-6">
          <button
            className="w-full justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-payday-bg font-semibold text-sm border-0 hover:opacity-90 transition"
            onClick={() => {
              closeWelcome();
            }}
          >
            <FileText className="w-5 h-5" /> Nova apresentação
          </button>
          <button
            className="w-full justify-center gap-2 px-4 py-2.5 rounded-lg bg-payday-surface border border-payday-border text-payday-text text-sm hover:bg-payday-panel transition"
            onClick={() => {
              closeWelcome();
            }}
          >
            <FolderOpen className="w-5 h-5" /> Abrir arquivo
          </button>
        </div>

        <label className="flex items-center justify-center gap-3 mx-auto cursor-pointer text-sm text-payday-textMuted">
          <input
            type="checkbox"
            className="accent-gold-DEFAULT"
            defaultChecked={false}
            onChange={() => {
              closeWelcome();
            }}
          />
          <span>Não mostrar novamente</span>
        </label>

        <button
          className="absolute top-4 right-4 rounded p-1.5 text-payday-textMuted hover:bg-payday-surface hover:text-gold-DEFAULT transition"
          onClick={closeWelcome}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
