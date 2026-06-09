import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  CHECKLIST_GROUPS,
  getProgressBreakdown,
  isChecklistItemDone,
  useOnboarding,
} from "@/lib/onboarding-state";

export function RightChecklist() {
  const { state } = useOnboarding();
  const { stammdaten, uploads, signaturen, total } = getProgressBreakdown(state);

  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="rounded-xl border border-border bg-card/40 p-5 space-y-5">
        {/* Overall progress */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-card-foreground">Checkliste</h3>
            <span className="font-display text-base font-bold text-primary">{total}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-popover overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${total}%` }}
            />
          </div>
        </div>

        {/* Sub-progress bars */}
        <div className="space-y-2 text-xs text-secondary">
          <SubBar label="Stammdaten (50%)" pct={stammdaten} weight={50} />
          <SubBar label="Uploads (25%)" pct={uploads} weight={25} />
          <SubBar label="Signaturen (25%)" pct={signaturen} weight={25} />
        </div>

        {/* Checklist groups */}
        {CHECKLIST_GROUPS.map((g) => {
          // Filter items by legalForm / hasSoliver
          const visibleItems = g.items.filter((item) => {
            if (item.onlySoliver && !state.hasSoliver) return false;
            if (item.legalForms && state.legalForm && !item.legalForms.includes(state.legalForm)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={g.title} className="space-y-2">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h4>
              <ul className="space-y-1.5">
                {visibleItems.map((item) => {
                  const checked = isChecklistItemDone(item, state);
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.href as any}
                        className="flex items-center gap-3 group"
                      >
                        <span
                          aria-hidden
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                            checked
                              ? "bg-primary border-primary"
                              : "border-muted/60 bg-transparent",
                          ].join(" ")}
                        >
                          {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                        </span>
                        <span
                          className={[
                            "text-sm group-hover:text-card-foreground transition-colors",
                            checked ? "text-card-foreground" : "text-secondary",
                          ].join(" ")}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SubBar({ label, pct, weight }: { label: string; pct: number; weight: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-card-foreground">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-popover overflow-hidden">
        <div
          className="h-full bg-primary/50 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
