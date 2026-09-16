import { REQUIRED_DOCS, REQUIRED_DOCS_LIEFERANT } from "@/lib/required-docs";

// ─── Label-Auflösung für fieldCorrections-Keys ─────────────────────────────
// Gemeinsame Quelle für die Admin-Prüfungsansicht (pruefung.tsx) und die
// "Bitte korrigieren"-Mail an den Kunden (onboarding-state.tsx).
const STATIC_FIELD_LABELS: Record<string, string> = {
  firmenname: "Firmenname",
  legalForm: "Rechtsform",
  strasse: "Straße & Hausnummer",
  adresse: "PLZ / Ort / Land",
  bankname: "Bankname",
  bic: "BIC",
  swiftCode: "SWIFT Code",
  iban: "IBAN",
  steuernummer: "Steuernummer",
  ustId: "USt-IdNr.",
  liefSortiment: "Sortimentsschwerpunkte (Lieferant)",
  liefMarken: "Wichtigste Marken / Eigenmarken",
  webseite: "Webseite",
  glnNr: "GLN-Nr.",
  mitarbeiter: "Mitarbeiterzahl",
  gruendung: "Gründungsdatum",
  zrVolumen: "ZR-Volumen (€)",
  bilanzsumme: "Bilanzsumme (€)",
  wkvDeckungsbeitrag: "WKV Deckungsbeitrag (€)",
  sortiment: "Sortimentsschwerpunkte",
  marken: "Wichtige Marken",
  wirtschaftAbhaengig: "Wirtschaftliche Abhängigkeit",
  wirtschaftAbhaengigText: "Erläuterung wirtschaftliche Abhängigkeit",
  umsatz: "Jahresumsatz (€)",
};

const CONTACT_SUBFIELD_LABELS: Record<string, string> = {
  vorname: "Vorname", nachname: "Nachname", jobbezeichnung: "Jobbezeichnung",
  handy: "Handynummer", telefon: "Telefonnummer", email: "E-Mail-Adresse",
};

const DOC_LABELS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const list of Object.values(REQUIRED_DOCS)) {
    for (const d of list) map[d.id] = d.label;
  }
  for (const d of REQUIRED_DOCS_LIEFERANT) map[d.id] = d.label;
  return map;
})();

export function resolveFieldLabel(fieldId: string): string {
  if (STATIC_FIELD_LABELS[fieldId]) return STATIC_FIELD_LABELS[fieldId];
  if (DOC_LABELS[fieldId]) return `Dokument: ${DOC_LABELS[fieldId]}`;
  const extraDocMatch = fieldId.match(/^(.+)__(\d+)$/);
  if (extraDocMatch && DOC_LABELS[extraDocMatch[1]]) {
    return `Dokument: ${DOC_LABELS[extraDocMatch[1]]} – weitere Kopie ${Number(extraDocMatch[2]) - 1}`;
  }
  const shareholderMatch = fieldId.match(/^shareholders\.(\d+)$/);
  if (shareholderMatch) return `Gesellschafter ${Number(shareholderMatch[1]) + 1}`;
  const contactMatch = fieldId.match(/^contact\.[^.]+\.(.+)$/);
  if (contactMatch) return `Kontakt – ${CONTACT_SUBFIELD_LABELS[contactMatch[1]] ?? contactMatch[1]}`;
  return fieldId;
}