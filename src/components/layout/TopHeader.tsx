import { useOnboarding } from "@/lib/onboarding-state";
import { ShieldCheck } from "lucide-react";

export function TopHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { state } = useOnboarding();
  const initials = state.userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = state.role === "admin";

  // "Guten Tag, Vorname Nachname" – show full name
  const displayTitle = title ?? `Guten Tag, ${state.userName}`;

  return (
    <div>
      {/* Admin-Hinweis Banner – immer sichtbar für Admins */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-10 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs text-primary font-medium">
            Sie befinden sich in der Admin-Ansicht
            {state.activeCustomerId && state.companyName && (
              <span className="ml-1 text-primary/70">
                — Konto: <strong>{state.companyName}</strong>
              </span>
            )}
          </p>
        </div>
      )}
      <header className="flex items-start justify-between gap-6 px-10 pt-8 pb-6">
        <div>
          {title && <h2 className="font-display text-3xl font-bold text-foreground">{title}</h2>}
          {subtitle && <p className="mt-2 text-sm text-secondary">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              Admin
            </span>
          )}
          <div className={[
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
            isAdmin ? "bg-primary/20 text-primary border border-primary/30" : "bg-destructive-soft text-destructive",
          ].join(" ")}>
            {initials}
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground leading-tight">{state.userName}</p>
            <p className="text-xs text-secondary leading-tight">{state.companyName}</p>
          </div>
        </div>
      </header>
    </div>
  );
}
