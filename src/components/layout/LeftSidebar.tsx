import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, FolderUp, PenLine, MessageCircleQuestion } from "lucide-react";

const items = [
  { to: "/dashboard",     label: "Dashboard",     icon: Home },
  { to: "/unternehmen",   label: "Unternehmen",   icon: Building2 },
  { to: "/upload-center", label: "Upload-Center", icon: FolderUp },
  { to: "/signaturen",    label: "Signaturen",    icon: PenLine },
  { to: "/support",       label: "Support",       icon: MessageCircleQuestion },
] as const;

export function LeftSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col bg-card border-r border-border h-screen sticky top-0">
      <div className="px-6 pt-8 pb-10">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-display text-2xl font-bold leading-tight text-card-foreground">unitex</span>
          <span className="text-[10px] leading-tight text-secondary">
            Vertrauen.<br />Kompetenz.<br />Innovation.
          </span>
        </div>
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
    </aside>
  );
}
