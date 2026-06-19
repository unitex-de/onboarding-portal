import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Building2, FolderUp, PenLine, MessageCircleQuestion, ShieldCheck, LogOut } from "lucide-react";
import { UnitexLogo } from "../ui/UnitexLogo";
import { useOnboarding } from "@/lib/onboarding-state";

const NAV_ITEMS = [
  { to: "/dashboard",     label: "Dashboard",         icon: Home },
  { to: "/unternehmen",   label: "Unternehmensdaten",   icon: Building2 },
  { to: "/upload-center", label: "Dokumente",  icon: FolderUp },
  { to: "/signaturen",    label: "Signaturen",         icon: PenLine },
  { to: "/support",       label: "Hilfe & Kontakt",   icon: MessageCircleQuestion },
] as const;

export function LeftSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { state, update } = useOnboarding();
  const isAdmin = state.role === "admin";

  const handleLogout = () => {
    update({ signedIn: false, role: "kunde", activeCustomerId: null });
    navigate({ to: "/" });
  };

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col bg-card border-r border-border h-screen sticky top-0">
      <div className="flex flex-row items-end gap-3 p-6">
        <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
          <UnitexLogo className="h-4 w-[60px] text-slate-900" />
        </div>
        <span className="text-[10px] leading-tight font-medium">
          VERTRAUEN.<br />
          KOMPETENZ.<br />
          <span className="text-[#FACBBA]">INNOVATION.</span>
        </span>
      </div>

      {/* Admin badge in sidebar */}
      {isAdmin && (
        <div className="mx-3 mb-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-medium text-primary">Admin-Ansicht</span>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
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

        {/* Admin-Bereich Link – NUR für Admins sichtbar */}
        {isAdmin && (
          <Link
            to="/admin"
            className={[
              "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/admin"
                ? "bg-primary/15 text-primary"
                : "text-primary/70 hover:text-primary hover:bg-primary/10",
            ].join(" ")}
          >
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            <span>Kunden-Übersicht</span>
          </Link>
        )}
      </nav>

      {/* Bottom: Abmelden */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-secondary hover:text-foreground hover:bg-popover/50 transition-colors"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
