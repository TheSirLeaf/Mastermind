// components/common/Toast.tsx
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onDismiss?: () => void;
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  const icons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  };

  const colors = {
    info: 'text-accent',
    success: 'text-[#72A68A]',
    error: 'text-[#C77C8A]',
  };

  return (
    <div
      id="toast"
      className={clsx('fixed bottom-4 right-4 z-50 animate-slide-up', colors[type])}
      role="alert"
    >
      <div className="flex items-center gap-2 bg-payday-bg border border-white/10 px-3 py-2 rounded-lg shadow-lg">
        <span className={colors[type]}>{icons[type]}</span>
        <span className="text-sm text-payday-text">{message}</span>
        <button
          className="ml-2 btn ib w-6 h-6 p-0 opacity-60 hover:opacity-100"
          onClick={() => {
            onDismiss?.();
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
