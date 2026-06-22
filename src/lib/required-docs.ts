import type { LegalForm } from "./onboarding-state";

export interface RequiredDoc {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}

export const REQUIRED_DOCS: Record<LegalForm, RequiredDoc[]> = {
  eK: [
    {
      id: "ausweiskopie_gf",
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
      required: false,
    },
  ],
  GbR: [
    {
      id: "ausweiskopie_gf",
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
      required: false,
    },
  ],
  GmbH: [
    {
      id: "ausweiskopie_gf",
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
      required: false,
    },
  ],
  GmbHCoKG: [
    {
      id: "ausweiskopie_gf",
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
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
      required: false,
    },
  ],
  KG: [
    {
      id: "ausweiskopie_gf",
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
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
  ],
  OHG: [
    {
      id: "ausweiskopie_gf",
      label: "Ausweiskopie Geschäftsführung/Inhaber",
      hint: "Gültiger Personalausweis oder Reisepass der Geschäftsführung und aller am Unternehmen beteiligter Personen (Vorder- und Rückseite).",
      required: true,
    },
    {
      id: "ausweiskopie_kommanditisten",
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
  ],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Lieferant: only HR-Auszug
export const REQUIRED_DOCS_LIEFERANT = [
  {
    id: "hr_auszug_lieferant",
    label: "Auszug Handelsregister (aktuell)",
    hint: "Nicht älter als 3 Monate.",
    required: true,
  },
];
