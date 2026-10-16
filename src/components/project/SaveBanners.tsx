import { dismissNotice, flushSave, resolveConflict, useSaveStatus } from '../../persistence/persistenceController';

export function SaveBanners() {
  const s = useSaveStatus();
  return (
    <>
      {s.state === 'conflict' && (
        <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <span>Этот проект изменили в другой вкладке, пока здесь были несохранённые правки. Какую версию оставить?</span>
          <button className="rounded bg-amber-600 px-2 py-0.5 text-white hover:bg-amber-700" onClick={() => resolveConflict('mine')}>
            Мою (из этой вкладки)
          </button>
          <button className="rounded border border-amber-600 px-2 py-0.5 hover:bg-amber-100" onClick={() => resolveConflict('theirs')}>
            Из другой вкладки
          </button>
        </div>
      )}
      {s.state === 'error' && (
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <span>Проект не сохранён: {s.error}</span>
          <button className="rounded border border-red-400 px-2 py-0.5 hover:bg-red-100" onClick={flushSave}>
            Повторить
          </button>
        </div>
      )}
      {s.notice && (
        <div className="flex items-start gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
          <span className="whitespace-pre-line">{s.notice}</span>
          <button className="ml-auto text-blue-500 hover:text-blue-800" onClick={dismissNotice} aria-label="Скрыть">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
