import { useEffect, useId, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";

const groupFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

function parse(text: string): number | null {
  const clean = text.replace(/[\s  ]/g, "").replace(",", ".");
  if (clean === "" || clean === "-") return null;
  const v = Number(clean);
  return Number.isFinite(v) ? v : null;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
  min?: number;
  max?: number;
  /** Подпись скрыта визуально (поле в строке таблицы) */
  compact?: boolean;
}

/**
 * Числовое поле с разделителями разрядов: «45 000 000» читается, «45000000» — нет.
 * Пока поле в фокусе, показывается ровно то, что набрал пользователь; значение
 * отдаётся наверх на каждый корректный ввод, поэтому расчёт обновляется сразу.
 */
export function NumberField({ label, value, onChange, unit, hint, min, max, compact }: NumberFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => groupFmt.format(value));

  useEffect(() => {
    if (!focused) setText(groupFmt.format(value));
  }, [value, focused]);

  const clamp = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));

  return (
    <div className={compact ? "field field--compact" : "field"}>
      <label htmlFor={id} className={compact ? "visually-hidden" : "field__label"}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onFocus={(e) => {
            // Текст не переформатируется при фокусе: подмена значения под курсором
            // склеивала старое и новое число («190 000150 000»). Пробелы парсер игнорирует.
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            const v = parse(text);
            if (v !== null) onChange(clamp(v));
            else setText(groupFmt.format(value));
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = parse(e.target.value);
            if (v !== null) onChange(clamp(v));
          }}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, value, onChange, compact }: { label: string; value: string; onChange: (v: string) => void; compact?: boolean }) {
  const id = useId();
  return (
    <div className={compact ? "field field--compact field--wide" : "field field--wide"}>
      <label htmlFor={id} className={compact ? "visually-hidden" : "field__label"}>
        {label}
      </label>
      <div className="field__control">
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  compact
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={compact ? "field field--compact" : "field"}>
      <label htmlFor={id} className={compact ? "visually-hidden" : "field__label"}>
        {label}
      </label>
      <div className="field__control">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className="field__label">{legend}</legend>
      <div className="segmented__track">
        {options.map((o) => (
          <label key={o.value} className={o.value === value ? "segmented__opt is-active" : "segmented__opt"}>
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({ title, summary, children, defaultOpen }: { title: string; summary?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="section" open={defaultOpen}>
      <summary>
        <span className="section__title">{title}</span>
        {summary && <span className="section__summary">{summary}</span>}
        <CaretDown className="chev" size={18} aria-hidden="true" />
      </summary>
      <div className="section__body">{children}</div>
    </details>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
    </div>
  );
}
