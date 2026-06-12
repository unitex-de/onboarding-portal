import type { ReactNode } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightChecklist } from "./RightChecklist";
import { TopHeader } from "./TopHeader";
import { TourRestartButton } from "@/components/ui/OnboardingTour";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <LeftSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <TopHeader title={title} subtitle={subtitle} />
        <div className="flex-1 px-10 pb-12">{children}</div>
      </main>
      <RightChecklist />
      <TourRestartButton />
    </div>
  );
}
