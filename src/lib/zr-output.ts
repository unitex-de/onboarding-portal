import type { ZrParsedRow } from "@/lib/zr-sessions";
import { type DebitorenData, getUmsatz } from "@/lib/zr-debitoren";

export type HaendlerStat = {
  haendler: string;
  total: number;
  zr: number;
  nonZr: number;
  review: number;
  pct: number;
};

export type BrandTotal = { brand: string; total: number; haendlerCount: number };
export type HaendlerTotal = { haendler: string; total: number; brandCount: number };

/** Matrix-Zellwert: Zahl = Summe der Werte, `true` = vorhanden aber ohne
 * bekannten Wert, fehlt = nicht vertreten. Entspricht None/True/Zahl in Python. */
export type MatrixCell = number | true;

export type OutputData = {
  haendlerList: string[];
  zrBrands: string[];
  matrix: Record<string, Record<string, MatrixCell>>;
  stats: HaendlerStat[];
  topBrands: BrandTotal[];
  haendlerTotals: HaendlerTotal[];
  hasRevenueData: boolean;
};

/** Port von app.py::output (ohne den Debitoren-Abgleich-Teil, der folgt separat). */
export function computeOutput(rows: ZrParsedRow[]): OutputData {
  const haendlerList = [...new Set(rows.map((r) => r.haendler))].sort();
  const zrBrands = [
    ...new Set(
      rows
        .filter((r) => r.matchedKanoname && (r.matchStatus === "auto" || r.matchStatus === "confirmed"))
        .map((r) => r.matchedKanoname as string)
    ),
  ].sort();

  const matrix: Record<string, Record<string, MatrixCell>> = {};
  for (const h of haendlerList) matrix[h] = {};
  for (const r of rows) {
    if ((r.matchStatus === "auto" || r.matchStatus === "confirmed") && r.matchedKanoname) {
      const h = r.haendler;
      const b = r.matchedKanoname;
      const cur = matrix[h][b];
      if (r.wert !== null) {
        matrix[h][b] = (typeof cur === "number" ? cur : 0) + r.wert;
      } else if (cur === undefined) {
        matrix[h][b] = true;
      }
    }
  }

  const stats: HaendlerStat[] = haendlerList.map((h) => {
    const hr = rows.filter((r) => r.haendler === h);
    const total = hr.length;
    const zr = hr.filter((r) => r.matchStatus === "auto" || r.matchStatus === "confirmed").length;
    const nonZr = hr.filter((r) => r.matchStatus === "non_zr").length;
    const review = hr.filter((r) => r.matchStatus === "review").length;
    return { haendler: h, total, zr, nonZr, review, pct: total ? Math.round((zr / total) * 100) : 0 };
  });

  const brandTotals = new Map<string, number>();
  const brandHaendlerCount = new Map<string, number>();
  for (const h of haendlerList) {
    for (const [b, v] of Object.entries(matrix[h])) {
      if (typeof v === "number") {
        brandTotals.set(b, (brandTotals.get(b) ?? 0) + v);
        brandHaendlerCount.set(b, (brandHaendlerCount.get(b) ?? 0) + 1);
      }
    }
  }
  const topBrands: BrandTotal[] = [...brandTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([brand, total]) => ({ brand, total, haendlerCount: brandHaendlerCount.get(brand) ?? 0 }));

  const haendlerTotals: HaendlerTotal[] = haendlerList
    .map((h) => {
      const vals = Object.values(matrix[h]).filter((v): v is number => typeof v === "number");
      if (vals.length === 0) return null;
      return { haendler: h, total: vals.reduce((a, b) => a + b, 0), brandCount: vals.length };
    })
    .filter((x): x is HaendlerTotal => x !== null)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return { haendlerList, zrBrands, matrix, stats, topBrands, haendlerTotals, hasRevenueData: brandTotals.size > 0 };
}

/** Port von fmt_eur */
export function fmtEur(val: number | null | undefined): string {
  if (val === null || val === undefined) return "–";
  return `${Math.round(val).toLocaleString("de-DE")} €`;
}

// ── ZR-Ist-Umsatz-Abgleich gegen Debitorenliste ─────────────────────────────
// Vergleicht den Wert aus der Kreditorenliste (was der Händler selbst
// gebucht hat) mit dem, was laut ZR-Debitorenliste tatsächlich über die ZR
// abgerechnet wurde. Große Abweichungen deuten darauf hin, dass der Händler
// die Marke zwar kauft, aber nicht (vollständig) über die ZR abrechnet.

export type DebComparisonRow = {
  haendler: string;
  brand: string;
  kreditWert: number | null;
  zrWert: number | null;
  delta: number | null;
  wertTyp: string | null;
};

export function computeDebComparison(rows: ZrParsedRow[], data: OutputData, debData: DebitorenData): DebComparisonRow[] {
  const haendlerKundenNr = new Map<string, string[]>();
  const haendlerBrandLief = new Map<string, string>(); // key: `${haendler}|${brand}`

  for (const r of rows) {
    const h = r.haendler;
    if (r.kundenNr && !haendlerKundenNr.has(h)) {
      haendlerKundenNr.set(h, r.kundenNr.split(",").filter((k) => k));
    }
    if ((r.matchStatus === "auto" || r.matchStatus === "confirmed") && r.matchedKanoname && r.matchedLiefNr) {
      haendlerBrandLief.set(`${h}|${r.matchedKanoname}`, r.matchedLiefNr);
    }
  }

  const result: DebComparisonRow[] = [];
  for (const h of data.haendlerList) {
    const kundenNrs = haendlerKundenNr.get(h);
    if (!kundenNrs || kundenNrs.length === 0) continue;
    for (const [b, kreditVal] of Object.entries(data.matrix[h] ?? {})) {
      const liefNr = haendlerBrandLief.get(`${h}|${b}`);
      if (!liefNr) continue;
      const zrVal = getUmsatz(debData, liefNr, kundenNrs);
      const kv = typeof kreditVal === "number" ? kreditVal : null;
      if (zrVal === null && kv === null) continue;
      const delta = kv !== null && zrVal !== null ? kv - zrVal : null;
      const wertTyp = rows.find((r) => r.haendler === h && r.matchedKanoname === b && r.wert !== null)?.wertTyp ?? null;
      result.push({ haendler: h, brand: b, kreditWert: kv, zrWert: zrVal, delta, wertTyp });
    }
  }
  result.sort((a, b) => (b.delta !== null ? Math.abs(b.delta) : 0) - (a.delta !== null ? Math.abs(a.delta) : 0));
  return result;
}