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
        className="w-full max-w-md text-center bg-[#1A0A12] border border-white/10 rounded-2xl p-8"
        onClick={() => {
          /* stop propagation */
        }}
      >
        <h2 className="font-serif font-bold text-3xl text-[#F7D98B] mb-2">
          Bem-vindo ao Mastermind
        </h2>
        <p className="text-[#B99FA0] mb-6">
          Editor de apresentações com sistema de pacotes extensível
        </p>

        <div className="space-y-3 mb-6">
          <button
            className="w-full justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#F7D98B] to-[#D6A84F] text-[#2A0E1A] font-semibold text-sm border-0 hover:opacity-90 transition"
            onClick={() => {
              closeWelcome();
            }}
          >
            <FileText className="w-5 h-5" /> Nova apresentação
          </button>
          <button
            className="w-full justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[#F3E6E2] text-sm hover:bg-white/10 transition"
            onClick={() => {
              closeWelcome();
            }}
          >
            <FolderOpen className="w-5 h-5" /> Abrir arquivo
          </button>
        </div>

        <label className="flex items-center justify-center gap-3 mx-auto cursor-pointer text-sm text-[#B99FA0]">
          <input
            type="checkbox"
            className="accent-[#F7D98B]"
            defaultChecked={false}
            onChange={() => {
              /* don't show again */
            }}
          />
          <span>Não mostrar novamente</span>
        </label>

        <button
          className="absolute top-4 right-4 rounded p-1.5 text-[#B99FA0] hover:bg-white/10 hover:text-[#F7D98B] transition"
          onClick={closeWelcome}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
