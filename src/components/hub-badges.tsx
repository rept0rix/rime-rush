import { BADGES, badgeHint, badgeName } from "@/game/achievements";
import { t } from "@/game/i18n";
import { useGame } from "@/game/store";

export function HubBadges() {
  const save = useGame((s) => s.save);
  const copy = t(save.lang);
  const have = new Set(save.badges);
  const n = BADGES.filter((b) => have.has(b.id)).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
      <h1 className="arcade-title font-display text-4xl text-gold">{copy.tabBadges}</h1>
      <p className="text-sm text-muted">
        {n}/{BADGES.length} {copy.unlocked}
      </p>
      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
        {BADGES.map((b) => {
          const on = have.has(b.id);
          return (
            <li
              key={b.id}
              className={`rounded-2xl border px-4 py-3 ${on ? "border-gold bg-gold/10" : "border-line bg-surface opacity-70"}`}
            >
              <p className={`font-bold ${on ? "text-gold" : "text-muted"}`}>{badgeName(b, save.lang)}</p>
              <p className="text-xs text-muted">{on ? copy.unlocked : badgeHint(b, save.lang)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
