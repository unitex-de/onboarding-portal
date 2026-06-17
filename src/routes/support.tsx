import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  useOnboarding,
  getResponsibleAdmin,
  SUPPORT_TANJA,
  SUPPORT_ANNE,
  type SupportContact,
} from "@/lib/onboarding-state";

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
    a: "Das Rechnungsportal (technisch bereitgestellt durch GRÜN RAW) ist die 100 % digitale Plattform für Ihr Belegmanagement. Nach erfolgreichem Onboarding erhalten Sie Ihre Zugangsdaten per E-Mail.",
  },
  {
    q: "Wie und wann erhalte ich meine Abrechnungen?",
    a: "Die Abrechnung erfolgt in sogenannten Dekaden. Rechnungen und Gutschriften werden dreimal im Monat zusammengezogen und saldiert (jeweils zum 5., 15. und 25. eines Monats).",
  },
];

/** Avatar: Foto wenn vorhanden, sonst Initialen */
function Avatar({ src, initials }: { src?: string; initials: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={initials}
        className="h-14 w-14 rounded-full object-cover object-top shrink-0"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 font-display text-base font-semibold text-primary shrink-0">
      {initials}
    </div>
  );
}

function ContactCard({ contact }: { contact: SupportContact & { photoUrl?: string } }) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        <Avatar src={contact.photoUrl} initials={contact.initials} />
        <div>
          <p className="font-display text-base font-semibold">{contact.name}</p>
          <p className="text-xs text-secondary">{contact.role}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-sm">
        <li className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-primary shrink-0" />
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="text-foreground hover:underline">
            {contact.phone}
          </a>
        </li>
        <li className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-primary shrink-0" />
          <a href={`mailto:${contact.email}`} className="text-foreground hover:underline">
            {contact.email}
          </a>
        </li>
      </ul>
    </aside>
  );
}

/** Map initials → photo path */
const PHOTO_MAP: Record<string, string> = {
  TL: "/team/tl.png",
  AH: "/team/ah.png",
  SS: "/team/ss.png",
  OB: "/team/ob.png",
  TR: "/team/tr.png",
  KB: "/team/kb.png",
};

function SupportPage() {
  const { state } = useOnboarding();

  const responsibleAdmin = getResponsibleAdmin(
    state.memberType,
    state.postalCode,
    state.country
  );

  const alwaysShown: SupportContact[] = [SUPPORT_TANJA, SUPPORT_ANNE];
  const contacts = [
    ...alwaysShown,
    ...(alwaysShown.some((c) => c.email === responsibleAdmin.email) ? [] : [responsibleAdmin]),
  ].map((c) => ({ ...c, photoUrl: PHOTO_MAP[c.initials] }));

  return (
    <AppShell
      title="Support"
      subtitle="Wir helfen Ihnen persönlich – telefonisch, per E-Mail oder über unsere FAQ."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6 items-start">
        <div className="flex flex-col gap-6">
          {contacts.map((c) => (
            <ContactCard key={c.email} contact={c} />
          ))}
        </div>

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
