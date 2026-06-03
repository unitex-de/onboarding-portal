import { Check, Loader2, CalendarDays } from "lucide-react";
import {
  CHECKLIST_GROUPS,
  calcZrStartDate,
  formatDateDe,
  getChecklistProgress,
  isChecklistItemDone,
  useOnboarding,
} from "@/lib/onboarding-state";

export function RightChecklist() {
  const { state } = useOnboarding();
  const { done, total, pct } = getChecklistProgress(state);
  const zrDate = calcZrStartDate();

  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="rounded-xl border border-upload bg-card/40 p-5 space-y-5">
        <div>
          <h3 className="font-display text-base font-semibold text-card-foreground">Checkliste</h3>
          <p className="mt-1 text-[11px] text-muted">Automatisch aktualisiert durch das System</p>
          <div className="mt-2 flex items-center justify-between text-xs text-secondary">
            <span>{done} von {total} abgeschlossen</span>
            <span className="font-medium text-card-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-popover overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {CHECKLIST_GROUPS.map((g) => (
          <div key={g.title} className="space-y-2">
            <h4 className="font-display text-sm font-semibold text-card-foreground">{g.title}</h4>
            <ul className="space-y-1.5">
              {g.items.map((i) => {
                const checked = isChecklistItemDone(i, state);
                return (
                  <li key={i.id} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        checked
                          ? "bg-success border-success"
                          : "border-muted/60 bg-transparent",
                      ].join(" ")}
                    >
                      {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                    </span>
                    <span
                      className={[
                        "text-sm",
                        checked ? "text-card-foreground" : "text-secondary",
                      ].join(" ")}
                    >
                      {i.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
        <h4 className="font-display text-sm font-semibold text-card-foreground">In Bearbeitung</h4>
        <ul className="space-y-2 text-sm text-secondary">
          <li className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
            GLN-Beantragung
          </li>
          <li className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
            RSB-Anmeldung
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Voraussichtlicher ZR-Start</p>
            <p className="mt-1 font-display text-lg font-semibold text-card-foreground">
              ab {formatDateDe(zrDate)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}