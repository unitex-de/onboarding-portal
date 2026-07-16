import * as XLSX from "xlsx-js-style";
import type { ZrParsedRow } from "@/lib/zr-sessions";
import type { ZrSupplier } from "@/lib/zr-suppliers";
import { type DebitorenData, getUmsatz } from "@/lib/zr-debitoren";

type ExportRow = {
  haendler: string;
  firmierung: string;
  marke: string;
  kreditorWert: number | null;
  debWert: number | null;
  delta: number | null;
};

/** Port aus app.py::export — Gruppierung Händler x Firmierung, Marken-Sammlung,
 * Fallback auf Stammdaten-Marke, Debitoren-Abgleich für die Differenz-Spalte. */
function buildExportRows(rows: ZrParsedRow[], suppliers: ZrSupplier[], debData: DebitorenData | null): ExportRow[] {
  const suppliersByLiefNr = new Map(suppliers.map((s) => [s.liefNr, s]));

  const haendlerKundenNr = new Map<string, string[]>();
  for (const r of rows) {
    if (r.kundenNr && !haendlerKundenNr.has(r.haendler)) {
      haendlerKundenNr.set(r.haendler, r.kundenNr.split(",").filter((k) => k));
    }
  }

  type Group = { liefNr: string | null; marken: Set<string>; kreditorWert: number | null };
  const groups = new Map<string, Group>(); // key: `${haendler}|${firmierung}`

  for (const r of rows) {
    if ((r.matchStatus === "auto" || r.matchStatus === "confirmed") && r.matchedKanoname) {
      const key = `${r.haendler}|${r.matchedKanoname}`;
      let g = groups.get(key);
      if (!g) { g = { liefNr: r.matchedLiefNr, marken: new Set(), kreditorWert: null }; groups.set(key, g); }
      if (r.matchedMarke) g.marken.add(r.matchedMarke);
      if (r.wert !== null) g.kreditorWert = (g.kreditorWert ?? 0) + r.wert;
    }
  }

  const exportRows: ExportRow[] = [];
  const sortedEntries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [key, g] of sortedEntries) {
    const [haendler, firmierung] = key.split("|");
    let markeStr = [...g.marken].sort().join(", ");
    if (!markeStr && g.liefNr) {
      markeStr = suppliersByLiefNr.get(g.liefNr)?.marke ?? "";
    }
    let debWert: number | null = null;
    const kundenNrs = haendlerKundenNr.get(haendler);
    if (debData && kundenNrs && g.liefNr) {
      debWert = getUmsatz(debData, g.liefNr, kundenNrs);
    }
    const delta = g.kreditorWert !== null && debWert !== null ? g.kreditorWert - debWert : null;
    exportRows.push({ haendler, firmierung, marke: markeStr, kreditorWert: g.kreditorWert, debWert, delta });
  }
  return exportRows;
}

const HEADER_FILL = { patternType: "solid", fgColor: { rgb: "000844" } };
const HEADER_FONT = { color: { rgb: "FFFFFF" }, bold: true, name: "Arial", sz: 10 };
const CELL_FONT = { name: "Arial", sz: 10 };
const POS_FONT = { name: "Arial", sz: 10, color: { rgb: "6E9B52" } }; // positive Differenz (Kreditor > Debitor)
const NEG_FONT = { name: "Arial", sz: 10, color: { rgb: "C0392B" } }; // negative Differenz
const THIN = { style: "thin", color: { rgb: "CCCCCC" } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const EUR_FMT = '#,##0" €"';

export async function exportSessionToExcel(params: {
  sessionId: number;
  rows: ZrParsedRow[];
  suppliers: ZrSupplier[];
  debData: DebitorenData | null;
  filename?: string;
}) {
  const { sessionId, rows, suppliers, debData } = params;
  const exportRows = buildExportRows(rows, suppliers, debData);

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: ZR-Abdeckung ────────────────────────────────────────────────
  const headers = ["Händler", "Firmierung", "Marke", "Umsatz Kreditor", "Umsatz Debitor", "Differenz"];
  const aoa: (string | number | null)[][] = [
    headers,
    ...exportRows.map((r) => [r.haendler, r.firmierung, r.marke, r.kreditorWert, r.debWert, r.delta]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(aoa);
  ws1["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  ws1["!autofilter"] = { ref: `A1:F${aoa.length}` };

  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws1[addr]) ws1[addr].s = { fill: HEADER_FILL, font: HEADER_FONT, alignment: { horizontal: "left" } };
  }
  for (let r = 1; r < aoa.length; r++) {
    const row = exportRows[r - 1];
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws1[addr]) continue;
      const isNumCol = c >= 3;
      let font = CELL_FONT;
      let numFmt: string | undefined;
      if (c === 3 && row.kreditorWert !== null) numFmt = EUR_FMT;
      if (c === 4 && row.debWert !== null) numFmt = EUR_FMT;
      if (c === 5) {
        if (row.delta !== null) { numFmt = EUR_FMT; font = row.delta >= 0 ? POS_FONT : NEG_FONT; }
      }
      ws1[addr].s = { font, alignment: { horizontal: isNumCol ? "right" : "left" }, border: BORDER };
      if (numFmt) ws1[addr].z = numFmt;
    }
  }
  XLSX.utils.book_append_sheet(wb, ws1, "ZR-Abdeckung");

  // ── Sheet 2: Details (Rohdaten je Zeile) ─────────────────────────────────
  const detailHeaders = ["Händler", "Rohname", "Firmierung", "Marke (Treffer)", "Lief.Nr", "Wert", "Wert-Typ", "Status", "Score"];
  const detailAoa: (string | number | null)[][] = [
    detailHeaders,
    ...rows.map((r) => [
      r.haendler, r.rawName, r.matchedKanoname ?? "–", r.matchedMarke ?? "", r.matchedLiefNr ?? "–",
      r.wert, r.wertTyp, r.matchStatus, r.matchScore,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(detailAoa);
  ws2["!cols"] = detailHeaders.map(() => ({ wch: 22 }));
  for (let c = 0; c < detailHeaders.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws2[addr]) ws2[addr].s = { fill: HEADER_FILL, font: HEADER_FONT };
  }
  XLSX.utils.book_append_sheet(wb, ws2, "Details");

  XLSX.writeFile(wb, params.filename ?? `ZR-Abdeckung_Session_${sessionId}.xlsx`);
}
