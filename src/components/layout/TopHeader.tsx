import { useOnboarding } from "@/lib/onboarding-state";

export function TopHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { state } = useOnboarding();
  const initials = state.userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex items-start justify-between gap-6 px-10 pt-8 pb-6">
      <div>
        {title && <h2 className="font-display text-3xl font-bold text-foreground">{title}</h2>}
        {subtitle && <p className="mt-2 text-sm text-secondary">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive-soft text-sm font-semibold text-destructive">
          {initials}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground leading-tight">{state.userName}</p>
          <p className="text-xs text-secondary leading-tight">{state.companyName}</p>
        </div>
      </div>
    </header>
  );
}