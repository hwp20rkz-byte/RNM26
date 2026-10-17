import { useEffect, useRef } from 'react';
import { create } from 'zustand';

// Свои окна подтверждения и сообщений вместо window.confirm/alert:
// системные окна в части встраиваний браузера блокируются, а confirm() там молча возвращает false.

interface DialogRequest {
  kind: 'confirm' | 'notice';
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

const useDialogs = create<{ current: DialogRequest | null }>(() => ({ current: null }));

function open(kind: DialogRequest['kind'], message: string, confirmLabel: string): Promise<boolean> {
  useDialogs.getState().current?.resolve(false);
  return new Promise((resolve) => useDialogs.setState({ current: { kind, message, confirmLabel, resolve } }));
}

export const askConfirm = (message: string, confirmLabel = 'Удалить') => open('confirm', message, confirmLabel);
export const notify = (message: string) => void open('notice', message, 'Понятно');

export function DialogHost() {
  const current = useDialogs((s) => s.current);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => primary.current?.focus(), [current]);
  if (!current) return null;

  const close = (ok: boolean) => {
    useDialogs.setState({ current: null });
    current.resolve(ok);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 pt-28"
      onClick={() => close(false)}
      onKeyDown={(e) => e.key === 'Escape' && close(false)}
    >
      <div
        role={current.kind === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={current.kind === 'confirm' ? 'Подтверждение' : 'Сообщение'}
        className="w-[420px] max-w-[calc(100vw-32px)] rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="whitespace-pre-line text-sm text-slate-800">{current.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          {current.kind === 'confirm' && (
            <button className="rounded px-3 py-1 text-sm hover:bg-slate-100" onClick={() => close(false)}>
              Отмена
            </button>
          )}
          <button
            ref={primary}
            className={`rounded px-3 py-1 text-sm text-white ${current.kind === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={() => close(true)}
          >
            {current.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
