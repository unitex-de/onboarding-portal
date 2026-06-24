import type { ReactNode } from "react";
import { useState } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightChecklist } from "./RightChecklist";
import { TopHeader } from "./TopHeader";
import { CollaboratorInvite } from "./CollaboratorInvite";

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

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <LeftSidebar onInviteClick={() => setShowInvite(true)} />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopHeader title={title} subtitle={subtitle} />
        <div className="flex-1 px-10 pb-12">{children}</div>
      </main>
      <RightChecklist onInviteClick={() => setShowInvite(true)} />
      {showInvite && <CollaboratorInvite onClose={() => setShowInvite(false)} />}
    </div>
  );
}
