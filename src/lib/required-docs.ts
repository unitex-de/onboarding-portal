import type { LegalForm } from "./onboarding-state";

export interface RequiredDoc {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
  /** Erlaubt mehrere Uploads unter diesem Dokument (z.B. mehrere Ausweiskopien) */
  multi?: boolean;
}

export const REQUIRED_DOCS: Record<LegalForm, RequiredDoc[]> = {
  eK: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "gewerbeanmeldung",
      label: "Gewerbe-Anmeldung",
      hint: "Aktuelle Gewerbeanmeldung oder ein Gewerbesteuerbescheid.",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
  GbR: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "gewerbeanmeldung",
      label: "Gewerbe-Anmeldung",
      hint: "Aktuelle Gewerbeanmeldung oder ein Gewerbesteuerbescheid.",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
  GmbH: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "gesellschafterliste",
      label: "Gesellschafterliste",
      hint: "Aktuelle, beim Handelsregister hinterlegte Liste der Gesellschafter.",
      required: true,
    },
    {
      id: "gesellschaftsvertrag",
      label: "Gesellschaftsvertrag",
      hint: "Kopie des aktuellen Gesellschaftsvertrags (Satzung).",
      required: true,
    },
    {
      id: "jur_person_unterlagen",
      label: "Bei jur. Person als Gesellschafter alle Unterlagen von dieser",
      hint: "Falls ein Gesellschafter Ihres Unternehmens selbst eine juristische Person (z. B. eine andere GmbH oder Holding) ist, laden Sie bitte auch deren Nachweise hoch.",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
  GmbHCoKG: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
      multi: true,
      label: "Ausweiskopie aller Kommanditisten",
      hint: "Gültiger Personalausweis oder Reisepass aller Kommanditisten (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "gesellschafterliste",
      label: "Gesellschafterliste",
      hint: "Aktuelle, beim Handelsregister hinterlegte Liste der Gesellschafter.",
      required: true,
    },
    {
      id: "gesellschaftsvertrag",
      label: "Gesellschaftsvertrag",
      hint: "Kopie des aktuellen Gesellschaftsvertrags (Satzung).",
      required: true,
    },
    {
      id: "jur_person_unterlagen",
      label: "Bei jur. Person als Gesellschafter alle Unterlagen von dieser",
      hint: "Falls ein Gesellschafter Ihres Unternehmens selbst eine juristische Person (z. B. eine andere GmbH oder Holding) ist, laden Sie bitte auch deren Nachweise hoch.",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
  KG: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
      multi: true,
      label: "Ausweiskopie aller Kommanditisten",
      hint: "Gültiger Personalausweis oder Reisepass aller Kommanditisten (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "gesellschafterliste",
      label: "Gesellschafterliste",
      hint: "Aktuelle, beim Handelsregister hinterlegte Liste der Gesellschafter.",
      required: true,
    },
    {
      id: "gesellschaftsvertrag",
      label: "Gesellschaftsvertrag",
      hint: "Kopie des aktuellen Gesellschaftsvertrags (Satzung).",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
  OHG: [
    {
      id: "ausweiskopie_gf",
      multi: true,
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
      multi: true,
      label: "Ausweiskopie aller Kommanditisten",
      hint: "Gültiger Personalausweis oder Reisepass aller Kommanditisten (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "hr_auszug",
      label: "Auszug Handelsregister",
      hint: "Aktueller Auszug aus dem Handelsregister.",
      required: true,
    },
    {
      id: "gesellschafterliste",
      label: "Gesellschafterliste",
      hint: "Aktuelle, beim Handelsregister hinterlegte Liste der Gesellschafter.",
      required: true,
    },
    {
      id: "gesellschaftsvertrag",
      label: "Gesellschaftsvertrag",
      hint: "Kopie des aktuellen Gesellschaftsvertrags (Satzung).",
      required: true,
    },
    {
      id: "sonstige_dokumente",
      multi: true,
      label: "Sonstige Dokumente",
      hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
      required: false,
    },
  ],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Lieferant: only HR-Auszug
export const REQUIRED_DOCS_LIEFERANT: RequiredDoc[] = [
  {
    id: "hr_auszug_lieferant",
    label: "Auszug Handelsregister (aktuell)",
    hint: "Nicht älter als 3 Monate.",
    required: true,
  },
  {
    id: "sonstige_dokumente",
    multi: true,
    label: "Sonstige Dokumente",
    hint: "Weitere Unterlagen, die nicht in die Liste oben passen (z. B. Vollmachten, Zusatzvereinbarungen).",
    required: false,
  },
];

// Admin-only Dokumente: werden ausschließlich von Tanja/Admin hochgeladen und
// abgelegt, für den Kunden nie sichtbar. Zählen nicht zur Vollständigkeits-Prüfung.
export const ADMIN_ONLY_DOCS: RequiredDoc[] = [
  {
    id: "vertrag_kundenkartei",
    label: "Vertrag (Kundenkartei)",
    hint: "Unterschriebener Anschluss-Vertrag zur Ablage in der Kundenkartei.",
    required: false,
  },
  {
    id: "atradius_dokument",
    label: "Atradius-Dokument",
    hint: "Unterlagen von Atradius (z. B. Limitbestätigung), nur für die interne Ablage.",
    required: false,
  },
];