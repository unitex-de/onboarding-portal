import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Eye } from "lucide-react";
import { LeftSidebar } from "./LeftSidebar";
import { RightChecklist } from "./RightChecklist";
import { TopHeader } from "./TopHeader";
import { CollaboratorInvite } from "./CollaboratorInvite";
import { MobileChecklistSheet } from "./MobileChecklistSheet";
import { useOnboarding } from "@/lib/onboarding-state";
export function AppShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { state, isAdmin, update } = useOnboarding();
  const navigate = useNavigate();
  // Vorschau verlassen: previewMode + activeCustomerId zurücksetzen, zurück
  // zur Kundenliste. Bewusst kein reset() der Sammel-Funktion, weil die
  // Admin-Session (role, customerAccounts, etc.) erhalten bleiben soll.
  const handleExitPreview = () => {
    update({ previewMode: false, activeCustomerId: null });
    navigate({ to: "/admin" });
  };
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* QA-Vorschau-Banner – nur sichtbar, wenn ein Admin sich gerade als
          Kunde ansieht (previewMode). isAdmin selbst ist hier bewusst NICHT
          die Bedingung, da isAdmin per Definition false ist, solange
          previewMode aktiv ist. */}
      {state.previewMode && (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Vorschau: Ansicht wie <strong>{state.companyName || "der Kunde"}</strong> sie sieht (read-only)
          </span>
          <button
            type="button"
            onClick={handleExitPreview}
            className="ml-1 shrink-0 rounded-md border border-amber-950/30 px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-amber-950/10"
          >
            Vorschau verlassen
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Mobile backdrop for sidebar drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <LeftSidebar
          onInviteClick={() => setShowInvite(true)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <TopHeader
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div className="flex-1 px-4 sm:px-6 lg:px-10 pb-20 lg:pb-12">{children}</div>
        </main>
        <RightChecklist onInviteClick={() => setShowInvite(true)} />
        {/* Mobile checklist FAB – visible below xl, hidden for admins (und
            damit automatisch auch für den Admin selbst während previewMode,
            weil isAdmin dann false ist) */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setChecklistOpen(true)}
            className="fixed bottom-5 right-5 z-20 xl:hidden flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
            aria-label="Checkliste öffnen"
          >
            <ClipboardList className="h-5 w-5" />
            <span>Checkliste</span>
          </button>
        )}
        {checklistOpen && (
          <MobileChecklistSheet
            onClose={() => setChecklistOpen(false)}
            onInviteClick={() => setShowInvite(true)}
          />
        )}
        {showInvite && <CollaboratorInvite onClose={() => setShowInvite(false)} />}
      </div>
    </div>
  );
}