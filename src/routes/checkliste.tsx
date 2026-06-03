import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/checkliste")({
  head: () => ({ meta: [{ title: "Checkliste | unitex Onboarding" }] }),
  component: () => (
    <AppShell title="Checkliste" subtitle="Übersicht aller offenen und erledigten Aufgaben.">
      <SectionPlaceholder name="Checkliste" />
    </AppShell>
  ),
});