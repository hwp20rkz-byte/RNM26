import { ModuleInspector } from './components/inspector/ModuleInspector';
import { PartsAndBom } from './components/panels/PartsAndBom';
import { Viewport3D } from './components/viewport/Viewport3D';
import { useAssemblies } from './store/useAssemblies';
import { useProjectStore } from './store/useProjectStore';
import { findOverlaps } from './cad-kernel/collision/overlaps';
import { useMemo } from 'react';
import { ProjectBar } from './components/project/ProjectBar';
import { SaveBanners } from './components/project/SaveBanners';
import { HistoryButtons, HistoryToast, useUndoShortcuts } from './components/project/HistoryControls';

export default function App() {
  useUndoShortcuts();
  const assemblies = useAssemblies();
  const modules = useProjectStore((s) => s.project.modules);
  const selectedId = useProjectStore((s) => s.selectedId);
  const select = useProjectStore((s) => s.select);
  const addModule = useProjectStore((s) => s.addModule);
  const selected = modules.find((m) => m.id === selectedId);
  const overlaps = useMemo(() => findOverlaps(modules), [modules]);
  const nameOf = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
  const selectedWarnings = assemblies.find((a) => a.moduleId === selectedId)?.warnings ?? [];

  return (
    <div className="grid h-screen grid-cols-[200px_1fr_320px] grid-rows-[44px_auto_1fr_240px] bg-white text-slate-800">
      <header className="col-span-3 flex items-center gap-4 border-b border-slate-200 px-4">
        <h1 className="shrink-0 font-semibold">RNM26</h1>
        <HistoryButtons />
        <ProjectBar />
        {overlaps.length > 0 && (
          <span className="truncate rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">
            Пересекаются: {overlaps.map(([a, b]) => `${nameOf(a)} и ${nameOf(b)}`).join('; ')}
          </span>
        )}
      </header>
      <div className="col-span-3">
        <SaveBanners />
      </div>
      <HistoryToast />

      <aside className="row-span-2 overflow-auto border-r border-slate-200">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Модули</span>
          <button className="rounded bg-blue-600 px-2 py-0.5 text-sm text-white hover:bg-blue-700" onClick={addModule}>
            + Модуль
          </button>
        </div>
        <ul>
          {modules.map((m) => (
            <li key={m.id}>
              <button
                className={`w-full px-3 py-1.5 text-left text-sm ${m.id === selectedId ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'}`}
                onClick={() => select(m.id)}
              >
                {m.name}
                <span className="block text-xs font-normal text-slate-400">
                  {m.dimensions.width}×{m.dimensions.height}×{m.dimensions.depth}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="min-h-0 min-w-0">
        <Viewport3D assemblies={assemblies} />
      </main>

      <aside className="row-span-2 overflow-auto border-l border-slate-200">
        {selected ? (
          <ModuleInspector key={selected.id} module={selected} warnings={selectedWarnings} />
        ) : (
          <p className="p-4 text-sm text-slate-500">Выберите модуль в списке или на сцене</p>
        )}
      </aside>

      <section className="min-h-0 min-w-0 border-t border-slate-200">
        <PartsAndBom assemblies={assemblies} />
      </section>
    </div>
  );
}
