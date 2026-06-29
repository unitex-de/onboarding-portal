import { Check, UserPlus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  CHECKLIST_GROUPS,
  getProgressBreakdown,
  isChecklistItemDone,
  useOnboarding,
} from "@/lib/onboarding-state";
import { Button } from "@/components/ui/button";

export function ChecklistContent({
  onInviteClick,
  onNavigate,
}: {
  onInviteClick?: () => void;
  /** Called after navigating so a parent sheet can close itself */
  onNavigate?: () => void;
}) {
  const { state } = useOnboarding();
  const navigate = useNavigate();
  const { stammdaten, uploads, signaturen, total } = getProgressBreakdown(state);
  const isAdmin = state.role === "admin";

  const pdfHref = state.memberType === "lieferant"
    ? "/lieferant-zr-onboarding-checkliste.pdf"
    : "/haendler-zr-onboarding-checkliste.pdf";

  const barColor = total === 100 ? "bg-emerald-500" : "bg-primary";

  const handleChecklistClick = (href: string) => {
    const hashIdx = href.indexOf("#");
    if (hashIdx === -1) {
      navigate({ to: href as any });
      onNavigate?.();
      return;
    }
    const routePath = href.slice(0, hashIdx);
    const sectionId = href.slice(hashIdx + 1);

    navigate({ to: routePath as any }).then(() => {
      onNavigate?.();
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary/40");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary/40"), 1500);
        }
      }, 200);
    });
  };

  return (
    <div className="space-y-5">
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

      {/* Sub-progress bars */}
      <div className="space-y-2 text-xs text-secondary">
        <SubBar label="01. Unternehmensdaten" pct={stammdaten} colorClass="bg-primary" />
        <SubBar label="02. Dokumente" pct={uploads} colorClass="bg-primary/70" />
        <SubBar label="03. Onboarding abschließen" pct={signaturen} colorClass="bg-primary/40" />
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
            <ul className="space-y-px">
              {visibleItems.map((item) => {
                const checked = isChecklistItemDone(item, state);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleChecklistClick(item.href)}
                      className="flex items-center gap-3 group w-full text-left min-h-[44px] xl:min-h-0 xl:py-1"
                    >
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* Mitbearbeiter einladen – nur für Kunden */}
      {!isAdmin && onInviteClick && (
        <button
          type="button"
          onClick={onInviteClick}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-secondary hover:text-foreground hover:border-primary/60 transition-colors min-h-[44px]"
        >
          <UserPlus className="h-4 w-4" />
          Mitbearbeiter einladen
        </button>
      )}

      <div data-tour="checklist-download" className="border-t border-border pt-4">
        <Button asChild variant="secondary" className="w-full bg-[#FACBBA] text-[#0D1B2A] hover:bg-[#f8b9ac]">
          <a href={pdfHref} download>
            Checkliste herunterladen
          </a>
        </Button>
      </div>
    </div>
  );
}

export function RightChecklist({ onInviteClick }: { onInviteClick?: () => void }) {
  return (
    <aside data-tour="right-checklist" className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="rounded-xl border border-border bg-card/40 p-5">
        <ChecklistContent onInviteClick={onInviteClick} />
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
