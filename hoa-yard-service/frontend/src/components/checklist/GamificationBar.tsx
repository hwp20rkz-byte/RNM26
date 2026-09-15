import { Award, Zap, ShieldCheck } from "lucide-react";

interface GamificationBarProps {
  completedCount: number;
  totalCount: number;
  points: number;
  badges: Array<"SPEED_BADGE" | "QUALITY_BADGE" | "STREAK">;
}

const BADGE_META = {
  SPEED_BADGE: { icon: Zap, label: "Скорость", color: "text-status-review" },
  QUALITY_BADGE: { icon: ShieldCheck, label: "Без замечаний", color: "text-status-done" },
  STREAK: { icon: Award, label: "Серия", color: "text-accent" }
} as const;

export function GamificationBar({ completedCount, totalCount, points, badges }: GamificationBarProps) {
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-2xl bg-surface-raised p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">Прогресс смены</span>
        <span className="text-xs font-semibold text-ink">
          {completedCount}/{totalCount} · {points} баллов «Чистый двор»
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {badges.length > 0 && (
        <div className="mt-4 flex gap-2">
          {badges.map((badgeType) => {
            const meta = BADGE_META[badgeType];
            const Icon = meta.icon;
            return (
              <span
                key={badgeType}
                className="inline-flex items-center gap-2 rounded-full bg-surface-sunken px-4 py-2 text-xs font-medium text-ink"
              >
                <Icon size={12} className={meta.color} />
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
