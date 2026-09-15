import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import type { User, WorkTemplate, Zone } from "@/types/domain";
import { bulkScheduleTasks, dispatchTasksViaWhatsApp, type DispatchResult } from "@/services/whatsappService";

interface TaskDispatcherProps {
  zones: Zone[];
  workTemplates: WorkTemplate[];
  cleaners: User[]; // исполнители (роль CLEANER), напр. Никита (N), Владимир (W)
}

type Step = "FORM" | "GENERATING" | "DISPATCHING" | "DONE";

function nextNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function TaskDispatcher({ zones, workTemplates, cleaners }: TaskDispatcherProps) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [workTemplateId, setWorkTemplateId] = useState(workTemplates[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState(cleaners[0]?.id ?? "");
  const [daysAhead, setDaysAhead] = useState(1);
  const [step, setStep] = useState<Step>("FORM");
  const [results, setResults] = useState<DispatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => nextNDays(daysAhead), [daysAhead]);

  async function handleDispatch() {
    setError(null);
    setStep("GENERATING");
    try {
      const tasks = await bulkScheduleTasks({ zoneId, workTemplateId, assigneeId, dates });
      setStep("DISPATCHING");
      const dispatched = await dispatchTasksViaWhatsApp(tasks.map((t) => t.id));
      setResults(dispatched);
      setStep("DONE");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать/отправить задачи");
      setStep("FORM");
    }
  }

  const selectedCleaner = cleaners.find((c) => c.id === assigneeId);

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-surface-raised p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-ink">Назначить задачу и отправить в WhatsApp</h2>

      <div className="space-y-3">
        <Field label="Зона">
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full rounded-xl border border-surface-sunken bg-surface px-3 py-2.5 text-sm"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Технологическая карта">
          <select
            value={workTemplateId}
            onChange={(e) => setWorkTemplateId(e.target.value)}
            className="w-full rounded-xl border border-surface-sunken bg-surface px-3 py-2.5 text-sm"
          >
            {workTemplates.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · ~{w.estimatedMinutes} мин
              </option>
            ))}
          </select>
        </Field>

        <Field label="Исполнитель">
          <div className="flex gap-2">
            {cleaners.map((c) => (
              <button
                key={c.id}
                onClick={() => setAssigneeId(c.id)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  assigneeId === c.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-surface-sunken text-ink-muted"
                }`}
              >
                {c.fullName} ({c.personnelCode})
              </button>
            ))}
          </div>
        </Field>

        <Field label="Период">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-ink-faint" />
            <input
              type="range"
              min={1}
              max={14}
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-24 text-right text-sm text-ink-muted">
              {daysAhead} {daysAhead === 1 ? "день" : "дн."}
            </span>
          </div>
        </Field>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleDispatch}
        disabled={!zoneId || !workTemplateId || !assigneeId || step === "GENERATING" || step === "DISPATCHING"}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition disabled:opacity-50"
      >
        {step === "GENERATING" && (
          <>
            <Loader2 size={16} className="animate-spin" /> Создаём задачи…
          </>
        )}
        {step === "DISPATCHING" && (
          <>
            <Loader2 size={16} className="animate-spin" /> Отправляем в WhatsApp {selectedCleaner?.fullName}…
          </>
        )}
        {(step === "FORM" || step === "DONE") && (
          <>
            <Send size={16} /> Создать {dates.length} задач и отправить ссылку
          </>
        )}
      </button>

      {step === "DONE" && (
        <ul className="mt-4 space-y-1.5">
          {results.map((r) => (
            <li key={r.taskId} className="flex items-center gap-2 text-xs">
              {r.status === "SENT" ? (
                <CheckCircle2 size={14} className="text-emerald-600" />
              ) : (
                <XCircle size={14} className="text-red-600" />
              )}
              <span className="text-ink-muted">
                {r.phone} — {r.status === "SENT" ? "доставлено" : r.error ?? "ошибка отправки"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
