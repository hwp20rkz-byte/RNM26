import { useEffect, useMemo, useState } from 'react';
import { deleteProject, listProjects, openProject } from '../../persistence/persistenceController';
import { useProjectStore } from '../../store/useProjectStore';

const date = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const currentId = useProjectStore((s) => s.project.id);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const all = useMemo(() => listProjects(), [version, currentId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const q = query.trim().toLowerCase();
  const items = q ? all.filter((p) => `${p.name} ${p.clientName}`.toLowerCase().includes(q)) : all;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20" onClick={onClose}>
      <div className="w-[640px] max-w-[calc(100vw-32px)] rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Проекты в этом браузере</h2>
          <input
            autoFocus
            className="ml-auto w-56 rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="Поиск по названию или клиенту"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <ul className="max-h-[60vh] overflow-auto">
          {items.map((p) => (
            <li key={p.id} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-2 ${p.id === currentId ? 'bg-blue-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.clientName || 'клиент не указан'} · модулей: {p.moduleCount} · {date(p.savedAt)}
                </div>
              </div>
              {p.id === currentId ? (
                <span className="text-xs text-blue-700">открыт</span>
              ) : (
                <button
                  className="rounded bg-blue-600 px-2 py-0.5 text-sm text-white hover:bg-blue-700"
                  onClick={() => {
                    const err = openProject(p.id);
                    if (err) alert(err);
                    else onClose();
                  }}
                >
                  Открыть
                </button>
              )}
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => {
                  if (!confirm(`Удалить «${p.name}»? Вернуть можно только из скачанного файла.`)) return;
                  deleteProject(p.id);
                  setVersion((v) => v + 1);
                }}
              >
                удалить
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Ничего не найдено</li>}
        </ul>
        <p className="px-4 py-2 text-xs text-slate-500">
          Проекты хранятся в этом браузере на этом компьютере. Для резервной копии и переноса используйте «Скачать файл».
        </p>
      </div>
    </div>
  );
}
