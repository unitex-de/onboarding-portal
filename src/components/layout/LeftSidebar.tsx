import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home, MessageCircleQuestion, ShieldCheck, LogOut, Check, Circle,
  CheckSquare, HelpCircle, X,
} from "lucide-react";
import { UnitexLogo } from "../ui/UnitexLogo";
import { useOnboarding, getSectionIds, getRequiredDocIds } from "@/lib/onboarding-state";

function StepIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted/60">
      <Circle className="h-2.5 w-2.5 text-muted/60" />
    </span>
  );
}

export function LeftSidebar({
  onInviteClick: _onInviteClick,
  isOpen = false,
  onClose,
}: {
  onInviteClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { state, update } = useOnboarding();
  const isAdmin = state.role === "admin";

  const handleLogout = () => {
    update({ signedIn: false, role: "kunde", activeCustomerId: null });
    navigate({ to: "/" });
  };

  // ── Step completion indicators ─────────────────────────────────────────────
  const sectionIds = getSectionIds(state.memberType);
  const step1Done = sectionIds.every((id) => state.completedSections[id]);

  const requiredDocIds = getRequiredDocIds(state.legalForm, state.memberType);
  const step2Done = requiredDocIds.length > 0 && requiredDocIds.every((id) => state.uploadedDocs[id]);

  const step3Done = !!state.completedSections["abschluss"];

  const isActive = (to: string) =>
    pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  const navItemClass = (to: string) =>
    [
      "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors min-h-[44px]",
      isActive(to)
        ? "bg-popover text-card-foreground"
        : "text-secondary hover:text-card-foreground hover:bg-popover/50",
    ].join(" ");

  // Close drawer on mobile after navigation
  const handleNavClick = () => {
    onClose?.();
  };

  // ── Tour starten handler ───────────────────────────────────────────────────
  const handleTourStart = () => {
    update({ pendingTourStart: true });
    onClose?.();
    navigate({ to: "/dashboard" });
  };

  const showTourButton = !isAdmin && state.dashboardSeen;

  return (
    <aside
      className={[
        // Base styles
        "flex flex-col bg-card border-r border-border",
        // Mobile: fixed overlay drawer, slides in from left
        "fixed inset-y-0 left-0 z-40 w-[280px] transition-transform duration-300 ease-in-out",
        // Desktop: static in flex flow, always visible
        "lg:static lg:w-[240px] lg:z-auto lg:translate-x-0 lg:h-screen lg:sticky lg:top-0",
        // Show/hide on mobile
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Close button – mobile only */}
      <button
        type="button"
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-popover/60 transition-colors"
        aria-label="Menü schließen"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Logo + Claim */}
      <div className="flex flex-row items-end gap-3 p-6 pr-12 lg:pr-6">
        <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
          <UnitexLogo className="h-4 w-[60px] text-slate-900" />
        </div>
        <span className="text-[10px] leading-tight font-medium">
          VERTRAUEN.<br />
          KOMPETENZ.<br />
          <span className="text-[#FACBBA]">INNOVATION.</span>
        </span>
      </div>

      {/* Admin badge */}
      {isAdmin && (
        <div className="mx-3 mb-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-medium text-primary">Admin-Ansicht</span>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <Link to="/dashboard" className={navItemClass("/dashboard")} onClick={handleNavClick}>
          {isActive("/dashboard") && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
          )}
          <Home className="h-5 w-5" strokeWidth={1.75} />
          <span>Dashboard</span>
        </Link>

        {/* ── Separator + 3-Schritt-Navigation ── */}
        {(
          <>
            <div className="my-2 border-t border-border" />

            {/* Schritt 1: Unternehmensdaten */}
            <Link to="/unternehmen" className={navItemClass("/unternehmen")} onClick={handleNavClick}>
              {isActive("/unternehmen") && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <StepIcon done={step1Done} />
              <span>01. Unternehmensdaten</span>
            </Link>

            {/* Schritt 2: Dokumente */}
            <Link to="/upload-center" className={navItemClass("/upload-center")} onClick={handleNavClick}>
              {isActive("/upload-center") && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <StepIcon done={step2Done} />
              <span>02. Dokumente</span>
            </Link>

            {/* Schritt 3: Onboarding abschließen */}
            <Link to="/signaturen" className={navItemClass("/signaturen")} onClick={handleNavClick}>
              {isActive("/signaturen") && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <StepIcon done={step3Done} />
              <span>03. Onboarding abschließen</span>
            </Link>

            <div className="my-2 border-t border-border" />

            {showTourButton && (
              <button
                type="button"
                onClick={handleTourStart}
                className="relative flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors text-secondary hover:text-card-foreground hover:bg-popover/50 min-h-[44px]"
              >
                <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
                <span>Tour starten</span>
              </button>
            )}
          </>
        )}

        {/* Admin-Bereich */}
        {isAdmin && (
          <>
            <Link
              to="/admin"
              onClick={handleNavClick}
              className={[
                "relative flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors min-h-[44px]",
                pathname === "/admin"
                  ? "bg-primary/15 text-primary"
                  : "text-primary/70 hover:text-primary hover:bg-primary/10",
              ].join(" ")}
            >
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
              <span>Kunden-Übersicht</span>
            </Link>
            <Link to="/signaturen" className={navItemClass("/signaturen")} onClick={handleNavClick}>
              {isActive("/signaturen") && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <CheckSquare className="h-5 w-5" strokeWidth={1.75} />
              <span>Signaturen</span>
            </Link>
          </>
        )}

        {/* Hilfe & Kontakt */}
        <Link to="/support" className={navItemClass("/support")} onClick={handleNavClick}>
          {isActive("/support") && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
          )}
          <MessageCircleQuestion className="h-5 w-5" strokeWidth={1.75} />
          <span>Hilfe &amp; Kontakt</span>
        </Link>
      </nav>

      {/* Abmelden */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-secondary hover:text-foreground hover:bg-popover/50 transition-colors min-h-[44px]"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.75} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>
  );
}
