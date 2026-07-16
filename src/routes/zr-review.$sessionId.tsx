import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { type ZrSupplier, fetchSuppliers } from "@/lib/zr-suppliers";
import { saveLearnedAlias } from "@/lib/zr-aliases";
import { type Candidate, getTopCandidates } from "@/lib/zr-matcher";
import {
  type ZrSession, type ZrParsedRow, getSession, getRowsForSession,
  updateRowMapping, resolveMatchingReviewRows,
} from "@/lib/zr-sessions";

export const Route = createFileRoute("/zr-review/$sessionId")({
  head: () => ({ meta: [{ title: "ZR-Review | unitex Onboarding" }] }),
  component: ZrReviewPage,
});

type Counts = { zugeordnet: number; review: number; nonZr: number };

function ZrReviewPage() {
  const { sessionId: sessionIdParam } = Route.useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [session, setSession] = useState<ZrSession | null>(null);
  const [suppliers, setSuppliers] = useState<ZrSupplier[]>([]);
  const [reviewRows, setReviewRows] = useState<ZrParsedRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ zugeordnet: 0, review: 0, nonZr: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sess, sup, allRows] = await Promise.all([
        getSession(sessionId),
        fetchSuppliers(),
        getRowsForSession(sessionId),
      ]);
      setSession(sess);
      setSuppliers(sup);
      const review = allRows.filter((r) => r.matchStatus === "review");
      setReviewRows(review);
      setCounts({
        zugeordnet: allRows.filter((r) => r.matchStatus === "auto" || r.matchStatus === "confirmed").length,
        review: review.length,
        nonZr: allRows.filter((r) => r.matchStatus === "non_zr").length,
      });
    } catch (err) {
      console.error("Fehler beim Laden der Review-Daten:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(sessionId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleConfirm = async (row: ZrParsedRow, candidate: Candidate) => {
    try {
      await updateRowMapping({
        rowId: row.id, liefNr: candidate.liefNr, kanoname: candidate.firmierung,
        status: "confirmed", marke: candidate.marke || null,
      });
      await saveLearnedAlias({
        alias: row.rawName, liefNr: candidate.liefNr, kanoname: candidate.firmierung, isNonZr: false,
      });
      const affected = await resolveMatchingReviewRows({
        sessionId, rawName: row.rawName, liefNr: candidate.liefNr,
        kanoname: candidate.firmierung, status: "confirmed", marke: candidate.marke || null,
      });
      const ids = [...new Set([row.id, ...affected])];
      setReviewRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      setCounts((prev) => ({ ...prev, review: Math.max(0, prev.review - ids.length), zugeordnet: prev.zugeordnet + ids.length }));
    } catch (err: any) {
      alert(`Fehler beim Bestätigen: ${err.message ?? err}`);
    }
  };

  const handleNonZr = async (row: ZrParsedRow) => {
    try {
      await updateRowMapping({ rowId: row.id, liefNr: null, kanoname: null, status: "non_zr" });
      await saveLearnedAlias({ alias: row.rawName, liefNr: null, kanoname: null, isNonZr: true });
      const affected = await resolveMatchingReviewRows({
        sessionId, rawName: row.rawName, liefNr: null, kanoname: null, status: "non_zr",
      });
      const ids = [...new Set([row.id, ...affected])];
      setReviewRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      setCounts((prev) => ({ ...prev, review: Math.max(0, prev.review - ids.length), nonZr: prev.nonZr + ids.length }));
    } catch (err: any) {
      alert(`Fehler: ${err.message ?? err}`);
    }
  };

  // "Später": entfernt die Karte nur aus der aktuellen Ansicht (Status bleibt
  // 'review') — exakt wie im Original, das hier ebenfalls keinen Zähler
  // anpasst. Bei einem Neuladen der Seite taucht die Zeile wieder auf.
  const handleSkip = async (row: ZrParsedRow) => {
    try {
      await updateRowMapping({ rowId: row.id, liefNr: null, kanoname: null, status: "review" });
      setReviewRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err: any) {
      alert(`Fehler: ${err.message ?? err}`);
    }
  };

  if (state.loading || !state.signedIn || state.role !== "admin") {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-row items-end gap-3">
            <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
              <UnitexLogo className="h-4 w-[60px] text-slate-900" />
            </div>
          </div>
          <Link to="/zr-upload" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück zum Upload
          </Link>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          🔍 ZR-Review
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-10 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Unsichere Zuordnungen klären</h1>
        <p className="text-sm text-secondary mb-1">
          {session?.name ?? `Batch #${sessionId}`} — Bei diesen Positionen war sich das Tool nicht sicher, welche
          ZR-Marke gemeint ist. Einmal bestätigt, wird die Schreibweise gespeichert und nächstes Mal automatisch erkannt.
        </p>
        <Link
          to="/zr-check/$sessionId"
          params={{ sessionId: String(sessionId) }}
          className="text-sm text-primary hover:underline"
        >
          Stichprobe prüfen →
        </Link>
        <span className="text-secondary mx-2">·</span>
        <Link
          to="/zr-output/$sessionId"
          params={{ sessionId: String(sessionId) }}
          className="text-sm text-primary hover:underline"
        >
          Zum Ergebnis →
        </Link>

        <div className="grid grid-cols-3 gap-4 mb-8 mt-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-semibold text-emerald-400">{counts.zugeordnet}</div>
            <div className="text-xs text-secondary mt-1">ZR-Marke zugeordnet</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-semibold text-amber-400">{counts.review}</div>
            <div className="text-xs text-secondary mt-1">Noch zu klären</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-semibold text-secondary">{counts.nonZr}</div>
            <div className="text-xs text-secondary mt-1">Keine ZR-Marke</div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Lädt…</p>
        ) : reviewRows.length === 0 ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Nichts mehr zu klären — alle Positionen sind zugeordnet.
          </div>
        ) : (
          <div className="space-y-4">
            {reviewRows.map((row) => (
              <ReviewCard
                key={row.id}
                row={row}
                suppliers={suppliers}
                onConfirm={handleConfirm}
                onNonZr={handleNonZr}
                onSkip={handleSkip}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewCard({
  row, suppliers, onConfirm, onNonZr, onSkip,
}: {
  row: ZrParsedRow;
  suppliers: ZrSupplier[];
  onConfirm: (row: ZrParsedRow, candidate: Candidate) => Promise<void>;
  onNonZr: (row: ZrParsedRow) => Promise<void>;
  onSkip: (row: ZrParsedRow) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => getTopCandidates(row.rawName, suppliers, 6), [row.rawName, suppliers]);
  const searchResults = useMemo(
    () => (searchQuery.trim().length >= 2 ? getTopCandidates(searchQuery, suppliers, 8) : []),
    [searchQuery, suppliers]
  );

  const isSelected = (c: Candidate) => selected?.liefNr === c.liefNr && selected?.marke === c.marke;

  const candidateButton = (c: Candidate, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setSelected(c)}
      title={(c.marke ? `gefunden über Marke: ${c.marke} | ` : "") + c.warengruppe}
      className={[
        "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
        isSelected(c) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
      ].join(" ")}
    >
      {c.firmierung}
      {c.marke && <span className="text-muted"> ({c.marke})</span>}
      <span className="ml-1.5 text-muted">{c.score}%</span>
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 grid md:grid-cols-[1fr_1.6fr_auto] gap-5 items-start">
      <div>
        <div className="font-medium">{row.rawName}</div>
        <div className="text-xs text-secondary mt-0.5">von: {row.haendler}</div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-popover px-2 py-0.5 text-xs font-medium">{row.matchScore ?? 0}%</span>
          {row.wert != null && (
            <span className="text-xs text-secondary">
              {Math.round(row.wert).toLocaleString("de-DE")} € ({row.wertTyp})
            </span>
          )}
        </div>
        {row.matchedKanoname && (
          <div className="mt-1.5 text-xs text-muted">
            Vorschlag: <span className="font-medium text-secondary">{row.matchedKanoname}</span>
            {row.matchedMarke && <span> (über Marke „{row.matchedMarke}“)</span>}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">Zuordnen zu (Firmierung):</div>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((c) => candidateButton(c, `${c.liefNr}-${c.marke}`))}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-secondary hover:text-foreground"
          >
            + Suchen…
          </button>
        </div>
        {searchOpen && (
          <div className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Marken- oder Firmenname…"
              autoFocus
              className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {searchResults.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {searchResults.map((c) => candidateButton(c, `s-${c.liefNr}-${c.marke}`))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <button
          type="button"
          disabled={!selected || busy}
          onClick={async () => { if (!selected) return; setBusy(true); await onConfirm(row, selected); setBusy(false); }}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✓"} Bestätigen
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await onNonZr(row); setBusy(false); }}
          className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
        >
          Keine ZR-Marke
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await onSkip(row); setBusy(false); }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-secondary hover:bg-popover disabled:opacity-40"
        >
          Später
        </button>
      </div>
    </div>
  );
}