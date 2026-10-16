import { useEffect, useState, type ReactNode } from 'react';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-slate-600">{label}</span>
      {children}
    </label>
  );
}

// Значение применяется по Enter или при уходе из поля, чтобы корпус не пересобирался на каждую цифру.
export function MmInput({
  value,
  onCommit,
  min = 0,
  max = 10000,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const v = Number(draft.replace(',', '.'));
    if (Number.isFinite(v) && v >= min && v <= max) onCommit(v);
    else setDraft(String(value));
  };

  return (
    <span className="flex items-center gap-1">
      <input
        className="w-20 rounded border border-slate-300 px-2 py-0.5 text-right tabular-nums"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setDraft(String(value));
        }}
      />
      <span className="text-xs text-slate-400">мм</span>
    </span>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="max-w-44 rounded border border-slate-300 px-1 py-0.5 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 px-3 py-2">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
