/**
 * TEST build support («Test QazaqVerse»): build.sh adds test-mode.js (window.QTEST = true) to the hall's page; e2e can
 * use ?test. Every game shows a «⏭ TEST» button that calls its autoSolve() — the next correct move, as if the child
 * made it — so a tester can walk through all content quickly. Not rendered in the normal build.
 */
export const isTestBuild = (): boolean => {
  try { return !!(window as unknown as { QTEST?: boolean }).QTEST || /[?&]test\b/.test(window.location.search); } catch { return false; }
};

export function TestSkip({ onSkip, disabled }: { onSkip(): void; disabled?: boolean }) {
  if (!isTestBuild()) return null;
  return (
    <button data-test-skip className="pointer-events-auto fixed right-3 top-20 z-40 min-h-11 rounded-xl bg-coral px-3 text-sm font-black text-obsidian shadow-lg disabled:opacity-40"
      disabled={disabled} onClick={onSkip} aria-label="TEST: skip">⏭ TEST</button>
  );
}
