"use client";

import { useMemo } from "react";
import { useProjectsStore, selectActiveProject } from "./useProjectsStore";
import { computeTariff } from "@/lib/calculator/engine";
import type { TariffResult } from "@/lib/calculator/types";

/** Активный проект (реактивно — обновляется при любой мутации). */
export function useActiveProject() {
  return useProjectsStore(selectActiveProject);
}

/** Тариф активного проекта, пересчитывается при каждом изменении его db/building. */
export function useActiveTariff(): TariffResult {
  const project = useActiveProject();
  return useMemo(
    () => computeTariff(project.db, project.building, project.priceMultiplier),
    [project.db, project.building, project.priceMultiplier],
  );
}
