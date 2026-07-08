import { useEffect } from 'react';

export interface ToastData {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 5_000;

const toastStyles: Record<ToastData['kind'], string> = {
  success: 'border-emerald-200 bg-white text-emerald-800',
  error: 'border-red-200 bg-white text-red-800',
};

const iconStyles: Record<ToastData['kind'], string> = {
  success: 'bg-emerald-100 text-emerald-600',
  error: 'bg-red-100 text-red-600',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6 sm:justify-end sm:px-6">
      <div
        role={toast.kind === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg ${toastStyles[toast.kind]}`}
      >
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${iconStyles[toast.kind]}`}
        >
          {toast.kind === 'success' ? '✓' : '!'}
        </span>
        <p className="min-w-0 flex-1 break-words text-sm font-medium">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
