import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  CHECKLIST_GROUPS,
  getProgressBreakdown,
  isChecklistItemDone,
  useOnboarding,
} from "@/lib/onboarding-state";
import { Button } from "@/components/ui/button";

export function RightChecklist() {
  const { state } = useOnboarding();
  const { stammdaten, uploads, signaturen, total } = getProgressBreakdown(state);
  const pdfHref = state.memberType === "lieferant"
    ? "/lieferant-zr-onboarding-checkliste.pdf"
    : "/haendler-zr-onboarding-checkliste.pdf";

  // Color logic matching the main progress bar
  const barColor = total === 100
    ? "bg-emerald-500"
    : total >= 75
    ? "bg-primary"
    : "bg-primary";

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
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${total}%` }}
            />
          </div>
        </div>

        {/* Sub-progress bars — same color family as main bar */}
        <div className="space-y-2 text-xs text-secondary">
          <SubBar label="01. Unternehmensdaten" pct={stammdaten} colorClass="bg-primary" />
          <SubBar label="02. Dokumenten-Uploads" pct={uploads} colorClass="bg-primary/70" />
          <SubBar label="03. Verträge & Signaturen" pct={signaturen} colorClass="bg-primary/40" />
        </div>

        {/* Checklist groups */}
        {CHECKLIST_GROUPS.map((g) => {
          const visibleItems = g.items.filter((item) => {
            if (item.onlySoliver && !state.hasSoliver) return false;
            if (item.legalForms && state.legalForm && !item.legalForms.includes(state.legalForm)) return false;
            if (item.memberTypes && state.memberType && !item.memberTypes.includes(state.memberType)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={g.title} className="space-y-2">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h4>
              <ul className="space-y-1.5">
                {visibleItems.map((item) => {
                  const checked = isChecklistItemDone(item, state);
                  const isHashLink = item.href.includes("#");
                  const content = (
                    <>
                      <span aria-hidden
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          checked ? "bg-primary border-primary" : "border-muted/60 bg-transparent",
                        ].join(" ")}
                      >
                        {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                      </span>
                      <span className={[
                        "text-sm group-hover:text-card-foreground transition-colors",
                        checked ? "text-card-foreground" : "text-secondary",
                      ].join(" ")}>
                        {item.label}
                      </span>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {isHashLink ? (
                        <a href={item.href} className="flex items-center gap-3 group">
                          {content}
                        </a>
                      ) : (
                        <Link to={item.href as any} className="flex items-center gap-3 group">
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="pt-4 border-t border-border">
          <Button asChild variant="secondary" className="w-full bg-[#FACBBA] text-[#0D1B2A] hover:bg-[#f8b9ac]">
            <a href={pdfHref} download>
              Checkliste herunterladen
            </a>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function SubBar({ label, pct, colorClass }: { label: string; pct: number; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-card-foreground font-medium">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-popover overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
