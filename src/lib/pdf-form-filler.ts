import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { OnboardingState } from "./onboarding-state";
import { getResponsibleAdmin } from "./onboarding-state";

// ─────────────────────────────────────────────────────────────────────────
// Befüllt das ECHTE unitex-Neukundenformular (public/neukundenformular-vorlage.pdf)
// über seine vorhandenen AcroForm-Felder, statt es wie bisher nachzuzeichnen.
// Vorteil: Wenn unitex das offizielle PDF aktualisiert, muss i.d.R. nur die
// Vorlagendatei ausgetauscht werden (die Feldnamen bleiben in der Praxis stabil).
//
// 4 Stellen im Original-PDF haben KEIN echtes Formularfeld und werden per
// Koordinaten-Overlay befüllt: Firma, Adresse (oben), Datum. "Kundenbetreuer"
// hat zwar ein Feld, ist aber intern als "Signature3" benannt (reines Textfeld,
// keine echte digitale Signatur). Das zweite Signaturfeld ("Signature01" /
// "Unterschrift des Neukunden") bleibt bewusst leer – das ist die Stelle, die
// der Kunde nach dem Ausdrucken von Hand unterschreibt.
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATE_PATH = "/neukundenformular-vorlage.pdf";

async function setText(form: ReturnType<PDFDocument["getForm"]>, fieldId: string, value: string) {
  try {
    form.getTextField(fieldId).setText(value ?? "");
  } catch (err) {
    console.warn(`[pdf-form-filler] Textfeld nicht gefunden: "${fieldId}"`, err);
  }
}

function setCheck(form: ReturnType<PDFDocument["getForm"]>, fieldId: string, checked: boolean) {
  try {
    const cb = form.getCheckBox(fieldId);
    if (checked) cb.check();
    else cb.uncheck();
  } catch (err) {
    console.warn(`[pdf-form-filler] Checkbox nicht gefunden: "${fieldId}"`, err);
  }
}

/** Liefert das Feld-Suffix für die i-te Filialzeile der Tabelle (0-basiert). */
function branchRowSuffix(rowIndex: number): string {
  return rowIndex === 0 ? "" : String(rowIndex - 1);
}

export async function generateNeukundenPdfFilled(state: OnboardingState): Promise<Uint8Array> {
  const templateBytes = await fetch(TEMPLATE_PATH).then((r) => {
    if (!r.ok) throw new Error(`Vorlage nicht ladbar (${r.status}): ${TEMPLATE_PATH}`);
    return r.arrayBuffer();
  });

  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  const fd = state.savedFormData ?? {};
  const gf = fd.contacts?.find((c) => c.kind === "gf");
  const bu = fd.contacts?.find((c) => c.kind === "buchhaltung");
  const mainBranch = fd.branches?.[0];
  const branches = fd.branches ?? [];
  const adresse = [fd.strasse, [fd.plz, fd.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n");
  const gfName = gf ? `${gf.vorname} ${gf.nachname}`.trim() : "";
  const buName = bu ? `${bu.vorname} ${bu.nachname}`.trim() : "";
  const legalForm = state.legalForm ?? "GmbH";
  const isGF = ["GmbH", "GmbHCoKG", "KG", "OHG"].includes(legalForm);
  const sel = fd.sortiment ?? [];
  const admin = getResponsibleAdmin(state.memberType, state.postalCode, state.country);

  // ── Seite 1: Stammdaten ──────────────────────────────────────────────────
  await setText(form, "Lieferadresse (falls abweichend)_es_:signer2", "");
  await setText(form, "GLN-Nr_es_:signer2", mainBranch?.gln ?? "");
  await setText(form, "Geschäftsführer_es_:signer2", isGF ? gfName : "");
  await setText(form, "Inhaber_es_:signer2", !isGF ? gfName : "");
  await setText(form, "Ansprechpartner Buchhaltung_es_:signer2", buName);
  await setText(form, "E-Mail Geschäftsführer_es_:signer2", gf?.email ?? "");
  await setText(form, "Tel. Zentrale_es_:signer2", gf?.telefon || gf?.handy || "");
  await setText(form, "Tel. Buchhaltung_es_:signer2", bu?.telefon || bu?.handy || "");
  await setText(form, "E-Mail_es_:signer2", fd.emailFirma ?? "");
  await setText(form, "E-Mail Buchhaltung_es_:signer2", bu?.email ?? "");
  await setText(form, "Adresse des Inhabers bzw. Geschäftsführers_es_:signer2", adresse);
  await setText(form, "Bankinstitut / BIC_es_:signer2", [fd.bankname, fd.bic].filter(Boolean).join(" / "));
  await setText(form, "IBAN_es_:signer2", fd.iban ?? "");
  await setText(form, "Steurnummer_es_:signer2", fd.steuernummer ?? "");
  await setText(form, "UST. Ident.Nr. / Wirtschafts-ID Nr_es_:signer2", fd.ustId ?? "");

  // "wichtige Marken"-Freitextfelder und die "weitere"-Checkbox wurden aus der
  // PDF-Vorlage entfernt (nicht mehr Teil des Formulars) - keine Aufrufe mehr nötig.

  // "Kundenbetreuer" (intern "Signature3" genannt, ist aber ein reines Textfeld)
  await setText(form, "Signature3_es_:signer2:signature", admin.name);
  // "Signature01" = Unterschrift des Neukunden -> bewusst LEER (Kunde unterschreibt von Hand)

  // Portalzugang-/WhatsApp-/Zahlungs-Checkboxen: aktuell keine Datenquelle -> unchecked
  setCheck(form, "Inhaber bekommt Portalzugang_es_:signer2", false);
  setCheck(form, "Geschäftführer bekommt Portalzugang_es_:signer2", false);
  setCheck(form, "Ansprechpartner Buchhaltung bekommt Portalzugang_es_:signer2", false);
  setCheck(form, "WhatsApp_es_:signer2", false);
  setCheck(form, "10Tage_es_:signer2", false);
  setCheck(form, "30Tage_es_:signer2", false);
  setCheck(form, "60Tage_es_:signer2", false);
  setCheck(form, "Rechnungen im Format EDI-INVOIC_es_:signer2", false);
  setCheck(form, "ZUgang zu Rechnungsportal", false);

  // Sortimentsbereiche
  setCheck(form, "Damenmode_es_:signer2", sel.includes("DOB"));
  setCheck(form, "Kinder_es_:signer2", sel.includes("KIKO"));
  setCheck(form, "Herrenmode_es_:signer2", sel.includes("HAKA"));
  setCheck(form, "Accessoires_es_:signer2", sel.includes("Accessoires"));
  setCheck(form, "Wäsche_es_:signer2", sel.includes("Wäsche"));

  // Immer gesetzt (wie bisher im hand-gezeichneten PDF)
  setCheck(form, "unitex-Neukunde mit Erstbestellung_es_:signer2", true);
  setCheck(form, "SEPA-Firmenlastschrift Mandat_es_:signer2", true);

  // ── Seite 2: Filialtabelle + Ja/Nein-Blöcke ─────────────────────────────
  for (let i = 0; i < 9; i++) {
    const b = branches[i];
    if (!b) continue;
    const suf = branchRowSuffix(i);
    await setText(form, `Name${suf}_es_:signer2`, b.name ?? "");
    await setText(form, `Straße${suf}_es_:signer2`, b.street ?? "");
    await setText(form, `PLZ${suf}_es_:signer2`, b.zip ?? "");
    await setText(form, `Ort${suf}_es_:signer2`, b.city ?? "");
    await setText(form, `GLNNummern${suf}_es_:signer2`, b.gln ?? "");
  }

  // Postadresse (eigene Tabellenzeile, Feld-Suffix "14")
  const pa = fd.postadrResult;
  await setText(form, "Name14_es_:signer2", pa?.name ?? "");
  await setText(form, "Straße14_es_:signer2", pa?.street ?? "");
  await setText(form, "PLZ14_es_:signer2", pa?.zip ?? "");
  await setText(form, "Ort14_es_:signer2", pa?.city ?? "");
  await setText(form, "GLNNummern14_es_:signer2", pa?.gln ?? "");

  setCheck(form, "sep.AbrechnungJA_es_:signer2", fd.separateAbrechnung === true);
  setCheck(form, "sep.AbrechnungNEIN_es_:signer2", fd.separateAbrechnung === false);
  setCheck(form, "PostadresseJA_es_:signer2", fd.postadressen === true);
  setCheck(form, "PostadresseNEIN_es_:signer2", fd.postadressen === false);
  // Bewusst kein Default mehr: nur setzen, wenn der Kunde das im Portal explizit
  // beantwortet hat (fd.einzugseinzel ist dann true/false statt null/undefined).
  setCheck(form, "EinzugsermächtigungJA_es_:signer2", fd.einzugseinzel === false);
  setCheck(form, "EinzugsermächtigungNEIN_es_:signer2", fd.einzugseinzel === true);

  // Erscheinungsbilder der Felder anhand der eingebetteten Schrift neu aufbauen
  // (nötig, damit Umlaute/ß korrekt angezeigt werden)
  form.updateFieldAppearances(font);

  // ── Koordinaten-Overlay für die 3 Stellen ohne echtes Formularfeld ─────
  const page1 = pdfDoc.getPages()[0];
  page1.drawText(state.companyName ?? "", { x: 70, y: 767, size: 10, font, color: rgb(0, 0, 0) });
  page1.drawText(adresse, { x: 70, y: 729, size: 9, font, color: rgb(0, 0, 0) });
  // Datum bleibt bewusst leer (wird von Hand/beim Ausdruck ergänzt)

  // Formularfelder fixieren, damit das PDF wie ein normales (nicht mehr editierbares)
  // Dokument gedruckt/hochgeladen werden kann – analog zum bisherigen Verhalten.
  form.flatten();

  return pdfDoc.save();
}

const LIEFERANT_TEMPLATE_PATH = "/Lieferant_Lieferantenstammblatt.pdf";

export async function generateLieferantPdfFilled(state: OnboardingState): Promise<Uint8Array> {
  const templateBytes = await fetch(LIEFERANT_TEMPLATE_PATH).then((r) => {
    if (!r.ok) throw new Error(`Vorlage nicht ladbar (${r.status}): ${LIEFERANT_TEMPLATE_PATH}`);
    return r.arrayBuffer();
  });
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();
  const fd = state.savedFormData ?? {};

  const gf = fd.contacts?.find((c) => c.kind === "gf");
  const bu = fd.contacts?.find((c) => c.kind === "buchhaltung");
  const vertrieb = fd.contacts?.find((c) => c.kind === "extra" && c.jobbezeichnung === "Vertrieb");
  const marketing = fd.contacts?.find((c) => c.kind === "extra" && c.jobbezeichnung === "Marketing");
  const edv = fd.contacts?.find((c) => c.kind === "extra" && c.jobbezeichnung === "Sonstige");
  const inhaber = fd.contacts?.find((c) => c.kind === "extra" && c.jobbezeichnung === "Inhaber");

  const gfName = gf ? `${gf.vorname} ${gf.nachname}`.trim() : "";
  const buName = bu ? `${bu.vorname} ${bu.nachname}`.trim() : "";
  const vertriebName = vertrieb ? `${vertrieb.vorname} ${vertrieb.nachname}`.trim() : "";
  const marketingName = marketing ? `${marketing.vorname} ${marketing.nachname}`.trim() : "";
  const edvName = edv ? `${edv.vorname} ${edv.nachname}`.trim() : "";
  const inhaberName = inhaber ? `${inhaber.vorname} ${inhaber.nachname}`.trim() : "";

  const adresse = [fd.strasse, [fd.plz, fd.ort].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  const admin = getResponsibleAdmin(state.memberType, state.postalCode, state.country);

  const liefSortimentVal = Array.isArray(fd.liefSortiment)
    ? (fd.liefSortiment as unknown as string[]).join(", ")
    : (fd.liefSortiment as string) ?? "";

  const markenCombined = [fd.marken, fd.liefMarken].filter(Boolean).join(", ");

  await setText(form, "Firmierung", state.companyName ?? "");
  await setText(form, "Telefon Zentrale", gf?.telefon || gf?.handy || "");
  await setText(form, "EMail Zentrale", fd.emailFirma ?? "");

  await setText(form, "Ansprechpartner Vertrieb", vertriebName);
  await setText(form, "Telefon Vertrieb", vertrieb?.telefon || vertrieb?.handy || "");
  await setText(form, "EMail Vertrieb", vertrieb?.email ?? "");

  await setText(form, "Ansprechpartner Buchhaltung", buName);
  await setText(form, "Telefon Buchhaltung", bu?.telefon || bu?.handy || "");
  await setText(form, "EMail Buchhaltung", bu?.email ?? "");

  await setText(form, "Ansprechpartner Marketing", marketingName);
  await setText(form, "Telefon Marketing", marketing?.telefon || marketing?.handy || "");
  await setText(form, "EMail Marketing", marketing?.email ?? "");

  await setText(form, "Ansprechpartner EDV", edvName);
  await setText(form, "Telefon EDV", edv?.telefon || edv?.handy || "");
  await setText(form, "EMail EDV", edv?.email ?? "");

  await setText(form, "Inhaber", inhaberName);
  await setText(form, "EMail Inhaber", inhaber?.email ?? "");

  await setText(form, "Geschäftsführer", gfName);
  await setText(form, "EMail Geschäftsführer", gf?.email ?? "");

  await setText(form, "Webseite", fd.webseite ?? "");
  await setText(form, "Marken", markenCombined);
  await setText(form, "Warensortiment", liefSortimentVal);

  await setText(form, "GLNNr", "");
  await setText(form, "USTIdentNrWirtschaftsIDNr", fd.ustId ?? "");
  await setText(form, "Steuernummer", fd.steuernummer ?? "");
  await setText(form, "Bankinstitut", fd.bankname ?? "");
  await setText(form, "IBAN", fd.iban ?? "");
  await setText(form, "SWIFT Code", "");
  await setText(form, "BIC", fd.bic ?? "");
  await setText(form, "Ort Datum", "");
  await setText(form, "Unterschrift", "");

  await setText(form, "Adresse", adresse);

  form.updateFieldAppearances(font);
  form.flatten();

  return pdfDoc.save();
}