import { useEffect, useRef, useState } from 'react';
import {
  exportCurrentProject,
  importProjectFile,
  newProject,
  useSaveStatus,
} from '../../persistence/persistenceController';
import { useProjectStore } from '../../store/useProjectStore';
import { ProjectsDialog } from './ProjectsDialog';

// Текстовое поле, которое пишет в проект по уходу из поля, а не на каждую букву.
function MetaInput({ value, placeholder, onCommit, className }: { value: string; placeholder: string; onCommit: (v: string) => void; className: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      className={`rounded border border-transparent px-1.5 py-0.5 hover:border-slate-300 focus:border-blue-500 focus:outline-none ${className}`}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim().slice(0, 200);
        if (v !== value) onCommit(v);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
    />
  );
}

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

function SaveIndicator() {
  const s = useSaveStatus();
  if (s.storage === 'memory') {
    return <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">Браузер запретил сохранение — скачивайте файл</span>;
  }
  const map = {
    saved: { text: s.savedAt ? `Сохранено в ${time(s.savedAt)}` : 'Сохранено', cls: 'text-slate-400' },
    dirty: { text: 'Есть изменения…', cls: 'text-slate-500' },
    saving: { text: 'Сохраняю…', cls: 'text-slate-500' },
    error: { text: 'Не сохранено', cls: 'text-red-600 font-medium' },
    conflict: { text: 'Конфликт версий', cls: 'text-amber-700 font-medium' },
  } as const;
  const v = map[s.state];
  return <span className={`text-xs ${v.cls}`} title={s.error ?? undefined}>{v.text}</span>;
}

export function ProjectBar() {
  const name = useProjectStore((s) => s.project.name);
  const clientName = useProjectStore((s) => s.project.clientName);
  const setMeta = useProjectStore((s) => s.setProjectMeta);
  const [dialog, setDialog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const download = () => {
    const { fileName, text } = exportCurrentProject();
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Ссылку отзываем не сразу: иначе браузер успевает потерять имя файла и сохраняет «download».
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const upload = async (file: File) => {
    if (file.size > 5_000_000) {
      alert('Файл больше 5 МБ — это не проект RNM26');
      return;
    }
    const err = importProjectFile(await file.text());
    if (err) alert(err);
  };

  const btn = 'rounded px-2 py-0.5 text-sm hover:bg-slate-100';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <MetaInput value={name} placeholder="Название проекта" className="w-48 font-medium" onCommit={(v) => setMeta({ name: v || 'Без названия' })} />
      <MetaInput value={clientName} placeholder="Клиент" className="w-36 text-sm" onCommit={(v) => setMeta({ clientName: v })} />
      <SaveIndicator />
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <button className={btn} onClick={() => setDialog(true)}>
        Проекты
      </button>
      <button
        className={btn}
        onClick={() => {
          const err = newProject();
          if (err) alert(err);
        }}
      >
        Новый
      </button>
      <button className={btn} onClick={download} title="Резервная копия или перенос на другой компьютер">
        Скачать файл
      </button>
      <button className={btn} onClick={() => fileInput.current?.click()}>
        Открыть файл
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
      {dialog && <ProjectsDialog onClose={() => setDialog(false)} />}
    </div>
  );
}
