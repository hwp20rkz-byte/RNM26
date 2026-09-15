import { useMemo, useState } from "react";
import { Map, ClipboardList, Send, Info } from "lucide-react";
import { CourtyardMap } from "@/components/map/CourtyardMap";
import { TaskDispatcher } from "@/components/tasks/TaskDispatcher";
import { ChecklistMobile } from "@/components/checklist/ChecklistMobile";
import { demoCleaners, demoWorkTemplates, demoZones, buildDemoTask, buildDemoChecklistItems } from "@/mocks/demoData";
import { isDemoMode } from "@/services/whatsappService";

type Tab = "map" | "dispatch" | "checklist";

const demoTask = buildDemoTask(demoZones[3].id, demoWorkTemplates[0].id, demoCleaners[0].id, new Date().toISOString().slice(0, 10));
const demoChecklistItems = buildDemoChecklistItems(demoTask.id, demoWorkTemplates[0]);

export default function App() {
  const [tab, setTab] = useState<Tab>("map");

  const tabs: Array<{ id: Tab; label: string; icon: typeof Map }> = useMemo(
    () => [
      { id: "map", label: "Карта двора", icon: Map },
      { id: "dispatch", label: "Диспетчер", icon: Send },
      { id: "checklist", label: "Чек-лист", icon: ClipboardList }
    ],
    []
  );

  return (
    <div className="flex h-screen flex-col bg-surface">
      {isDemoMode && (
        <div className="flex items-center gap-2 bg-accent-soft px-4 py-2 text-xs text-ink">
          <Info size={14} className="shrink-0 text-accent" />
          Демо-режим: страница статическая (GitHub Pages), backend не запущен — действия в
          «Диспетчере» и чек-листе имитируются без реальной отправки WhatsApp.
        </div>
      )}

      <div className="min-h-0 flex-1">
        {tab === "map" && <CourtyardMap />}

        {tab === "dispatch" && (
          <div className="flex h-full items-start justify-center overflow-y-auto p-4">
            <TaskDispatcher zones={demoZones} workTemplates={demoWorkTemplates} cleaners={demoCleaners} />
          </div>
        )}

        {tab === "checklist" && (
          <div className="mx-auto h-full max-w-md overflow-y-auto">
            <ChecklistMobile
              task={demoTask}
              zone={demoZones.find((z) => z.id === demoTask.zoneId)!}
              workTemplate={demoWorkTemplates[0]}
              items={demoChecklistItems}
              shiftPoints={demoCleaners[0].gamificationScore}
              onSubmit={async () => {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }}
            />
          </div>
        )}
      </div>

      <nav className="flex border-t border-surface-sunken bg-surface-raised">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition ${
              tab === id ? "text-accent" : "text-ink-faint"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
