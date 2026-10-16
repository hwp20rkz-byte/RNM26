import { useEffect, useState } from 'react';
import { describeChange } from '../../store/history';
import { useProjectStore } from '../../store/useProjectStore';

// Поля ввода текста и чисел оставляем браузеру: там Ctrl+Z отменяет набранные символы.
function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'file'].includes(el.type);
}

export function useUndoShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextEntry(e.target)) return;
      // e.code, а не e.key: в русской раскладке клавиша Z даёт «я».
      const { undo, redo } = useProjectStore.getState();
      if (e.code === 'KeyZ' && !e.shiftKey) undo();
      else if ((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY') redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl+';

export function HistoryButtons() {
  const project = useProjectStore((s) => s.project);
  const prev = useProjectStore((s) => s.past.at(-1));
  const next = useProjectStore((s) => s.future.at(-1));
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const btn = 'rounded px-1.5 py-0.5 text-lg leading-none hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="flex shrink-0 items-center">
      <button
        className={btn}
        disabled={!prev}
        onClick={undo}
        aria-label="Отменить"
        title={prev ? `Отменить: ${describeChange(prev, project).text} (${mod}Z)` : 'Нечего отменять'}
      >
        ↶
      </button>
      <button
        className={btn}
        disabled={!next}
        onClick={redo}
        aria-label="Повторить"
        title={next ? `Повторить: ${describeChange(project, next).text} (${mod}${isMac ? '⇧Z' : 'Y'})` : 'Нечего повторять'}
      >
        ↷
      </button>
    </div>
  );
}

// Короткое сообщение, что именно отменено: правка могла быть в модуле, которого не видно.
export function HistoryToast() {
  const message = useProjectStore((s) => s.historyMessage);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(t);
  }, [message]);
  if (!message || !visible) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded bg-slate-800 px-3 py-1.5 text-sm text-white shadow-lg"
    >
      {message.text}
    </div>
  );
}
