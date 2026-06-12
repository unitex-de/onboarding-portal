import type { LegalForm } from "./onboarding-state";

export interface RequiredDoc {
  id: string;
  label: string;
  hint?: string;
  /** Full description shown in the upload center */
  description?: string;
  required: boolean;
}

// Shared descriptions for reuse
const DESC: Record<string, string> = {
  ausweiskopie_gf:
    "Gültiger Personalausweis oder Reisepass aller Gesellschafter / der Geschäftsführung (Vorder- und Rückseite).",
  ausweiskopie_kommanditisten:
    "Gültiger Personalausweis oder Reisepass aller Kommanditisten (Vorder- und Rückseite).",
  gewerbeanmeldung:
    "Aktuelle Gewerbeanmeldung oder ein Gewerbesteuerbescheid.",
  hr_auszug:
    "Aktueller Auszug aus dem Handelsregister – nicht älter als 3 Monate.",
  gesellschafterliste:
    "Aktuelle, beim Handelsregister hinterlegte Liste der Gesellschafter.",
  gesellschaftsvertrag:
    "Kopie des aktuellen Gesellschaftsvertrags (Satzung).",
  jur_person_unterlagen:
    "Falls ein Gesellschafter Ihres Unternehmens selbst eine juristische Person (z. B. eine andere GmbH oder Holding) ist, laden Sie bitte auch deren vollständige Nachweise hoch.",
  hr_auszug_lieferant:
    "Aktueller Auszug aus dem Handelsregister – nicht älter als 3 Monate.",
};

export const REQUIRED_DOCS: Record<LegalForm, RequiredDoc[]> = {
  eK: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie GF / Inhaber",        hint: "Vorder- und Rückseite", description: DESC.ausweiskopie_gf,      required: true },
    { id: "gewerbeanmeldung",      label: "Gewerbe-Anmeldung",                description: DESC.gewerbeanmeldung,      required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister",            hint: "Optional",              description: DESC.hr_auszug,             required: false },
  ],
  GbR: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie aller Beteiligten",    hint: "Vorder- und Rückseite je Person", description: DESC.ausweiskopie_gf, required: true },
    { id: "gewerbeanmeldung",      label: "Gewerbe-Anmeldung",                description: DESC.gewerbeanmeldung,      required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister",            hint: "Optional",              description: DESC.hr_auszug,             required: false },
  ],
  GmbH: [
    { id: "ausweiskopie_gf",      label: "Ausweiskopie aller Beteiligten",    hint: "Vorder- und Rückseite je Person", description: DESC.ausweiskopie_gf, required: true },
    { id: "hr_auszug",             label: "Auszug Handelsregister (aktuell)", description: DESC.hr_auszug,             required: true },
    { id: "gesellschafterliste",   label: "Gesellschafterliste",               hint: "Aus HR oder selbst erstellt",     description: DESC.gesellschafterliste, required: true },
    { id: "gesellschaftsvertrag",  label: "Gesellschaftsvertrag",              description: DESC.gesellschaftsvertrag,  required: true },
    { id: "jur_person_unterlagen", label: "Unterlagen jur. Person als Gesellschafter", hint: "Nur wenn Gesellschafter selbst juristische Person", description: DESC.jur_person_unterlagen, required: false },
  ],
  GmbHCoKG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", description: DESC.ausweiskopie_gf,             required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   description: DESC.ausweiskopie_kommanditisten, required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    description: DESC.hr_auszug,             required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 description: DESC.gesellschafterliste,   required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               description: DESC.gesellschaftsvertrag,  required: true },
    { id: "jur_person_unterlagen",       label: "Unterlagen jur. Person als Gesellschafter", hint: "Optional", description: DESC.jur_person_unterlagen, required: false },
  ],
  KG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", description: DESC.ausweiskopie_gf,             required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   description: DESC.ausweiskopie_kommanditisten, required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    description: DESC.hr_auszug,             required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 description: DESC.gesellschafterliste,   required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               description: DESC.gesellschaftsvertrag,  required: true },
  ],
  OHG: [
    { id: "ausweiskopie_gf",             label: "Ausweiskopie aller Beteiligten",      hint: "Vorder- und Rückseite je Person", description: DESC.ausweiskopie_gf,             required: true },
    { id: "ausweiskopie_kommanditisten", label: "Ausweiskopie aller Kommanditisten",   description: DESC.ausweiskopie_kommanditisten, required: true },
    { id: "hr_auszug",                   label: "Auszug Handelsregister (aktuell)",    description: DESC.hr_auszug,             required: true },
    { id: "gesellschafterliste",         label: "Gesellschafterliste",                 description: DESC.gesellschafterliste,   required: true },
    { id: "gesellschaftsvertrag",        label: "Gesellschaftsvertrag",               description: DESC.gesellschaftsvertrag,  required: true },
  ],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Lieferant: only HR-Auszug
export const REQUIRED_DOCS_LIEFERANT: RequiredDoc[] = [
  { id: "hr_auszug_lieferant", label: "Auszug Handelsregister (aktuell)", hint: "Nicht älter als 3 Monate", description: DESC.hr_auszug_lieferant, required: true },
];
