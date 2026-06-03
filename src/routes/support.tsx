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
    a: "Nach vollständiger Einreichung Ihrer Unterlagen erfolgt der ZR-Start in der Regel innerhalb von 10 Werktagen. Die GLN-Beantragung und RSB-Anmeldung laufen parallel im Hintergrund.",
  },
  {
    q: "Welche Dokumente werden zwingend benötigt?",
    a: "Die Pflichtdokumente hängen von Ihrer Rechtsform ab. Eine vollständige Liste finden Sie im Upload-Center. GmbHs benötigen beispielsweise Handelsregisterauszug, Gesellschaftsvertrag und Gesellschafterliste.",
  },
  {
    q: "Was passiert nach dem Unterschreiben der Verträge?",
    a: "Sie erhalten eine Bestätigungsmail mit allen Vertragsdokumenten als PDF. Unser Onboarding-Team meldet sich anschließend persönlich bei Ihnen, um die nächsten Schritte zu besprechen.",
  },
  {
    q: "Kann ich meinen Vertrag später ändern (z.B. 3J → 5J)?",
    a: "Ja. Wechsel auf eine längere Laufzeit sind jederzeit möglich und werden mit besseren Konditionen belohnt. Sprechen Sie uns einfach an.",
  },
];

function SupportPage() {
  return (
    <AppShell
      title="Support"
      subtitle="Wir helfen Ihnen persönlich – telefonisch, per E-Mail oder über unsere FAQ."
    >
      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Contact card */}
        <aside className="rounded-2xl border border-border bg-card p-6 sticky top-6">
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
              <a href="tel:+4905214567890" className="text-foreground hover:underline">
                +49 731 707 94 52
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:t.lemke@unitex.de" className="text-foreground hover:underline">
                t.lemke@unitex.de
              </a>
            </li>
            <li className="flex items-center gap-3 text-secondary">
              <Clock className="h-4 w-4 text-primary" />
              Mo–Fr · 08:30 – 17:00 Uhr
            </li>
          </ul>

          <p className="mt-6 rounded-lg bg-popover p-3 text-xs text-secondary">
            Antwortzeit innerhalb von 24 Stunden an Werktagen.
          </p>
        </aside>

        {/* FAQ */}
        <section className="rounded-2xl border border-border bg-card p-8">
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