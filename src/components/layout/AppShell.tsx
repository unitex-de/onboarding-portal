import type { ReactNode } from "react";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
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
  const { state } = useOnboarding();
  const isAdmin = state.role === "admin";

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
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

      <main className="flex-1 min-w-0 flex flex-col">
        <TopHeader
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex-1 px-4 sm:px-6 lg:px-10 pb-20 lg:pb-12">{children}</div>
      </main>

      <RightChecklist onInviteClick={() => setShowInvite(true)} />

      {/* Mobile checklist FAB – visible below xl, hidden for admins */}
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
  );
}
