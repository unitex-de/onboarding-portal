import { PDFDocument, rgb, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";
import type { OnboardingState, SupportContact } from "./onboarding-state";
import { getResponsibleAdmin } from "./onboarding-state";

// ─── Colours ────────────────────────────────────────────────────────────────
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const BRAND_BLUE = rgb(0.18, 0.39, 0.69); // unitex blue approx

// ─── Layout constants ────────────────────────────────────────────────────────
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_L = 50;
const MARGIN_R = 50;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawHRule(page: PDFPage, y: number, x = MARGIN_L, w = CONTENT_W) {
  page.drawLine({
    start: { x, y },
    end: { x: x + w, y },
    thickness: 0.5,
    color: LIGHT_GRAY,
  });
}

function drawLabel(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 8) {
  page.drawText(text, { x, y, size, font, color: GRAY });
}

function drawValue(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size = 9.5) {
  if (!text) return;
  page.drawText(text, { x, y, size, font, color: BLACK });
}

function drawFieldRow(
  page: PDFPage,
  labelFont: PDFFont,
  valueFont: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
) {
  drawLabel(page, labelFont, label, x, y + 12, 7.5);
  drawValue(page, valueFont, value || "", x, y);
  drawHRule(page, y - 4, x, w);
  return y - 28;
}

function drawTwoColRow(
  page: PDFPage,
  labelFont: PDFFont,
  valueFont: PDFFont,
  left: { label: string; value: string },
  right: { label: string; value: string },
  y: number,
) {
  const colW = CONTENT_W / 2 - 6;
  drawFieldRow(page, labelFont, valueFont, left.label, left.value, MARGIN_L, y, colW);
  drawFieldRow(page, labelFont, valueFont, right.label, right.value, MARGIN_L + colW + 12, y, colW);
  return y - 28;
}

function drawCheckbox(page: PDFPage, font: PDFFont, x: number, y: number, checked: boolean, label: string) {
  page.drawRectangle({
    x, y: y - 1,
    width: 9, height: 9,
    borderColor: BLACK,
    borderWidth: 0.7,
    color: checked ? BRAND_BLUE : rgb(1, 1, 1),
  });
  if (checked) {
    page.drawText("✓", { x: x + 1.5, y: y + 0.5, size: 7, font, color: rgb(1, 1, 1) });
  }
  page.drawText(label, { x: x + 13, y, size: 8.5, font, color: BLACK });
}

function drawPageHeader(page: PDFPage, boldFont: PDFFont, regularFont: PDFFont) {
  // Title
  page.drawText("Neukundenformular", { x: MARGIN_L, y: PAGE_H - 48, size: 14, font: boldFont, color: BLACK });
  // underline
  page.drawLine({
    start: { x: MARGIN_L, y: PAGE_H - 51 },
    end: { x: MARGIN_L + 145, y: PAGE_H - 51 },
    thickness: 1, color: BLACK,
  });

  // unitex logo text top-right
  page.drawText("unitex", {
    x: PAGE_W - MARGIN_R - 55, y: PAGE_H - 38,
    size: 18, font: boldFont, color: BRAND_BLUE,
  });
  page.drawText("Vertrauen. Kompetenz. Innovation.", {
    x: PAGE_W - MARGIN_R - 96, y: PAGE_H - 50,
    size: 5.5, font: regularFont, color: GRAY,
  });

  drawHRule(page, PAGE_H - 58);
}

// ─── Page 3 ──────────────────────────────────────────────────────────────────

function buildPage3(
  page: PDFPage,
  boldFont: PDFFont,
  regularFont: PDFFont,
  state: OnboardingState,
  admin: SupportContact,
) {
  drawPageHeader(page, boldFont, regularFont);

  const fd = state.savedFormData ?? {};
  const gf = fd.contacts?.find((c) => c.kind === "gf");
  const bu = fd.contacts?.find((c) => c.kind === "buchhaltung");
  const mainBranch = fd.branches?.[0];
  const adresse = [fd.strasse, [fd.plz, fd.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const gfName = gf ? `${gf.vorname} ${gf.nachname}`.trim() : "";
  const buName = bu ? `${bu.vorname} ${bu.nachname}`.trim() : "";

  let y = PAGE_H - 72;
  const lf = regularFont;
  const bf = boldFont;

  // Firma
  y = drawFieldRow(page, lf, bf, "Firma", state.companyName, MARGIN_L, y, CONTENT_W);

  // Adresse
  y = drawFieldRow(page, lf, bf, "Adresse", adresse, MARGIN_L, y, CONTENT_W);

  // Lieferadresse | GLN
  y = drawTwoColRow(page, lf, lf, { label: "Lieferadresse (falls abweichend)", value: "" }, { label: "GLN-Nr.", value: mainBranch?.gln ?? "" }, y) - 4;

  // Geschäftsführer / Inhaber checkboxes
  drawLabel(page, lf, "Geschäftsführer / Inhaber", MARGIN_L, y + 12, 7.5);
  const legalForm = state.legalForm ?? "GmbH";
  const isGF = ["GmbH", "GmbHCoKG", "KG", "OHG"].includes(legalForm);
  drawCheckbox(page, lf, MARGIN_L, y, isGF, "Geschäftsführer");
  drawCheckbox(page, lf, MARGIN_L + 100, y, !isGF, "Inhaber");
  drawValue(page, bf, gfName, MARGIN_L + 200, y, 9.5);
  drawHRule(page, y - 4, MARGIN_L, CONTENT_W);
  y -= 28;

  // E-Mail GF | Ansprechpartner Buchhaltung
  y = drawTwoColRow(page, lf, lf,
    { label: "E-Mail Geschäftsführer / Inhaber", value: gf?.email ?? "" },
    { label: "Ansprechpartner Buchhaltung", value: buName },
    y) - 4;

  // Tel. Zentrale/Mobil | WhatsApp | Tel. Buchhaltung
  const colW3 = CONTENT_W / 3 - 6;
  drawFieldRow(page, lf, lf, "Tel. Zentrale / Mobil", gf?.telefon || gf?.handy || "", MARGIN_L, y, colW3);
  drawFieldRow(page, lf, lf, "WhatsApp", "", MARGIN_L + colW3 + 6, y, colW3);
  drawFieldRow(page, lf, lf, "Tel. Buchhaltung", bu?.telefon || bu?.handy || "", MARGIN_L + (colW3 + 6) * 2, y, colW3);
  y -= 32;

  // E-Mail allgemein | E-Mail Buchhaltung
  y = drawTwoColRow(page, lf, lf,
    { label: "E-Mail allgemein", value: gf?.email ?? "" },
    { label: "E-Mail Buchhaltung", value: bu?.email ?? "" },
    y) - 4;

  // Adresse GF/Inhaber
  y = drawFieldRow(page, lf, lf, "Adresse des Inhabers bzw. Geschäftsführers", adresse, MARGIN_L, y, CONTENT_W);

  // Bank | IBAN
  y = drawTwoColRow(page, lf, lf,
    { label: "Bankinstitut / BIC", value: [fd.bankname, fd.bic].filter(Boolean).join(" / ") },
    { label: "IBAN", value: fd.iban ?? "" },
    y) - 4;

  // Steuernummer | UST
  y = drawTwoColRow(page, lf, lf,
    { label: "Steuernummer", value: fd.steuernummer ?? "" },
    { label: "UST-Ident.Nr. / Wirtschafts-ID.Nr.", value: fd.ustId ?? "" },
    y) - 8;

  // Sortimentsbereiche
  drawLabel(page, lf, "Sortimentsbereiche:", MARGIN_L, y + 4, 8);
  y -= 8;
  const sortOptions = [
    { key: "DOB", label: "Damenmode" },
    { key: "KIKO", label: "Kinder" },
    { key: "HAKA", label: "Herrenmode" },
    { key: "Accessoires", label: "Accessoires" },
    { key: "Wäsche", label: "Wäsche" },
  ];
  const col1 = sortOptions.slice(0, 3);
  const col2 = sortOptions.slice(3);
  const sel = fd.sortiment ?? [];

  col1.forEach((o, i) => {
    drawCheckbox(page, lf, MARGIN_L, y - i * 14, sel.includes(o.key), o.label + ", wichtige Marken:");
    drawHRule(page, y - i * 14 - 3, MARGIN_L + 160, CONTENT_W / 2 - 60);
  });
  col2.forEach((o, i) => {
    drawCheckbox(page, lf, MARGIN_L + CONTENT_W / 2, y - i * 14, sel.includes(o.key), o.label + (i < col2.length - 1 ? ", wichtige Marken:" : ""));
    if (i < col2.length - 1) drawHRule(page, y - i * 14 - 3, MARGIN_L + CONTENT_W / 2 + 120, CONTENT_W / 2 - 70);
  });
  // "weitere"
  drawCheckbox(page, lf, MARGIN_L + CONTENT_W / 2, y - col2.length * 14, false, "weitere");
  y -= (Math.max(col1.length, col2.length + 1)) * 14 + 8;

  // Neukunde checkbox (always checked)
  drawCheckbox(page, bf, MARGIN_L, y, true, "unitex-Neukunde mit Erstbestellung");
  y -= 10;

  // Guarantee text
  page.drawText(
    "Der Besteller bestätigt, auf eigene Rechnung und in eigenem Namen zu handeln und übernimmt die persönliche",
    { x: MARGIN_L, y, size: 7, font: lf, color: GRAY },
  );
  y -= 9;
  page.drawText(
    "Garantie für die Richtigkeit der Angaben und Zahlung der ausgelieferten Waren.",
    { x: MARGIN_L, y, size: 7, font: lf, color: GRAY },
  );
  y -= 16;

  // SEPA checkbox
  drawCheckbox(page, bf, MARGIN_L, y, true, "SEPA-Firmenlastschrift-Mandat (dieses Formular 2-fach mit Originalunterschrift an unitex)");
  y -= 16;

  // Zahlungsmodalitäten
  drawCheckbox(page, lf, MARGIN_L + 12, y, false, "Innerhalb 10 Tagen mit 4 % Skonto");
  y -= 12;
  drawCheckbox(page, lf, MARGIN_L + 12, y, false, "Innerhalb 30 Tagen mit 2,25 % Skonto");
  y -= 12;
  drawCheckbox(page, lf, MARGIN_L + 12, y, false, "Innerhalb 60 Tagen ohne Skonto");
  y -= 14;

  // Fine print
  page.drawText(
    "Obige Zahlungsmodalitäten gelten nur, sofern der Rückversicherer ein Limit zeichnet.",
    { x: MARGIN_L, y, size: 6.5, font: lf, color: GRAY },
  );
  y -= 10;

  // EDI-INVOIC
  drawCheckbox(page, lf, MARGIN_L, y, false, "Der unitex-Neukunde erhält bereits Rechnungen im Format EDI-INVOIC von ZR-Lieferanten.");
  y -= 20;

  // Bottom: Kundenbetreuer | Datum | Unterschrift
  drawHRule(page, y + 14, MARGIN_L, 140);
  drawHRule(page, y + 14, MARGIN_L + 160, 100);
  drawHRule(page, y + 14, MARGIN_L + 280, CONTENT_W - 280);

  drawValue(page, lf, admin.name, MARGIN_L, y + 16, 8);
  drawValue(page, lf, new Date().toLocaleDateString("de-DE"), MARGIN_L + 160, y + 16, 8);

  drawLabel(page, lf, "Kundenbetreuer", MARGIN_L, y + 3, 7);
  drawLabel(page, lf, "Datum", MARGIN_L + 160, y + 3, 7);
  drawLabel(page, lf, "Unterschrift des Neukunden", MARGIN_L + 280, y + 3, 7);

  y -= 16;
  page.drawText("★ hat Zugang zu Rechnungsportal", { x: MARGIN_L, y, size: 7, font: lf, color: GRAY });

  // Page number
  page.drawText("Seite 3", { x: PAGE_W / 2 - 15, y: 30, size: 8, font: lf, color: GRAY });
}

// ─── Page 4 ──────────────────────────────────────────────────────────────────

function buildPage4(
  page: PDFPage,
  boldFont: PDFFont,
  regularFont: PDFFont,
  state: OnboardingState,
) {
  drawPageHeader(page, boldFont, regularFont);

  const fd = state.savedFormData ?? {};
  const branches = fd.branches ?? [];
  const lf = regularFont;
  const bf = boldFont;

  let y = PAGE_H - 72;

  page.drawText("Adressen der Filialen:", { x: MARGIN_L, y, size: 9, font: bf, color: BLACK });
  y -= 16;

  // Table header
  const cols = [
    { label: "Name", x: MARGIN_L, w: 120 },
    { label: "Straße", x: MARGIN_L + 126, w: 130 },
    { label: "PLZ", x: MARGIN_L + 262, w: 45 },
    { label: "Ort", x: MARGIN_L + 313, w: 100 },
    { label: "GLN-Nummern", x: MARGIN_L + 419, w: 90 },
  ];

  // Header row background
  page.drawRectangle({
    x: MARGIN_L - 2, y: y - 2,
    width: CONTENT_W + 4, height: 14,
    color: rgb(0.93, 0.93, 0.93),
  });
  cols.forEach((c) => {
    page.drawText(c.label, { x: c.x + 2, y: y + 2, size: 7.5, font: bf, color: BLACK });
  });

  // Draw outer border for table
  const tableTop = y + 12;
  const rowH = 18;
  const numDataRows = 9;

  page.drawRectangle({
    x: MARGIN_L - 2, y: y - 2 - numDataRows * rowH,
    width: CONTENT_W + 4, height: (numDataRows + 1) * rowH,
    borderColor: LIGHT_GRAY,
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });

  // Vertical column lines
  cols.slice(1).forEach((c) => {
    page.drawLine({
      start: { x: c.x - 4, y: tableTop },
      end: { x: c.x - 4, y: tableTop - (numDataRows + 1) * rowH },
      thickness: 0.4,
      color: LIGHT_GRAY,
    });
  });

  // Data rows
  for (let i = 0; i < numDataRows; i++) {
    const ry = y - 2 - i * rowH - rowH;
    // Horizontal line
    page.drawLine({
      start: { x: MARGIN_L - 2, y: ry + rowH },
      end: { x: MARGIN_L + CONTENT_W + 2, y: ry + rowH },
      thickness: 0.4,
      color: LIGHT_GRAY,
    });
    const b = branches[i];
    if (b) {
      cols.forEach((c, ci) => {
        const val = [b.name, b.street, b.zip, b.city, b.gln][ci] ?? "";
        page.drawText(val, { x: c.x + 2, y: ry + 5, size: 8, font: lf, color: BLACK });
      });
    }
  }
  y -= (numDataRows + 1) * rowH + 16;

  // Separate Abrechnung
  page.drawText("Wünschen Sie für jedes Geschäft eine separate Abrechnung?", { x: MARGIN_L, y, size: 8.5, font: lf, color: BLACK });
  y -= 9;
  page.drawText("(extra Kundennummer / extra Dekadenliste)", { x: MARGIN_L, y, size: 7.5, font: lf, color: GRAY });
  y -= 14;
  drawCheckbox(page, lf, MARGIN_L, y, fd.separateAbrechnung === true, "Ja");
  drawCheckbox(page, lf, MARGIN_L + 60, y, fd.separateAbrechnung === false, "Nein");
  y -= 20;

  // Postadresse
  page.drawText("Sollen alle Abrechnungen an eine Postadresse gesandt werden?", { x: MARGIN_L, y, size: 8.5, font: lf, color: BLACK });
  y -= 14;
  drawCheckbox(page, lf, MARGIN_L, y, fd.postadressen === true, "Ja");
  drawCheckbox(page, lf, MARGIN_L + 60, y, fd.postadressen === false, "Nein");
  y -= 18;

  page.drawText("Wie lautet die Postadresse:", { x: MARGIN_L, y, size: 8, font: lf, color: BLACK });
  y -= 14;

  // Postadresse table (1 row)
  const pa = fd.postadrResult;
  page.drawRectangle({
    x: MARGIN_L - 2, y: y - 2 - rowH,
    width: CONTENT_W + 4, height: rowH + 14,
    borderColor: LIGHT_GRAY, borderWidth: 0.5, color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: MARGIN_L - 2, y: y - 2,
    width: CONTENT_W + 4, height: 14,
    color: rgb(0.93, 0.93, 0.93),
  });
  cols.forEach((c) => {
    page.drawText(c.label, { x: c.x + 2, y: y + 2, size: 7.5, font: bf, color: BLACK });
  });
  if (pa) {
    const vals = [pa.name, pa.street, pa.zip, pa.city, pa.gln];
    cols.forEach((c, i) => {
      page.drawText(vals[i] ?? "", { x: c.x + 2, y: y - rowH + 4, size: 8, font: lf, color: BLACK });
    });
  }
  y -= rowH + 28;

  // Einzugsermächtigung
  page.drawText("Einzugsermächtigung: Alle Geschäfte werden von einem Bankkonto abgebucht", { x: MARGIN_L, y, size: 8.5, font: lf, color: BLACK });
  y -= 14;
  drawCheckbox(page, lf, MARGIN_L, y, fd.einzugseinzel !== true, "Ja");
  drawCheckbox(page, lf, MARGIN_L + 60, y, fd.einzugseinzel === true, "Nein, bitte für jede Filiale eine Extra Einzugsermächtigung erstellen");
  y -= 20;

  // Page number
  page.drawText("Seite 4", { x: PAGE_W / 2 - 15, y: 30, size: 8, font: lf, color: GRAY });
}

// ─── Lieferant: Zusatzblatt ───────────────────────────────────────────────────

function buildLieferantPage(
  page: PDFPage,
  boldFont: PDFFont,
  regularFont: PDFFont,
  state: OnboardingState,
) {
  const fd = state.savedFormData ?? {};
  const gf = fd.contacts?.find((c) => c.kind === "gf");
  const bu = fd.contacts?.find((c) => c.kind === "buchhaltung");
  const lf = regularFont;
  const bf = boldFont;

  // Title
  page.drawText("Zusatzblatt Lieferanten", { x: MARGIN_L, y: PAGE_H - 48, size: 14, font: bf, color: BLACK });
  page.drawLine({
    start: { x: MARGIN_L, y: PAGE_H - 51 },
    end: { x: MARGIN_L + 165, y: PAGE_H - 51 },
    thickness: 1, color: BLACK,
  });

  // unitex logo text top-right
  page.drawText("unitex", {
    x: PAGE_W - MARGIN_R - 55, y: PAGE_H - 38,
    size: 18, font: bf, color: BRAND_BLUE,
  });
  page.drawText("Vertrauen. Kompetenz. Innovation.", {
    x: PAGE_W - MARGIN_R - 96, y: PAGE_H - 50,
    size: 5.5, font: lf, color: GRAY,
  });

  drawHRule(page, PAGE_H - 58);

  let y = PAGE_H - 78;

  // Firmierung
  y = drawFieldRow(page, lf, bf, "Firmierung", state.companyName, MARGIN_L, y, CONTENT_W);

  // Telefon Zentrale | E-Mail Zentrale
  y = drawTwoColRow(page, lf, lf,
    { label: "Telefon Zentrale", value: gf?.telefon || gf?.handy || "" },
    { label: "E-Mail Zentrale", value: gf?.email || "" },
    y) - 4;

  // Helper: find contact by jobbezeichnung
  const findContact = (job: string) => (fd.contacts ?? []).find(
    (c) => (c as any).jobbezeichnung === job || c.kind === job
  );
  const vertrieb = findContact("Vertrieb") || findContact("gf");
  const marketingContact = findContact("Marketing");
  const edvContact = findContact("EDV");

  // Ansprechpartner Vertrieb
  y = drawFieldRow(page, lf, lf, "Ansprechpartner Vertrieb",
    vertrieb ? `${vertrieb.vorname} ${vertrieb.nachname}`.trim() : "", MARGIN_L, y, CONTENT_W / 3 - 4);
  // – using a 3-col layout via direct drawing
  const col3W = CONTENT_W / 3 - 4;
  // re-draw the previous field as 3-col
  y += 28; // undo last drawFieldRow
  drawFieldRow(page, lf, lf, "Ansprechpartner Vertrieb",
    vertrieb ? `${vertrieb.vorname} ${vertrieb.nachname}`.trim() : "",
    MARGIN_L, y, col3W);
  drawFieldRow(page, lf, lf, "Telefon Vertrieb", vertrieb?.telefon || vertrieb?.handy || "",
    MARGIN_L + col3W + 6, y, col3W);
  drawFieldRow(page, lf, lf, "E-Mail Vertrieb", vertrieb?.email || "",
    MARGIN_L + (col3W + 6) * 2, y, col3W);
  y -= 28 + 4;

  // Ansprechpartner Buchhaltung
  drawFieldRow(page, lf, lf, "Ansprechpartner Buchhaltung",
    bu ? `${bu.vorname} ${bu.nachname}`.trim() : "", MARGIN_L, y, col3W);
  drawFieldRow(page, lf, lf, "Telefon Buchhaltung", bu?.telefon || bu?.handy || "",
    MARGIN_L + col3W + 6, y, col3W);
  drawFieldRow(page, lf, lf, "E-Mail Buchhaltung", bu?.email || "",
    MARGIN_L + (col3W + 6) * 2, y, col3W);
  y -= 28 + 4;

  // Ansprechpartner Marketing
  drawFieldRow(page, lf, lf, "Ansprechpartner Marketing",
    marketingContact ? `${marketingContact.vorname} ${marketingContact.nachname}`.trim() : "",
    MARGIN_L, y, col3W);
  drawFieldRow(page, lf, lf, "Telefon Marketing", marketingContact?.telefon || marketingContact?.handy || "",
    MARGIN_L + col3W + 6, y, col3W);
  drawFieldRow(page, lf, lf, "E-Mail Marketing", marketingContact?.email || "",
    MARGIN_L + (col3W + 6) * 2, y, col3W);
  y -= 28 + 4;

  // Ansprechpartner EDV
  drawFieldRow(page, lf, lf, "Ansprechpartner EDV",
    edvContact ? `${edvContact.vorname} ${edvContact.nachname}`.trim() : "",
    MARGIN_L, y, col3W);
  drawFieldRow(page, lf, lf, "Telefon EDV", edvContact?.telefon || edvContact?.handy || "",
    MARGIN_L + col3W + 6, y, col3W);
  drawFieldRow(page, lf, lf, "E-Mail EDV", edvContact?.email || "",
    MARGIN_L + (col3W + 6) * 2, y, col3W);
  y -= 28 + 4;

  // Inhaber | E-Mail Inhaber
  y = drawTwoColRow(page, lf, lf,
    { label: "Inhaber", value: gf ? `${gf.vorname} ${gf.nachname}`.trim() : "" },
    { label: "E-Mail Inhaber", value: gf?.email || "" },
    y) - 4;

  // Geschäftsführer | E-Mail Geschäftsführer
  y = drawTwoColRow(page, lf, lf,
    { label: "Geschäftsführer", value: gf ? `${gf.vorname} ${gf.nachname}`.trim() : "" },
    { label: "E-Mail Geschäftsführer", value: gf?.email || "" },
    y) - 4;

  // Webseite
  y = drawFieldRow(page, lf, lf, "Webseite", "", MARGIN_L, y, CONTENT_W);

  // Marke(n) | Warensortiment
  const liefSortimentVal = Array.isArray(fd.liefSortiment)
    ? (fd.liefSortiment as unknown as string[]).join(", ")
    : (fd.liefSortiment as string) ?? "";
  y = drawTwoColRow(page, lf, lf,
    { label: "Marke(n)", value: fd.liefMarken ?? "" },
    { label: "Warensortiment", value: liefSortimentVal },
    y) - 4;

  // GLN-Nr. | UST.Ident.Nr./Wirtschafts-ID.Nr.
  const mainBranch = fd.branches?.[0];
  y = drawTwoColRow(page, lf, lf,
    { label: "GLN-Nr.", value: mainBranch?.gln ?? "" },
    { label: "UST.Ident.Nr./Wirtschafts-ID.Nr.", value: fd.ustId ?? "" },
    y) - 4;

  // Steuernummer
  y = drawFieldRow(page, lf, lf, "Steuernummer", fd.steuernummer ?? "", MARGIN_L, y, CONTENT_W);

  // Bankverbindung header
  page.drawText("Bankverbindung:", { x: MARGIN_L, y, size: 9, font: bf, color: BLACK });
  y -= 18;

  // Bankinstitut | IBAN
  y = drawTwoColRow(page, lf, lf,
    { label: "Bankinstitut", value: fd.bankname ?? "" },
    { label: "IBAN", value: fd.iban ?? "" },
    y) - 4;

  // SWIFT Code | BIC
  y = drawTwoColRow(page, lf, lf,
    { label: "SWIFT Code", value: fd.bic ?? "" },
    { label: "BIC", value: fd.bic ?? "" },
    y) - 8;

  // Notice
  page.drawText(
    "Achtung: Bitte senden Sie uns zusammen mit dem Stammblatt den aktuellen Handelsregisterauszug zu. Vielen Dank!",
    { x: MARGIN_L, y, size: 7.5, font: bf, color: BLACK },
  );
  y -= 24;

  // Signature line
  drawHRule(page, y + 14, MARGIN_L, 180);
  drawHRule(page, y + 14, MARGIN_L + 200, CONTENT_W - 200);
  drawValue(page, lf, new Date().toLocaleDateString("de-DE"), MARGIN_L, y + 16, 8);
  drawLabel(page, lf, "Ort, Datum", MARGIN_L, y + 3, 7);
  drawLabel(page, lf, "Unterschrift", MARGIN_L + 200, y + 3, 7);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function generateNeukundenPdf(state: OnboardingState): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const admin: SupportContact = getResponsibleAdmin(
    state.memberType,
    state.postalCode,
    state.country,
  );

  const page3 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  buildPage3(page3, boldFont, regularFont, state, admin);

  const page4 = pdfDoc.addPage([PAGE_W, PAGE_H]);
  buildPage4(page4, boldFont, regularFont, state);

  return pdfDoc.save();
}

export async function generateLieferantPdf(state: OnboardingState): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  buildLieferantPage(page, boldFont, regularFont, state);

  return pdfDoc.save();
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function downloadPdf(bytes: Uint8Array, filename = "unitex-neukundenformular.pdf") {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  if (isIOS()) {
    // iOS Safari ignores <a download> — open in new tab so the native share sheet appears
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Must be in the DOM for Firefox compatibility
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 150);
}
