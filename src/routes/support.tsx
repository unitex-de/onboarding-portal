import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support | unitex Onboarding" }] }),
  component: SupportPage,
});

const FAQS = [
  {
    q: "Was ist eine GLN-Nummer und brauche ich eine?",
    a: "Die Global Location Number (GLN) ist eine eindeutige 13-stellige Kennung, mit der Standorte in der Lieferkette identifiziert werden. Sie benötigen pro Filiale eine eigene GLN. Falls Sie noch keine besitzen, beantragen wir diese kostenfrei für Sie.",
  },
  {
    q: "Wie lange dauert das Onboarding insgesamt?",
    a: "Nach vollständiger Einreichung Ihrer Unterlagen startet die Zentralregulierung (ZR) in der Regel innerhalb von 10 Werktagen (jeweils zum 01. des Folgemonats). Nach der Unterzeichnung erhalten Sie alle Dokumente vorab per PDF-Mail, danach meldet sich das Onboarding-Team persönlich für die nächsten Schritte.",
  },
  {
    q: "Welche Dokumente werden zwingend benötigt?",
    a: "Die Pflichtdokumente hängen von Ihrer Rechtsform ab. Eine vollständige Liste finden Sie im Upload-Center.",
  },
  {
    q: "Was ist die bankgesicherte Zentralregulierung (ZR) der unitex?",
    a: "Die ZR ist das Herzstück der unitex-FashionCommunity. Über ein bankgesichertes Abrechnungssystem (in Kooperation mit der RSB Retail+Service Bank GmbH) werden alle Rechnungen, Gutschriften und Zahlungsströme zwischen Händlern und Lieferanten über ein zentrales Warenkonto abgewickelt.",
  },
  {
    q: "Was ist das unitex-Rechnungsportal und wie erhalte ich Zugang?",
    a: "Das Rechnungsportal (technisch bereitgestellt durch GRÜN RAW) ist die 100 % digitale Plattform für Ihr Belegmanagement. Nach erfolgreichem Onboarding erhalten Sie Ihre Zugangsdaten per E-Mail. Sie registrieren sich online unter Angabe Ihrer zugewiesenen Mitglieds- oder Lieferantennummer. Eine Softwareinstallation ist nicht nötig – ein Internetzugang genügt.",
  },
  {
    q: "Wie und wann erhalte ich meine Abrechnungen?",
    a: "Die Abrechnung erfolgt in sogenannten Dekaden. Rechnungen und Gutschriften werden dreimal im Monat zusammengezogen und saldiert (jeweils zum 5., 15. und 25. eines Monats). Sie erhalten eine übersichtliche ZR-Abrechnung (Kontoauszug und Buchungsaufstellung) direkt in Ihrem RSB-Webportal.",
  },
];

function SupportPage() {
  return (
    <AppShell
      title="Support"
      subtitle="Wir helfen Ihnen persönlich - telefonisch, per E-Mail oder über unsere FAQ."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6 items-start">

        {/* LINKE SPALTE: Kontaktkarten */}
        <div className="flex flex-col gap-6">

          {/* Tanja Lemke */}
          <aside className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 font-display text-base font-semibold text-primary">
                TL
              </div>
              <div>
                <p className="font-display text-base font-semibold">Tanja Lemke</p>
                <p className="text-xs text-secondary">Vertragswesen</p>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+497317079452" className="text-foreground hover:underline">
                  +49 731 707 94 52
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:t.lemke@unitex.de" className="text-foreground hover:underline">
                  t.lemke@unitex.de
                </a>
              </li>
            </ul>
          </aside>

          {/* unitex Onboarding-Team */}
          <aside className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 font-display text-sm font-semibold text-primary leading-tight text-center">
                <span>uni<br />tex</span>
              </div>
              <div>
                <p className="font-display text-base font-semibold">unitex Onboarding-Team</p>
                <p className="text-xs text-secondary">Allgemeiner Support</p>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:projekte@unitex.de" className="text-foreground hover:underline">
                  projekte@unitex.de
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-foreground">Mo–Fr, 09:00–17:00 Uhr</span>
              </li>
            </ul>
          </aside>

        </div>
        {/* END LINKE SPALTE */}

        {/* RECHTE SPALTE: FAQs */}
        <section className="rounded-2xl border border-border bg-card p-8 lg:sticky lg:top-6">
          <h3 className="font-display text-lg font-semibold">Häufige Fragen</h3>
          <p className="mt-1 text-sm text-secondary">Die wichtigsten Antworten rund um Ihr Onboarding bei unitex.</p>

          <Accordion type="single" collapsible className="mt-6">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-foreground hover:no-underline hover:text-primary">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-secondary leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

      </div>
    </AppShell>
  );
}
