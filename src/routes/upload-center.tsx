import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";

export const Route = createFileRoute("/upload-center")({
  head: () => ({ meta: [{ title: "Upload-Center | unitex Onboarding" }] }),
  component: () => (
    <AppShell title="Dokumenten-Upload" subtitle="Pflichtdokumente für Ihren ZR-Beitritt.">
      <SectionPlaceholder name="Upload-Center" />
    </AppShell>
  ),
});