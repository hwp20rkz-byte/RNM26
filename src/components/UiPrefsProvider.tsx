"use client";

import { useEffect } from "react";
import { applyUiPrefsToDocument, useUiPrefsStore } from "@/store/useUiPrefsStore";

/**
 * Гидратирует useUiPrefsStore из localStorage (React-состояние для панели
 * настроек — само применение к <html> уже произошло синхронно в
 * layout.tsx до отрисовки) и следит за сменой системной темы ОС, пока
 * выбран режим "как в системе".
 */
export function UiPrefsProvider() {
  useEffect(() => {
    Promise.resolve(useUiPrefsStore.persist.rehydrate()).then(() => {
      applyUiPrefsToDocument(useUiPrefsStore.getState());
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useUiPrefsStore.getState().theme === "system") {
        applyUiPrefsToDocument(useUiPrefsStore.getState());
      }
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return null;
}
