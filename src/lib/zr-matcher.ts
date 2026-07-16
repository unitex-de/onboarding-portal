import * as fuzz from "fuzzball";
import type { ZrSupplier } from "@/lib/zr-suppliers";
import type { LearnedAlias } from "@/lib/zr-aliases";

// ── Konstanten — 1:1 aus matcher.py übernommen ──────────────────────────────
const THRESHOLD_AUTO = 88;
const THRESHOLD_REVIEW = 72;
const THRESHOLD_MIN = 30; // unterhalb: kein Kandidat, reines Nicht-ZR ohne Vorschlag
const MIN_NORM_LEN = 4; // kürzere bereinigte Strings sind zu unsicher für Fuzzy-Matching
const SPREAD_GUARD = 25; // Punkte Differenz zwischen den beiden Scorern, ab der wir dem höheren misstrauen

// Rechtsformen/generische Firmenzusätze — werden aus dem Vergleich entfernt, damit
// sie nicht versehentlich einen Match tragen (z.B. "SAS" bei zwei völlig
// unterschiedlichen Firmen "Gas Bijoux S.A.S." und "SAS TJMAX").
const NOISE_RE = new RegExp(
  "\\b(gmbh|ag|kg|co\\.|kgaa|b\\.v\\.|s\\.p\\.a\\.|a/s|e\\.k\\.|inc\\.|ltd\\.?|ug|llc|s\\.r\\.l\\.|" +
    "s\\.a\\.s\\.|sas|s\\.a\\.r\\.l\\.|sarl|s\\.a\\.|sa|nv|bvba|plc|oy|aps|kft|oü|" +
    "international|europe|european|deutschland|vertriebs|sales|headquarters|hq|" +
    "group|mode|fashion|moden|textil|bekleidung|handel|" +
    "jeans|city|sport|collection|collections|studio|design|wear|by)\\b",
  "gi"
);

export function normalize(s: string): string {
  let out = (s ?? "").toLowerCase().trim();
  out = out.replace(NOISE_RE, "");
  out = out.replace(/[/\\|+&\-']/g, " ");
  out = out.replace(/\./g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function splitList(s: string): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "nan");
}

export type ExpandedSupplier = {
  liefNr: string;
  firmierung: string;
  marken: string[];
  aliases: string[];
  sortiment: string;
};

export function expandActiveSuppliers(suppliers: ZrSupplier[]): ExpandedSupplier[] {
  return suppliers
    .filter((s) => s.active)
    .map((s) => ({
      liefNr: s.liefNr,
      firmierung: s.firmierung,
      marken: splitList(s.marke),
      aliases: splitList(s.aliases),
      sortiment: s.sortiment,
    }));
}

// ── Kern-Scoring, Port von matcher.py::_best_score ──────────────────────────
// Ermittelt den besten Kandidaten UND rechnet für ihn beide Scorer nach. Weichen
// token_set_ratio und WRatio für denselben Kandidaten stark voneinander ab
// (> SPREAD_GUARD), ist das ein typisches Zeichen für einen Fehltreffer durch
// ein einzelnes generisches Wort — dann wird der niedrigere, vorsichtigere Wert
// verwendet statt blind dem höheren zu vertrauen.
type ScoreResult = { candidate: string; score: number; idx: number };

const FUZZ_OPTS = { full_process: false } as const; // Strings sind bereits über normalize() vorverarbeitet

function bestScore(normQuery: string, normCandidates: string[]): ScoreResult | null {
  if (normQuery.length < MIN_NORM_LEN || normCandidates.length === 0) return null;

  const wrResults = fuzz.extract(normQuery, normCandidates, {
    ...FUZZ_OPTS, scorer: fuzz.WRatio, cutoff: THRESHOLD_MIN, limit: 1,
  }) as [string, number, number][];
  const tsrResults = fuzz.extract(normQuery, normCandidates, {
    ...FUZZ_OPTS, scorer: fuzz.token_set_ratio, cutoff: THRESHOLD_MIN, limit: 1,
  }) as [string, number, number][];

  const idxCandidates = new Set<number>();
  if (wrResults.length > 0) idxCandidates.add(wrResults[0][2]);
  if (tsrResults.length > 0) idxCandidates.add(tsrResults[0][2]);
  if (idxCandidates.size === 0) return null;

  let best: ScoreResult | null = null;
  for (const idx of idxCandidates) {
    const cand = normCandidates[idx];
    if (cand.length < MIN_NORM_LEN) continue;
    const sWr = fuzz.WRatio(normQuery, cand, FUZZ_OPTS);
    const sTsr = fuzz.token_set_ratio(normQuery, cand, FUZZ_OPTS);
    const score = Math.abs(sWr - sTsr) > SPREAD_GUARD ? Math.min(sWr, sTsr) : Math.max(sWr, sTsr);
    if (best === null || score > best.score) {
      best = { candidate: cand, score, idx };
    }
  }
  return best;
}

// ── Match-Kontext: Pools werden einmal pro Batch gebaut, nicht pro Zeile ────
export type MatchContext = {
  byLiefNr: Map<string, ExpandedSupplier>;
  firmPool: { liefNr: string; norm: string }[];
  markePool: { liefNr: string; norm: string; marke: string }[];
  aliasPool: { liefNr: string; norm: string }[];
  firmNorms: string[];
  markeNorms: string[];
  aliasNorms: string[];
  learnedAliases: Map<string, LearnedAlias>;
};

export function buildMatchContext(suppliers: ZrSupplier[], learnedAliases: LearnedAlias[]): MatchContext {
  const expanded = expandActiveSuppliers(suppliers);
  const byLiefNr = new Map(expanded.map((s) => [s.liefNr, s]));
  const firmPool = expanded.filter((s) => s.firmierung).map((s) => ({ liefNr: s.liefNr, norm: normalize(s.firmierung) }));
  const markePool = expanded.flatMap((s) => s.marken.map((m) => ({ liefNr: s.liefNr, norm: normalize(m), marke: m })));
  const aliasPool = expanded.flatMap((s) => s.aliases.map((a) => ({ liefNr: s.liefNr, norm: normalize(a) })));
  return {
    byLiefNr,
    firmPool,
    markePool,
    aliasPool,
    firmNorms: firmPool.map((p) => p.norm),
    markeNorms: markePool.map((p) => p.norm),
    aliasNorms: aliasPool.map((p) => p.norm),
    learnedAliases: new Map(learnedAliases.map((a) => [a.alias.toLowerCase(), a])),
  };
}

export type MatchStatus = "auto" | "review" | "non_zr";

export type MatchResult = {
  matchedLiefNr: string | null;
  matchedKanoname: string | null;
  matchedMarke: string | null;
  matchScore: number;
  matchStatus: MatchStatus;
};

/** Port von matcher.py::match_batch (pro Zeile). Abgleich-Reihenfolge:
 * Firmierung -> Marke -> Aliases. Sobald eine Stufe die Auto-Schwelle erreicht,
 * wird dort gestoppt. Erreicht keine Stufe die Auto-Schwelle, entscheidet der
 * beste Treffer über alle drei Stufen hinweg über Review/Nicht-ZR. */
export function matchRawName(rawName: string, ctx: MatchContext): MatchResult {
  const raw = (rawName ?? "").trim();
  const rawLower = raw.toLowerCase();

  // Stufe 0: gelernte Aliases aus vorherigen Review-Bestätigungen
  const learned = ctx.learnedAliases.get(rawLower);
  if (learned) {
    return {
      matchedLiefNr: learned.liefNr,
      matchedKanoname: learned.kanoname,
      matchedMarke: null,
      matchScore: 100,
      matchStatus: learned.isNonZr ? "non_zr" : "auto",
    };
  }

  const normRaw = normalize(raw);
  let bestOverall: { score: number; liefNr: string; firm: string; marke: string | null } | null = null;

  // Stufe 1: Firmierung
  const r1 = bestScore(normRaw, ctx.firmNorms);
  if (r1) {
    const liefNr = ctx.firmPool[r1.idx].liefNr;
    const firm = ctx.byLiefNr.get(liefNr)?.firmierung ?? "";
    if (r1.score >= THRESHOLD_AUTO) {
      return { matchedLiefNr: liefNr, matchedKanoname: firm, matchedMarke: null, matchScore: round1(r1.score), matchStatus: "auto" };
    }
    bestOverall = { score: r1.score, liefNr, firm, marke: null };
  }

  // Stufe 2: Marke
  const r2 = bestScore(normRaw, ctx.markeNorms);
  if (r2) {
    const { liefNr, marke } = ctx.markePool[r2.idx];
    const firm = ctx.byLiefNr.get(liefNr)?.firmierung ?? "";
    if (r2.score >= THRESHOLD_AUTO) {
      return { matchedLiefNr: liefNr, matchedKanoname: firm, matchedMarke: marke, matchScore: round1(r2.score), matchStatus: "auto" };
    }
    if (!bestOverall || r2.score > bestOverall.score) {
      bestOverall = { score: r2.score, liefNr, firm, marke };
    }
  }

  // Stufe 3: Aliases (aus den Stammdaten gepflegt)
  const r3 = bestScore(normRaw, ctx.aliasNorms);
  if (r3) {
    const liefNr = ctx.aliasPool[r3.idx].liefNr;
    const firm = ctx.byLiefNr.get(liefNr)?.firmierung ?? "";
    if (r3.score >= THRESHOLD_AUTO) {
      return { matchedLiefNr: liefNr, matchedKanoname: firm, matchedMarke: null, matchScore: round1(r3.score), matchStatus: "auto" };
    }
    if (!bestOverall || r3.score > bestOverall.score) {
      bestOverall = { score: r3.score, liefNr, firm, marke: null };
    }
  }

  if (!bestOverall) {
    return { matchedLiefNr: null, matchedKanoname: null, matchedMarke: null, matchScore: 0, matchStatus: "non_zr" };
  }
  const status: MatchStatus = bestOverall.score >= THRESHOLD_REVIEW ? "review" : "non_zr";
  return {
    matchedLiefNr: bestOverall.liefNr,
    matchedKanoname: bestOverall.firm,
    matchedMarke: bestOverall.marke,
    matchScore: round1(bestOverall.score),
    matchStatus: status,
  };
}

export function matchBatch(rawNames: string[], ctx: MatchContext): MatchResult[] {
  return rawNames.map((raw) => matchRawName(raw, ctx));
}

// ── Kandidaten-Vorschläge für manuelle Auswahl, Port von get_top_candidates ─
export type Candidate = {
  liefNr: string;
  firmierung: string;
  marke: string;
  warengruppe: string;
  score: number;
};

export function getTopCandidates(rawName: string, suppliers: ZrSupplier[], n = 6): Candidate[] {
  const expanded = expandActiveSuppliers(suppliers);
  type Entry = { liefNr: string; text: string; marke: string | null; firmierung: string; sortiment: string };
  const candidates: Entry[] = [];
  for (const s of expanded) {
    if (s.firmierung) candidates.push({ liefNr: s.liefNr, text: s.firmierung, marke: null, firmierung: s.firmierung, sortiment: s.sortiment });
    for (const m of s.marken) candidates.push({ liefNr: s.liefNr, text: m, marke: m, firmierung: s.firmierung, sortiment: s.sortiment });
    for (const a of s.aliases) candidates.push({ liefNr: s.liefNr, text: a, marke: null, firmierung: s.firmierung, sortiment: s.sortiment });
  }
  if (candidates.length === 0) return [];

  const normTexts = candidates.map((c) => normalize(c.text));
  const norm = normalize(rawName);

  const r1 = fuzz.extract(norm, normTexts, { ...FUZZ_OPTS, scorer: fuzz.token_set_ratio, limit: n * 3 }) as [string, number, number][];
  const r2 = fuzz.extract(norm, normTexts, { ...FUZZ_OPTS, scorer: fuzz.WRatio, limit: n * 3 }) as [string, number, number][];

  const seen = new Map<string, { score: number; idx: number }>();
  for (const [, score, idx] of [...r1, ...r2]) {
    const liefNr = candidates[idx].liefNr;
    const prev = seen.get(liefNr);
    if (!prev || prev.score < score) seen.set(liefNr, { score: round1(score), idx });
  }
  const top = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, n);
  return top.map((t) => ({
    liefNr: candidates[t.idx].liefNr,
    firmierung: candidates[t.idx].firmierung,
    marke: candidates[t.idx].marke ?? "",
    warengruppe: candidates[t.idx].sortiment,
    score: t.score,
  }));
}
