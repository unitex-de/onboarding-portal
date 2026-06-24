import { useOnboarding } from "@/lib/onboarding-state";
import { ShieldCheck, Menu } from "lucide-react";

export function TopHeader({
  title,
  subtitle,
  onMenuClick,
}: {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
}) {
  const { state } = useOnboarding();
  const initials = state.userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = state.role === "admin";

  return (
    <div>
      {/* Admin-Hinweis Banner */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-primary/10 border-b border-primary/20 px-4 sm:px-6 lg:px-10 py-2">
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
      <header className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 pt-5 pb-4 lg:pt-8 lg:pb-6">
        {/* Hamburger – mobile only */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary hover:text-foreground hover:bg-popover/50 transition-colors"
          aria-label="Menü öffnen"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs sm:text-sm text-secondary truncate">{subtitle}</p>
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isAdmin && (
            <span className="hidden sm:inline rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
              Admin
            </span>
          )}
          <div className={[
            "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-sm font-semibold shrink-0",
            isAdmin ? "bg-primary/20 text-primary border border-primary/30" : "bg-destructive-soft text-destructive",
          ].join(" ")}>
            {initials}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-tight">{state.userName}</p>
            <p className="text-xs text-secondary leading-tight">{state.companyName}</p>
          </div>
        </div>
      </header>
    </div>
  );
}
