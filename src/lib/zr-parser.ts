import * as XLSX from "xlsx";

export type ParsedRow = {
  haendler: string;
  rawName: string;
  wert: number | null;
  wertTyp: string;
};

export type Grid = (string | number)[][];

// ── Kleine Hilfsfunktionen, Port aus parser.py ──────────────────────────────

function cleanStr(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim().replace(/^['"]+|['"]+$/g, "").trim();
}

/** Port von to_float. Kleine bewusste Abweichung vom Original: SheetJS liefert
 * echte Excel-Zahlenzellen bereits als JS number (kein Umweg über String-Parsing
 * nötig, anders als bei pandas mit dtype=str). Nur Text-Zellen mit Zahlen als
 * String (deutsches oder einfaches Format) durchlaufen die Regex-Erkennung. */
function toFloat(val: unknown): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const trimmed = String(val).trim();
  if (trimmed === "" || trimmed.toLowerCase() === "nan") return null;
  let s = trimmed.replace(/'/g, "").replace(/\s+/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const SKIP_EXACT = new Set([
  "lieferant", "marke", "endsumme", "summe", "gesamt", "total", "konto",
  "bezeichnung", "name", "text", "buchungstext", "beschriftung",
  "label/marke", "umsatz", "nummer", "indigo", "beleg", "belegnummer",
  "rechnungsnummer", "rechnungs-nr.", "rechnungsart", "rechnungsdatum",
  "plz", "ort", "straße", "anrede", "firma", "kontonummer", "kontobezeichnung",
  "lieferantennummer",
]);

function isHeaderOrTotal(val: unknown): boolean {
  const s = String(val ?? "").toLowerCase().trim();
  if (!s || s === "nan" || s.length < 2) return true;
  if (SKIP_EXACT.has(s)) return true;
  if (["endsumme", "summe", "gesamt", "we-einkaufs", "ek wert"].some((sk) => s.startsWith(sk))) return true;
  if (/^-?\d[\d.\-/\s]*$/.test(s)) return true; // reine Zahlen, Kontonummern, Belegreferenzen
  if (/@|^\d{5}\s|str\.$|straße$/.test(s)) return true; // E-Mail/Adress-Indikatoren
  return false;
}

function rowLower(row: (string | number)[]): string[] {
  return row.map((v) => String(v ?? "").toLowerCase().trim());
}

function cell(grid: Grid, r: number, c: number): string | number | undefined {
  return grid[r]?.[c];
}

function findHeaderRow(grid: Grid, keywords: string[], maxScan = 15): number | null {
  let bestRow: number | null = null;
  let bestHits = 0;
  for (let i = 0; i < Math.min(maxScan, grid.length); i++) {
    const vals = rowLower(grid[i]);
    const hits = keywords.filter((kw) => vals.includes(kw)).length;
    if (hits > bestHits) { bestHits = hits; bestRow = i; }
  }
  return bestHits >= 1 ? bestRow : null;
}

const QUANTITY_HINTS = ["menge", "stück", "stk", "anzahl", "positionen", "pos.", "stueck", "qty"];
const VALUE_HINTS = ["wert", "umsatz", "betrag", "brutto", "netto", "summe", "ek", "vk", "preis", "eur", "haben", "soll"];
const isQuantityHeader = (h: string) => QUANTITY_HINTS.some((k) => h.toLowerCase().includes(k));
const isValueHeader = (h: string) => VALUE_HINTS.some((k) => h.toLowerCase().includes(k));

// ── Sheet als gleichmäßiges Grid einlesen (statt sheet_to_json, für volle
// Kontrolle über Zellentypen — analog zu pandas' NaN-gefülltem DataFrame) ────
export function sheetToGrid(ws: XLSX.WorkSheet): Grid {
  const ref = ws["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const grid: Grid = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: (string | number)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cellObj = ws[addr];
      if (!cellObj || cellObj.v === undefined || cellObj.v === null) { row.push(""); continue; }
      if (typeof cellObj.v === "number") row.push(cellObj.v);
      else if (cellObj.v instanceof Date) row.push(cellObj.v.toISOString());
      else row.push(String(cellObj.v));
    }
    grid.push(row);
  }
  return grid;
}

const SHEET_KEYWORDS = ["kred", "lieferant", "susa", "marken", "jahresmeldung", "analyse", "eingang", "unitex", "monat", "kontoblatt", "caption"];

function pickSheet(wb: XLSX.WorkBook): Grid {
  let sheetName = wb.SheetNames[0];
  for (const sn of wb.SheetNames) {
    if (SHEET_KEYWORDS.some((k) => sn.toLowerCase().includes(k))) { sheetName = sn; break; }
  }
  let grid = sheetToGrid(wb.Sheets[sheetName]);
  if (grid.length === 0 || (grid[0]?.length ?? 0) === 0) {
    for (const sn of wb.SheetNames) {
      const g = sheetToGrid(wb.Sheets[sn]);
      if (g.length > 0 && (g[0]?.length ?? 0) > 0) { grid = g; break; }
    }
  }
  return grid;
}

// ── Format-Strategien, je 1:1 aus parser.py portiert ────────────────────────

function tryLieferantenauswertung(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    const nc = vals.findIndex((v) => v.includes("lieferanten") && !v.includes("ek-wert") && !v.includes("ek wert"));
    const vc = vals.findIndex((v) => v.includes("ek-wert") || v.includes("ek wert"));
    if (nc === -1 || vc === -1) continue;
    const rows: ParsedRow[] = [];
    for (let j = i + 1; j < grid.length; j++) {
      const raw = cleanStr(cell(grid, j, nc));
      if (isHeaderOrTotal(raw) || !raw || raw.length < 2) continue;
      if (raw.toLowerCase().startsWith("sonstige lieferant")) continue;
      let name = raw.replace(/^[\d.]{1,10}\s+/, "").trim();
      if (!name) name = raw;
      const wert = toFloat(cell(grid, j, vc));
      rows.push({ haendler: h, rawName: name, wert, wertTyp: "EK (Lieferantenauswertung)" });
    }
    return rows.length > 0 ? rows : null;
  }
  return null;
}

function tryLieferantLieferantenname(grid: Grid, h: string): ParsedRow[] | null {
  const hdr = findHeaderRow(grid, ["lieferant", "lieferantenname"]);
  if (hdr === null) return null;
  const vals = rowLower(grid[hdr]);
  const nc = vals.indexOf("lieferantenname");
  if (nc === -1) return null;
  const rowsRaw = new Map<string, ParsedRow>();
  for (let j = hdr + 1; j < grid.length; j++) {
    const name = cleanStr(cell(grid, j, nc));
    if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
    const key = name.toUpperCase().trim();
    if (!rowsRaw.has(key)) rowsRaw.set(key, { haendler: h, rawName: name, wert: null, wertTyp: "unbekannt (aggregiert)" });
  }
  return rowsRaw.size > 0 ? [...rowsRaw.values()] : null;
}

function tryKerMitText(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("lieferant") && vals.includes("text")) {
      const nc = vals.indexOf("text");
      const vc = vals.findIndex((v) => v.includes("ek") || v.includes("kumuliert") || v.includes("we"));
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
        let wert = vc !== -1 ? toFloat(cell(grid, j, vc)) : null;
        if (wert !== null) wert = Math.abs(wert);
        rows.push({ haendler: h, rawName: name, wert, wertTyp: "EK (kumuliert)" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function trySimple(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const val = String(grid[i][0] ?? "").toLowerCase().trim();
    if (["lieferant", "marke", "label/marke"].includes(val)) {
      const headers = grid[i].map((v) => String(v ?? "").toLowerCase());
      const candidateCols: number[] = [];
      for (let c = 1; c < headers.length; c++) if (!isQuantityHeader(headers[c])) candidateCols.push(c);
      const preferredCols = candidateCols.filter((c) => isValueHeader(headers[c]));
      const searchCols = preferredCols.length > 0 ? preferredCols : candidateCols;
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, 0));
        if (isHeaderOrTotal(name)) continue;
        let wert: number | null = null;
        let wertTyp = "unbekannt";
        for (const col of searchCols) {
          const v = toFloat(cell(grid, j, col));
          if (v !== null && v > 0) {
            const header = headers[col];
            wertTyp = header.includes("vk") || header.includes("verkauf") ? "VK" : header.includes("ek") || header.includes("we") ? "EK" : "unbekannt";
            wert = v;
            break;
          }
        }
        if (name && name.length > 1) rows.push({ haendler: h, rawName: name, wert, wertTyp });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function tryKer(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("marke") && vals.some((v) => v.includes("vk") || v.includes("umsatz"))) {
      const nc = vals.indexOf("marke");
      let vc = vals.findIndex((v) => v.includes("vk") || v.includes("umsatz"));
      if (vc === -1) {
        vc = 1;
        for (let j = 1; j < vals.length; j++) { if (!isQuantityHeader(vals[j])) { vc = j; break; } }
      }
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name)) continue;
        const wert = toFloat(cell(grid, j, vc));
        if (name && name.length > 1) rows.push({ haendler: h, rawName: name, wert, wertTyp: "VK" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function trySusaKontoblatt(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("konto") && vals.includes("bezeichnung")) {
      const nc = vals.indexOf("bezeichnung");
      let vc = vals.findIndex((v) => v.includes("jahr") && v.includes("eur"));
      if (vc === -1) vc = vals.findIndex((v) => v.includes("haben"));
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name) || name.toLowerCase().includes("kreditoren") || name.toLowerCase().includes("gesamtsaldo")) continue;
        if (!name || name.length < 2) continue;
        let wert: number | null = null;
        // Original-Quirk aus database.py: "if vc" in Python behandelt Spaltenindex 0
        // als falsy — bewusst repliziert, damit sich das Verhalten nicht ändert.
        if (vc !== -1 && vc !== 0) {
          const raw = toFloat(cell(grid, j, vc));
          if (raw !== null) wert = Math.abs(raw);
        }
        rows.push({ haendler: h, rawName: name, wert, wertTyp: "EK (Jahresumsatz)" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function tryEinzelbuchungen(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("buchungstext") && vals.some((v) => v.includes("soll"))) {
      const nc = vals.indexOf("buchungstext");
      const sc = vals.findIndex((v) => v.includes("soll") && v.includes("umsatz"));
      const rowsRaw = new Map<string, ParsedRow>();
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name)) continue;
        const key = name.replace(/\s+(GmbH|AG|KG|Co\.|&|e\.K\.).*/i, "").trim();
        if (!key || key.length < 2) continue;
        const wert = sc !== -1 && sc !== 0 ? toFloat(cell(grid, j, sc)) : null;
        if (!rowsRaw.has(key)) rowsRaw.set(key, { haendler: h, rawName: key, wert: 0, wertTyp: "EK (Buchungen)" });
        if (wert) {
          const entry = rowsRaw.get(key)!;
          entry.wert = (entry.wert ?? 0) + wert;
        }
      }
      if (rowsRaw.size > 0) {
        const result = [...rowsRaw.values()];
        for (const r of result) if (r.wert === 0) r.wert = null;
        return result;
      }
    }
  }
  return null;
}

function tryWareneingang(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = grid[i].map((v) => cleanStr(v).toLowerCase());
    if (vals.some((v) => v.includes("lieferant")) && vals.some((v) => v.includes("we ek") || v.includes("ek.ohne"))) {
      const ncFound = vals.findIndex((v) => v.includes("lieferant"));
      const nc = ncFound !== -1 ? ncFound : 0;
      const vc = vals.findIndex((v) => v.includes("we ek") || v.includes("ek.ohne"));
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
        const wert = vc !== -1 && vc !== 0 ? toFloat(cell(grid, j, vc)) : null;
        rows.push({ haendler: h, rawName: name, wert, wertTyp: "EK (Wareneingang)" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function tryNamenOnly(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("bezeichnung 1")) {
      const nc = vals.indexOf("bezeichnung 1");
      const bc = vals.findIndex((v) => v.includes("bezeichnung 2"));
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        const brand = bc !== -1 && bc !== 0 ? cleanStr(cell(grid, j, bc)) : "";
        if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
        const display = brand && brand.toLowerCase() !== "nan" && brand.length > 1 ? brand : name;
        rows.push({ haendler: h, rawName: display, wert: null, wertTyp: "keine Umsatzdaten" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function tryKontonamenDedupliziert(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("beschriftung")) {
      const nc = vals.indexOf("beschriftung");
      const vc = vals.findIndex((v) => v.includes("umsatz") || v.includes("haben"));
      const rowsRaw = new Map<string, ParsedRow>();
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
        const key = name.replace(/\s+(GmbH|AG|KG|Co\.|&\s*Co|e\.K\.|KGaA|S\.p\.A\.).*/i, "").trim();
        if (!key || key.length < 2) continue;
        const wert = vc !== -1 && vc !== 0 ? toFloat(cell(grid, j, vc)) : null;
        if (!rowsRaw.has(key)) rowsRaw.set(key, { haendler: h, rawName: key, wert: 0, wertTyp: "EK/VK (Kontoblatt)" });
        if (wert) {
          const entry = rowsRaw.get(key)!;
          entry.wert = (entry.wert ?? 0) + Math.abs(wert);
        }
      }
      if (rowsRaw.size > 0) {
        const result = [...rowsRaw.values()];
        for (const r of result) if (r.wert === 0) r.wert = null;
        return result;
      }
    }
  }
  return null;
}

function tryKontonummerFirma(grid: Grid, h: string): ParsedRow[] | null {
  for (let i = 0; i < grid.length; i++) {
    const vals = rowLower(grid[i]);
    if (vals.includes("kontonummer") && vals.includes("firma")) {
      const nc = vals.indexOf("firma");
      const rows: ParsedRow[] = [];
      for (let j = i + 1; j < grid.length; j++) {
        const name = cleanStr(cell(grid, j, nc));
        if (isHeaderOrTotal(name) || !name || name.length < 2) continue;
        rows.push({ haendler: h, rawName: name, wert: null, wertTyp: "keine Umsatzdaten" });
      }
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

function fallback(grid: Grid, h: string): ParsedRow[] {
  const colCount = grid[0]?.length ?? 0;
  let bestCol = 0, bestCount = 0;
  for (let col = 0; col < colCount; col++) {
    let plausible = 0;
    for (const row of grid) {
      const v = row[col];
      if (v === undefined || v === null || v === "") continue;
      const s = String(v);
      if (s.length <= 2) continue;
      if (/^-?\d[\d.\-/\s]*$/.test(s)) continue;
      plausible++;
    }
    if (plausible > bestCount) { bestCount = plausible; bestCol = col; }
  }
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const row of grid) {
    const name = cleanStr(row[bestCol]);
    if (isHeaderOrTotal(name) || seen.has(name)) continue;
    seen.add(name);
    rows.push({ haendler: h, rawName: name, wert: null, wertTyp: "unbekannt (fallback)" });
  }
  return rows;
}

// ── Öffentliche API ──────────────────────────────────────────────────────────

/** Port von parser.py::parse_file. Probiert die Format-Strategien der Reihe
 * nach durch, bis eine ein Ergebnis liefert; ganz am Ende der undbedingt
 * greifende Fallback (spaltenweise Namens-Heuristik). */
export function parseCreditorFile(buffer: ArrayBuffer, haendlerName: string): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const grid = pickSheet(wb);
  if (grid.length === 0) return [];

  const strategies = [
    tryLieferantenauswertung,
    tryLieferantLieferantenname,
    tryKerMitText,
    trySimple,
    tryKer,
    trySusaKontoblatt,
    tryEinzelbuchungen,
    tryWareneingang,
    tryNamenOnly,
    tryKontonamenDedupliziert,
    tryKontonummerFirma,
  ];
  for (const strategy of strategies) {
    const result = strategy(grid, haendlerName);
    if (result) return result;
  }
  return fallback(grid, haendlerName);
}

/** Port von app.py::haendler_from_filename. */
export function haendlerFromFilename(fname: string): string {
  let name = fname.replace(/\.[^.]+$/, "");
  name = name.replace(/Kreditorenliste_/g, "").replace(/kreditorenliste_/g, "");
  name = name.replace(/_\d{8}$/, "");
  name = name.replace(/_\d{4,5}(_\d{4,5})?$/, "");
  name = name.replace(/_EKWerte.*/, "");
  name = name.replace(/_unitex.*/i, "");
  return name.replace(/_/g, " ").trim();
}

/** Port von app.py::kunden_nr_from_filename. */
export function kundenNrFromFilename(fname: string): string[] {
  const name = fname.replace(/\.[^.]+$/, "");
  const matches = [...name.matchAll(/(?<=_)(\d{3,5})(?=_|$)/g)].map((m) => m[1]);
  return [...new Set(matches)];
}