import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export type ZrSupplier = {
  liefNr: string;
  firmierung: string;
  marke: string;
  aliases: string;
  sortiment: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: any): ZrSupplier {
  return {
    liefNr: row.lief_nr,
    firmierung: row.firmierung ?? "",
    marke: row.marke ?? "",
    aliases: row.aliases ?? "",
    sortiment: row.sortiment ?? "",
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSuppliers(): Promise<ZrSupplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("lief_nr", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function upsertSupplier(s: {
  liefNr: string;
  firmierung: string;
  marke: string;
  aliases: string;
  sortiment: string;
  active: boolean;
}) {
  const { error } = await supabase.from("suppliers").upsert(
    {
      lief_nr: s.liefNr,
      firmierung: s.firmierung,
      marke: s.marke,
      aliases: s.aliases,
      sortiment: s.sortiment,
      active: s.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lief_nr" }
  );
  if (error) throw error;
}

export async function setSupplierActive(liefNr: string, active: boolean) {
  const { error } = await supabase
    .from("suppliers")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("lief_nr", liefNr);
  if (error) throw error;
}

export async function deleteSupplier(liefNr: string) {
  const { error } = await supabase.from("suppliers").delete().eq("lief_nr", liefNr);
  if (error) throw error;
}

// ── Import aus Master-Dokument ──────────────────────────────────────────────
// Portiert aus database.py::import_suppliers_from_master (Python/pandas) auf
// SheetJS. Gleiche Logik: Header-Zeile per "Lieferantennummer" in Spalte A
// finden (Fallback Zeile 4), bestehendes active-Flag bleibt beim Reimport
// erhalten, nur die Stammdaten-Felder werden aus der Datei übernommen.

type MasterRow = {
  liefNr: string;
  firmierung: string;
  marke: string;
  aliases: string;
  sortiment: string;
};

function parseMasterWorkbook(buffer: ArrayBuffer): MasterRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames.includes("Master") ? "Master" : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  let headerIdx = raw.findIndex(
    (row) => String(row?.[0] ?? "").trim().toLowerCase() === "lieferantennummer"
  );
  if (headerIdx === -1) headerIdx = 3;

  const headers = (raw[headerIdx] ?? []).map((h) => String(h).trim());
  const col = (name: string) => headers.indexOf(name);
  const idxLief = col("Lieferantennummer");
  const idxFirm = col("Firmierung");
  const idxMarke = col("Marke");
  const idxAliases = col("Aliases");
  const idxSortiment = col("Sortiment");

  const out: MasterRow[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const rawLief = String(row[idxLief] ?? "").trim();
    if (!rawLief || rawLief.toLowerCase() === "nan") continue;
    const liefNrNum = Number(rawLief);
    const liefNr = Number.isFinite(liefNrNum) && rawLief !== "" ? String(Math.trunc(liefNrNum)) : rawLief;
    out.push({
      liefNr,
      firmierung: String(row[idxFirm] ?? "").trim(),
      marke: String(row[idxMarke] ?? "").trim(),
      aliases: String(row[idxAliases] ?? "").trim(),
      sortiment: String(row[idxSortiment] ?? "").trim(),
    });
  }
  return out;
}

/** Importiert/aktualisiert Lieferanten-Stammdaten aus dem Master-Dokument.
 * Gibt die Anzahl importierter/aktualisierter Zeilen zurück. */
export async function importSuppliersFromMaster(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const rows = parseMasterWorkbook(buffer);
  if (rows.length === 0) return 0;

  // Bestehende active-Flags einmal komplett laden (Tabelle ist mit ~600
  // Einträgen klein genug, spart ein potenziell sehr langes .in()-Query).
  const { data: existing, error: fetchError } = await supabase
    .from("suppliers")
    .select("lief_nr, active");
  if (fetchError) throw fetchError;
  const activeMap = new Map((existing ?? []).map((r) => [r.lief_nr as string, r.active as boolean]));

  const payload = rows.map((r) => ({
    lief_nr: r.liefNr,
    firmierung: r.firmierung,
    marke: r.marke,
    aliases: r.aliases,
    sortiment: r.sortiment,
    active: activeMap.has(r.liefNr) ? activeMap.get(r.liefNr) : true,
    updated_at: new Date().toISOString(),
  }));

  const BATCH = 200;
  for (let i = 0; i < payload.length; i += BATCH) {
    const { error } = await supabase
      .from("suppliers")
      .upsert(payload.slice(i, i + BATCH), { onConflict: "lief_nr" });
    if (error) throw error;
  }
  return payload.length;
}