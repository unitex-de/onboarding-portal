import type { LegalForm } from "./onboarding-state";

export interface RequiredDoc {
  id: string;
  label: string;
  hint?: string;
  required: boolean;
}

export const REQUIRED_DOCS: Record<LegalForm, RequiredDoc[]> = {
  eK: [
    { id: "ausweiskopie_gf", label: "Ausweiskopie GF / Inhaber", hint: "Vorder- und Rückseite", required: true },
    { id: "gewerbe_anmeldung", label: "Gewerbeanmeldung", required: true },
    { id: "steuernummer_doc", label: "Steuernummer-Nachweis", required: false },
  ],
  GbR: [
    { id: "ausweiskopie_gf", label: "Ausweiskopie aller Gesellschafter", required: true },
    { id: "gewerbe_anmeldung", label: "Gewerbeanmeldung / Bestätigung", required: true },
    { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag", required: true },
  ],
  GmbH: [
    { id: "ausweiskopie_gf", label: "Ausweiskopie GF", required: true },
    { id: "hr_auszug", label: "Handelsregister-Auszug (aktuell)", required: true },
    { id: "gesellschafterliste", label: "Gesellschafterliste", hint: "aus Handelsregister oder eigenerstellt", required: true },
    { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag", required: true },
  ],
  GmbHCoKG: [
    { id: "ausweiskopie_gf", label: "Ausweiskopie GF", required: true },
    { id: "ausweiskopie_kommandit", label: "Ausweiskopie aller Kommanditisten", required: true },
    { id: "hr_auszug", label: "Handelsregister-Auszug (aktuell)", required: true },
    { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag (inkl. Komplementär-GmbH)", required: true },
  ],
  KG: [
    { id: "ausweiskopie_gf", label: "Ausweiskopie Inhaber / GF", required: true },
    { id: "ausweiskopie_kommandit", label: "Ausweiskopie aller Kommanditisten", required: true },
    { id: "hr_auszug", label: "Handelsregister-Auszug (aktuell)", required: true },
    { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag", required: true },
  ],
  OHG: [
    { id: "ausweiskopie_alle", label: "Ausweiskopie aller Gesellschafter", required: true },
    { id: "hr_auszug", label: "Handelsregister-Auszug (aktuell)", required: true },
    { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag", required: true },
  ],
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}