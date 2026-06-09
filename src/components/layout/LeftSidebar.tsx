import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Building2, FolderUp, PenLine, MessageCircleQuestion } from "lucide-react";
import { UnitexLogo } from "../ui/UnitexLogo";

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
      <div className="flex flex-row items-end gap-3 p-6">
  
        {/* Der weiße Hintergrund-Kasten mit dem Logo */}
        <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
          <UnitexLogo className="h-4 w-[60px] text-slate-900" />
        </div>
        
        {/* ÄNDERUNG HIER: pb-1.5 zieht den Slogan auf die exakt gleiche Grundlinie wie das Logo */}
        <span className="text-[10px] leading-tight  font-medium">
          VERTRAUEN.<br />KOMPETENZ.<br />INNOVATION.
        </span>
        
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