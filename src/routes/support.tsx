import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support | unitex Onboarding" }] }),
  component: () => (
    <AppShell title="Support" subtitle="Ihr direkter Draht zum unitex Onboarding-Team.">
      <SectionPlaceholder name="Support & FAQ" />
    </AppShell>
  ),
});