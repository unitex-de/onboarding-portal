import type { LegalForm } from "./onboarding-state";

export interface RequiredDoc {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}

export const REQUIRED_DOCS: Record<LegalForm, RequiredDoc[]> = {
  eK: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie GF / Inhaber",          hint: "Vorder- und Rückseite", required: true },
    { id: "gewerbeanmeldung",      label: "Gewerbeanmeldung",                    required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister",              hint: "Optional", required: false },
  ],
  GbR: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", required: true },
    { id: "gewerbeanmeldung",      label: "Gewerbeanmeldung",                    required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister",              hint: "Optional", required: false },
  ],
  GmbH: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister (aktuell)",   required: true },
    { id: "gesellschafterliste",   label: "Gesellschafterliste",                 hint: "Aus Handelsregister oder selbst erstellt", required: true },
    { id: "gesellschaftsvertrag",  label: "Gesellschaftsvertrag",               required: true },
    { id: "jur_person_unterlagen", label: "Unterlagen jur. Person als Gesellschafter", hint: "Nur wenn eine juristische Person Gesellschafter ist", required: false },
  ],
  GmbHCoKG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               required: true },
    { id: "jur_person_unterlagen",       label: "Unterlagen jur. Person als Gesellschafter", hint: "Nur wenn eine juristische Person Gesellschafter ist", required: false },
  ],
  KG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               required: true },
  ],
  OHG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               required: true },
  ],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Lieferant: only HR-Auszug
export const REQUIRED_DOCS_LIEFERANT = [
  { id: "hr_auszug_lieferant", label: "Auszug Handelsregister (aktuell)", hint: "Nicht älter als 3 Monate", required: true },
];
