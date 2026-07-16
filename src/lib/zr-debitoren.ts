import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { sheetToGrid, type Grid } from "@/lib/zr-parser";

const BUCKET = "zr-debitoren";

// ── Snapshot-Verwaltung (Supabase Storage) ──────────────────────────────────

export type DebitorenSnapshot = {
  path: string; // Dateiname inkl. Zeitstempel-Präfix, dient als Storage-Pfad
  createdAt: string;
};

function timestampPrefix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Neueste Snapshots zuerst (Zeitstempel-Präfix im Dateinamen sortiert). */
export async function listDebitorenSnapshots(): Promise<DebitorenSnapshot[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { sortBy: { column: "name", order: "desc" } });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name.toLowerCase().endsWith(".xlsx"))
    .map((f) => ({ path: f.name, createdAt: f.created_at ?? "" }));
}

/** Alte Snapshots werden nie überschrieben, damit sich der Verlauf über
 * mehrere Perioden verfolgen lässt (wie im Original). */
export async function uploadDebitorenSnapshot(file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${timestampPrefix()}__${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function deleteDebitorenSnapshot(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

async function downloadDebitorenSnapshot(path: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return await data.arrayBuffer();
}

// ── Parser, Port von debitoren.py::load ─────────────────────────────────────
// Erwartetes Format: Spalte 0 Lieferant (Lief.Nr), Spalte 2 Lieferanten-Name,
// Spalte 3 Kunde (Kundennummer), Spalte 4 Kunden-Name, Spalte 9 Umsatz brutto
// (aktuelle Periode, Spaltenname enthält das Stichdatum), Spalte 10 Umsatz Vgl.

export type DebitorenEntry = {
  liefNr: string;
  kundeNr: string;
  liefName: string;
  kundeName: string;
  umsatz: number;
  umsatzVgl: number;
};

export type DebitorenData = {
  lookup: Map<string, DebitorenEntry>;
  periodLabel: string | null;
};

const keyOf = (liefNr: string, kundeNr: string) => `${liefNr}|${kundeNr}`;

function toIntString(val: unknown): string | null {
  if (val === undefined || val === null || val === "") return null;
  const n = typeof val === "number" ? val : Number(String(val).trim());
  if (!Number.isFinite(n)) return null;
  return String(Math.trunc(n));
}

function toNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const n = Number(String(val).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDebitorenGrid(grid: Grid): DebitorenData {
  if (grid.length === 0) return { lookup: new Map(), periodLabel: null };

  const headers = grid[0].map((h) => String(h ?? ""));
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  let umsatzIdx = lowerHeaders.findIndex((h) => h.includes("umsatz brutto"));
  if (umsatzIdx === -1) umsatzIdx = headers.length > 9 ? 9 : -1;
  let vglIdx = lowerHeaders.findIndex((h) => h.includes("umsatz vgl"));
  if (vglIdx === -1) vglIdx = headers.length > 10 ? 10 : -1;

  const periodLabel = umsatzIdx !== -1 ? String(headers[umsatzIdx]).trim() : null;

  const lookup = new Map<string, DebitorenEntry>();
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const liefNr = toIntString(row[0]);
    const kundeNr = toIntString(row[3]);
    if (liefNr === null || kundeNr === null) continue;

    const key = keyOf(liefNr, kundeNr);
    let entry = lookup.get(key);
    if (!entry) {
      entry = {
        liefNr, kundeNr,
        liefName: String(row[2] ?? "").trim(),
        kundeName: String(row[4] ?? "").trim(),
        umsatz: 0, umsatzVgl: 0,
      };
      lookup.set(key, entry);
    }
    const umsatzNum = umsatzIdx !== -1 ? toNumber(row[umsatzIdx]) : null;
    if (umsatzNum !== null) entry.umsatz += umsatzNum;
    const vglNum = vglIdx !== -1 ? toNumber(row[vglIdx]) : null;
    if (vglNum !== null) entry.umsatzVgl += vglNum;
  }
  return { lookup, periodLabel };
}

/** Lädt und parsed einen Snapshot direkt aus dem Storage-Bucket. Kein Caching
 * wie im Python-Original nötig — wird nur beim Öffnen der Ergebnis-Seite
 * einmal aufgerufen. */
export async function loadDebitorenSnapshot(path: string): Promise<DebitorenData> {
  const buffer = await downloadDebitorenSnapshot(path);
  const wb = XLSX.read(buffer, { type: "array" });
  const grid = sheetToGrid(wb.Sheets[wb.SheetNames[0]]);
  return parseDebitorenGrid(grid);
}

/** Port von debitoren.py::get_umsatz. Summiert den ZR-Ist-Umsatz für einen
 * Lieferanten über eine oder mehrere Kundennummern eines Händlers. */
export function getUmsatz(data: DebitorenData, liefNr: string, kundenNrs: string[]): number | null {
  let total = 0;
  let found = false;
  for (const k of kundenNrs) {
    const entry = data.lookup.get(keyOf(String(liefNr).trim(), String(k).trim()));
    if (entry) { total += entry.umsatz; found = true; }
  }
  return found ? total : null;
}
