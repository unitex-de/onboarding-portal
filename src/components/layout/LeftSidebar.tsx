import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CheckSquare, Building2, FolderUp, PenLine, LifeBuoy } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/checkliste", label: "Checkliste", icon: CheckSquare },
  { to: "/unternehmen", label: "Unternehmen", icon: Building2 },
  { to: "/upload-center", label: "Upload-Center", icon: FolderUp },
  { to: "/signaturen", label: "Signaturen", icon: PenLine },
  { to: "/support", label: "Support", icon: LifeBuoy },
] as const;

export function LeftSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col bg-card border-r border-border min-h-screen sticky top-0">
      <div className="px-6 pt-8 pb-10">
        <h1 className="font-display text-2xl font-bold leading-tight text-card-foreground">
          Onboarding
          <br />
          Portal
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={[
                "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-popover text-card-foreground"
                  : "text-secondary hover:text-card-foreground hover:bg-popover/50",
              ].join(" ")}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-6 border-t border-border">
        <div className="flex items-end gap-2">
          <span className="font-display text-xl font-bold text-card-foreground">unitex</span>
          <span className="text-[10px] leading-tight text-secondary">
            Vertrauen.<br />Kompetenz.<br />Innovation.
          </span>
        </div>
      </div>
    </aside>
  );
}