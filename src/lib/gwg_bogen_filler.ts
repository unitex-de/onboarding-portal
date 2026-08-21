import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { OnboardingState } from "./onboarding-state";

// ─────────────────────────────────────────────────────────────────────────
// GWG-Bogen (Händler): Koordinaten-Overlay auf die Original-PDF, da diese
// KEINE AcroForm-Felder hat (anders als Neukundenformular/Lieferantenstamm-
// blatt) – reines Ausdruck-Formular mit Linien/Kästchen.
//
// WICHTIG: Die Koordinaten unten sind per OCR aus einem gerenderten Bild der
// Vorlage geschätzt (keine echten PDF-Koordinaten verfügbar). Erster Entwurf –
// nach dem ersten Testlauf gegen die echte lokale PDF wahrscheinlich noch
// nachzujustieren, ähnlich wie bei den PandaDoc-Signaturfeldern.
//
// Datenlücken (auf dem Formular vorhanden, aktuell aber nicht im Portal
// erfasst) bleiben bewusst leer – das ist der Punkt, an dem der Kundenbetreuer
// nach Erhalt der Mail noch ergänzt:
//  - PEP-Status von Inhaber/Geschäftsführer (nur je Gesellschafter erfasst)
//  - Die 3 spezifischen "wirtschaftliche Abhängigkeit"-Kategorien inkl.
//    Firmenname (wir haben nur ein Ja/Nein + Freitext)
//  - Beherrschungsmöglichkeit abweichend vom Gesellschaftsvertrag
//  - Beteiligung an weiteren Unternehmen (ZR-Kunden/-Lieferanten)
//  - Sonstige Anmerkungen
//  - Bestätigungsblock (Datum der Legitimation, Name/Unterschrift Mitarbeiter)
//    – das ist absichtlich leer, das trägt der Kundenbetreuer persönlich ein.
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATE_PATH_HAENDLER = "/gwg-bogen-haendler-vorlage.pdf";

const PAGE_H = 841.89; // A4 Punkt-Höhe, nur zur Orientierung in den Kommentaren

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 9) {
  if (!text) return;
  page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0.6) });
}

function drawCheck(page: PDFPage, font: PDFFont, x: number, y: number) {
  page.drawText("X", { x, y, size: 9, font, color: rgb(0, 0, 0.6) });
}

/** Formatiert ein Datum (ISO-String o.ä.) als DD.MM.YYYY, robust gegen leere/ungültige Werte. */
function formatDateDE(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value; // Rohwert anzeigen statt "Invalid Date"
  return d.toLocaleDateString("de-DE");
}

// Rechtsform-Checkbox-Positionen (x0 der jeweiligen Box), Zeile y≈733
const RECHTSFORM_X: Record<string, number> = {
  eK: 117,      // "e.K." (Einzelfirma wird ebenfalls hier markiert, s.u.)
  GbR: 196,
  OHG: 235,
  GmbH: 274,
  GmbHCoKG: 366,
  KG: 444,
};
const RECHTSFORM_Y = 734;

export async function generateGwgBogenHaendlerPdf(
  state: OnboardingState,
  opts: { neukundenformularUploaded: boolean }
): Promise<Uint8Array> {
  const templateBytes = await fetch(TEMPLATE_PATH_HAENDLER).then((r) => {
    if (!r.ok) throw new Error(`Vorlage nicht ladbar (${r.status}): ${TEMPLATE_PATH_HAENDLER}`);
    return r.arrayBuffer();
  });
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const p1 = pdfDoc.getPage(0);
  const p2 = pdfDoc.getPage(1);
  const fd = state.savedFormData ?? {};

  const gf = fd.contacts?.find((c) => c.kind === "gf");
  const gfName = gf ? `${gf.vorname ?? ""} ${gf.nachname ?? ""}`.trim() : "";

  // ── Kopfbereich ────────────────────────────────────────────────────────
  drawText(p1, font, state.companyName ?? "", 76, 781, 10);
  drawText(p1, font, fd.ort ?? "", 400, 783);
  drawText(p1, font, gfName, 152, 754);

  // ── Rechtsform ─────────────────────────────────────────────────────────
  if (state.legalForm && RECHTSFORM_X[state.legalForm] != null) {
    drawCheck(p1, font, RECHTSFORM_X[state.legalForm], RECHTSFORM_Y);
  }

  // ── Angaben zur Zentralregulierung ────────────────────────────────────
  if (state.zrStartDate) {
    drawText(p1, font, formatDateDE(state.zrStartDate), 195, 686);
  }
  drawText(p1, font, fd.zrVolumen ?? "", 210, 663);

  // ── Prüfung Vollständigkeit der Unterlagen (aus uploadedDocs abgeleitet) ─
  // Linke Spalte x≈184, rechte Spalte x≈537. SEPA-Mandat hat keine
  // entsprechende Upload-Quelle im Portal, bleibt daher offen.
  const docs = state.uploadedDocs ?? {};
  if (docs["vertrag_kundenkartei"]) drawCheck(p1, font, 184, 605);          // Anschluss-Vertrag (links)
  if (docs["ausweiskopie_gf"]) drawCheck(p1, font, 537, 605);               // Personalausweiskopien (rechts)
  if (docs["gewerbeanmeldung"] || docs["hr_auszug"]) drawCheck(p1, font, 537, 584); // Gewerbeanmeldung/HR-Auszug (rechts)
  if (docs["gesellschaftsvertrag"] || docs["gesellschafterliste"]) drawCheck(p1, font, 537, 564); // Gesellschaftsvertrag/-liste (rechts)
  if (opts.neukundenformularUploaded) drawCheck(p1, font, 184, 564);       // Neukundenformular (links)

  // ── Angaben zum Unternehmen ────────────────────────────────────────────
  // Y-Werte angehoben: vorher zu niedrig (unterhalb statt innerhalb der Box).
  drawText(p1, font, fd.umsatz ?? "", 115, 519);
  drawText(p1, font, fd.mitarbeiter ?? "", 460, 519);
  drawText(p1, font, fd.wkvDeckungsbeitrag ?? "", 130, 496);
  drawText(p1, font, formatDateDE(fd.gruendung), 470, 496);
  drawText(p1, font, fd.bilanzsumme ?? "", 105, 474);
  drawText(p1, font, fd.steuernummer ?? "", 460, 474);

  // ── Wirtschaftliche Abhängigkeit ───────────────────────────────────────
  // Nur "keine Abhängigkeiten" ist eindeutig aus unseren Daten ableitbar –
  // die 3 anderen Kategorien (inkl. Firmenname) erfasst das Portal nicht,
  // bleiben für den Kundenbetreuer offen.
  if (fd.wirtschaftAbhaengig === false) {
    drawCheck(p1, font, 47, 374);
  }

  // ── Gesellschafter-Tabelle (bis zu 6 Zeilen) ──────────────────────────
  const rowY = [237, 212, 188, 164, 136, 112];
  (fd.shareholders ?? []).slice(0, 6).forEach((s, i) => {
    drawText(p1, font, s.name ?? "", 132, rowY[i]);
    drawText(p1, font, s.capital ?? "", 355, rowY[i]);
    drawText(p1, font, s.voting ?? "", 435, rowY[i]);
    if (s.pep) drawCheck(p1, font, 523, rowY[i]);
  });

  // ── Seite 2: Kopfzeile wiederholen ─────────────────────────────────────
  drawText(p2, font, state.companyName ?? "", 76, 782, 10);
  drawText(p2, font, fd.ort ?? "", 350, 782);

  return pdfDoc.save();
}