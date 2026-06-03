import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/signaturen")({
  head: () => ({ meta: [{ title: "Signaturen | unitex Onboarding" }] }),
  component: () => (
    <AppShell title="Signaturen" subtitle="Anschluss-Vertrag, SEPA-Mandat und Zusatzformulare digital unterschreiben.">
      <SectionPlaceholder name="Signaturen (PandaDoc)" />
    </AppShell>
  ),
});