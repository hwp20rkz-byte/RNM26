import { useEffect } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { isTextEntry } from './HistoryControls';

// Клавиши инструментов, как в QDesign: A — выбор деталей, F — фасады, Escape — снять выбор.
// e.code, а не e.key: в русской раскладке A и F дают «ф» и «а».
export function useToolShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTextEntry(e.target)) return;
      const s = useProjectStore.getState();
      if (e.code === 'KeyA') s.setPartMode(!s.partMode);
      else if (e.code === 'KeyF') s.setShowFacades(!s.showFacades);
      else if (e.code === 'Escape') {
        if (s.selectedParts.length) s.selectParts(s.selectedId ?? '', []);
        else if (s.partMode) s.setPartMode(false);
        else s.select(null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
