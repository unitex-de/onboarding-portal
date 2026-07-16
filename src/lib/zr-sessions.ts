import { supabase } from "@/lib/supabase";

export type ZrSession = {
  id: number;
  name: string | null;
  status: string;
  createdAt: string;
};

export type ZrMatchStatus = "auto" | "confirmed" | "review" | "non_zr";

export type ZrParsedRow = {
  id: number;
  sessionId: number;
  haendler: string;
  kundenNr: string | null;
  rawName: string;
  matchedLiefNr: string | null;
  matchedKanoname: string | null;
  matchedMarke: string | null;
  matchScore: number | null;
  matchStatus: ZrMatchStatus;
  wert: number | null;
  wertTyp: string | null;
  checked: boolean;
};

export type NewParsedRow = {
  sessionId: number;
  haendler: string;
  kundenNr: string | null;
  rawName: string;
  matchedLiefNr: string | null;
  matchedKanoname: string | null;
  matchedMarke: string | null;
  matchScore: number | null;
  matchStatus: ZrMatchStatus;
  wert: number | null;
  wertTyp: string | null;
};

function mapSession(row: any): ZrSession {
  return { id: row.id, name: row.name, status: row.status, createdAt: row.created_at };
}

function mapRow(row: any): ZrParsedRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    haendler: row.haendler,
    kundenNr: row.kunden_nr,
    rawName: row.raw_name,
    matchedLiefNr: row.matched_lief_nr,
    matchedKanoname: row.matched_kanoname,
    matchedMarke: row.matched_marke,
    matchScore: row.match_score,
    matchStatus: row.match_status,
    wert: row.wert,
    wertTyp: row.wert_typ,
    checked: row.checked,
  };
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(name: string): Promise<number> {
  const { data, error } = await supabase.from("zr_sessions").insert({ name }).select("id").single();
  if (error) throw error;
  return data.id as number;
}

export async function getSessions(): Promise<ZrSession[]> {
  const { data, error } = await supabase.from("zr_sessions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export async function getSession(sessionId: number): Promise<ZrSession | null> {
  const { data, error } = await supabase.from("zr_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw error;
  return data ? mapSession(data) : null;
}

/** zr_parsed_rows haben ON DELETE CASCADE auf session_id — werden automatisch
 * mitgelöscht, kein separater Lösch-Schritt wie im Python-Original nötig. */
export async function deleteSession(sessionId: number) {
  const { error } = await supabase.from("zr_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

// ── Geparste Zeilen ──────────────────────────────────────────────────────────

export async function insertParsedRows(rows: NewParsedRow[]): Promise<void> {
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    session_id: r.sessionId,
    haendler: r.haendler,
    kunden_nr: r.kundenNr,
    raw_name: r.rawName,
    matched_lief_nr: r.matchedLiefNr,
    matched_kanoname: r.matchedKanoname,
    matched_marke: r.matchedMarke,
    match_score: r.matchScore,
    match_status: r.matchStatus,
    wert: r.wert,
    wert_typ: r.wertTyp,
  }));
  const BATCH = 500;
  for (let i = 0; i < payload.length; i += BATCH) {
    const { error } = await supabase.from("zr_parsed_rows").insert(payload.slice(i, i + BATCH));
    if (error) throw error;
  }
}

export async function getRowsForSession(sessionId: number): Promise<ZrParsedRow[]> {
  const { data, error } = await supabase
    .from("zr_parsed_rows")
    .select("*")
    .eq("session_id", sessionId)
    .order("match_status", { ascending: true })
    .order("match_score", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getReviewRows(sessionId: number): Promise<ZrParsedRow[]> {
  const { data, error } = await supabase
    .from("zr_parsed_rows")
    .select("*")
    .eq("session_id", sessionId)
    .eq("match_status", "review")
    .order("match_score", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function updateRowMapping(params: {
  rowId: number;
  liefNr: string | null;
  kanoname: string | null;
  status: ZrMatchStatus;
  marke?: string | null;
}) {
  const { error } = await supabase
    .from("zr_parsed_rows")
    .update({
      matched_lief_nr: params.liefNr,
      matched_kanoname: params.kanoname,
      matched_marke: params.marke ?? null,
      match_status: params.status,
      checked: true,
    })
    .eq("id", params.rowId);
  if (error) throw error;
}

/** Port von resolve_matching_review_rows: wendet dieselbe Entscheidung auf alle
 * anderen 'review'-Zeilen im selben Batch mit demselben Rohnamen an (z.B. wenn
 * "Jack & Jones" bei mehreren Händlern im selben Batch auftaucht). Gibt die
 * betroffenen row_ids zurück. */
export async function resolveMatchingReviewRows(params: {
  sessionId: number;
  rawName: string;
  liefNr: string | null;
  kanoname: string | null;
  status: ZrMatchStatus;
  marke?: string | null;
}): Promise<number[]> {
  const target = params.rawName.trim().toLowerCase();
  const { data: candidates, error: fetchError } = await supabase
    .from("zr_parsed_rows")
    .select("id, raw_name")
    .eq("session_id", params.sessionId)
    .eq("match_status", "review");
  if (fetchError) throw fetchError;

  const ids = (candidates ?? [])
    .filter((r) => (r.raw_name as string).trim().toLowerCase() === target)
    .map((r) => r.id as number);
  if (ids.length === 0) return [];

  const { error: updateError } = await supabase
    .from("zr_parsed_rows")
    .update({
      matched_lief_nr: params.liefNr,
      matched_kanoname: params.kanoname,
      matched_marke: params.marke ?? null,
      match_status: params.status,
      checked: true,
    })
    .in("id", ids);
  if (updateError) throw updateError;
  return ids;
}

// ── Stichproben-Prüfung ──────────────────────────────────────────────────────
// Ziel: Fehlklassifikationen abfangen, ohne die ganze Liste erneut manuell
// durchgehen zu müssen. Nur die unsichersten automatischen Treffer werden
// vorgelegt: "auto"-Treffer knapp über der Auto-Schwelle (88–93%) und
// "non_zr"-Treffer mit gewisser Restähnlichkeit (55–72%).

const CHECK_SAMPLE_SIZE = 20; // je Kategorie — bewusst gedeckelt

export async function getCheckRows(sessionId: number, limit = CHECK_SAMPLE_SIZE): Promise<ZrParsedRow[]> {
  const { data: autoRows, error: e1 } = await supabase
    .from("zr_parsed_rows")
    .select("*")
    .eq("session_id", sessionId)
    .eq("checked", false)
    .eq("match_status", "auto")
    .gte("match_score", 88)
    .lte("match_score", 93)
    .order("match_score", { ascending: true })
    .limit(limit);
  if (e1) throw e1;

  const { data: nonZrRows, error: e2 } = await supabase
    .from("zr_parsed_rows")
    .select("*")
    .eq("session_id", sessionId)
    .eq("checked", false)
    .eq("match_status", "non_zr")
    .gte("match_score", 55)
    .lte("match_score", 72)
    .order("match_score", { ascending: false })
    .limit(limit);
  if (e2) throw e2;

  return [...(autoRows ?? []), ...(nonZrRows ?? [])].map(mapRow);
}

export async function getCheckCount(sessionId: number): Promise<number> {
  const { count: countAuto, error: e1 } = await supabase
    .from("zr_parsed_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("checked", false)
    .eq("match_status", "auto")
    .gte("match_score", 88)
    .lte("match_score", 93);
  if (e1) throw e1;

  const { count: countNonZr, error: e2 } = await supabase
    .from("zr_parsed_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("checked", false)
    .eq("match_status", "non_zr")
    .gte("match_score", 55)
    .lte("match_score", 72);
  if (e2) throw e2;

  return (countAuto ?? 0) + (countNonZr ?? 0);
}

export async function markChecked(rowId: number) {
  const { error } = await supabase.from("zr_parsed_rows").update({ checked: true }).eq("id", rowId);
  if (error) throw error;
}
