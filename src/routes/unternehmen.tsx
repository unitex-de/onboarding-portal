import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/unternehmen")({
  head: () => ({ meta: [{ title: "Unternehmen | unitex Onboarding" }] }),
  component: () => (
    <AppShell title="Unternehmen" subtitle="Stammdaten, Bankdaten, GLN & Filialen, Geschäftsdaten.">
      <SectionPlaceholder name="Stammdaten-Formular" />
    </AppShell>
  ),
});