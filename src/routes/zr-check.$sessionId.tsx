import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { type ZrSupplier, fetchSuppliers } from "@/lib/zr-suppliers";
import { saveLearnedAlias } from "@/lib/zr-aliases";
import { type Candidate, getTopCandidates } from "@/lib/zr-matcher";
import {
  type ZrParsedRow, getCheckRows, updateRowMapping, markChecked,
} from "@/lib/zr-sessions";

export const Route = createFileRoute("/zr-check/$sessionId")({
  head: () => ({ meta: [{ title: "ZR-Stichprobe | unitex Onboarding" }] }),
  component: ZrCheckPage,
});

function ZrCheckPage() {
  const { sessionId: sessionIdParam } = Route.useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [suppliers, setSuppliers] = useState<ZrSupplier[]>([]);
  const [checkRows, setCheckRows] = useState<ZrParsedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sup, rows] = await Promise.all([fetchSuppliers(), getCheckRows(sessionId)]);
      setSuppliers(sup);
      setCheckRows(rows);
    } catch (err) {
      console.error("Fehler beim Laden der Stichprobe:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(sessionId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const removeRow = (id: number) => setCheckRows((prev) => prev.filter((r) => r.id !== id));

  const handleMarkOk = async (row: ZrParsedRow) => {
    try {
      await markChecked(row.id);
      removeRow(row.id);
    } catch (err: any) {
      alert(`Fehler: ${err.message ?? err}`);
    }
  };

  // Bewusst OHNE die "gleiche Rohname -> alle Zeilen"-Kaskade aus dem Review:
  // im Original schickt check.html keine session_id mit, wirkt sich hier also
  // nur auf die einzelne Zeile aus.
  const handleConfirm = async (row: ZrParsedRow, candidate: Candidate) => {
    try {
      await updateRowMapping({
        rowId: row.id, liefNr: candidate.liefNr, kanoname: candidate.firmierung,
        status: "confirmed", marke: candidate.marke || null,
      });
      await saveLearnedAlias({
        alias: row.rawName, liefNr: candidate.liefNr, kanoname: candidate.firmierung, isNonZr: false,
      });
      removeRow(row.id);
    } catch (err: any) {
      alert(`Fehler: ${err.message ?? err}`);
    }
  };

  const handleNonZr = async (row: ZrParsedRow) => {
    try {
      await updateRowMapping({ rowId: row.id, liefNr: null, kanoname: null, status: "non_zr" });
      await saveLearnedAlias({ alias: row.rawName, liefNr: null, kanoname: null, isNonZr: true });
      removeRow(row.id);
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
          <Link
            to="/zr-review/$sessionId"
            params={{ sessionId: String(sessionId) }}
            className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück zum Review
          </Link>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          🎲 Stichprobe
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-10 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Stichproben-Prüfung</h1>
        <p className="text-sm text-secondary mb-2 max-w-3xl">
          Eine begrenzte Stichprobe der unsichersten automatischen Fälle (max. 40) — bewusst kein Vollreview.
          Nach dem Abarbeiten einfach die Seite neu laden für die nächste Stichprobe.
        </p>
        <p className="text-sm text-muted mb-8 max-w-3xl">
          💡 Zwei Arten von Fällen: automatisch als <b>ZR-Marke</b> erkannt (aber knapper Treffer), oder automatisch
          als <b>keine ZR-Marke</b> eingestuft (aber mit Restähnlichkeit zu einer Marke). Passt die Einteilung,
          einfach „Passt so" klicken.
        </p>

        {loading ? (
          <p className="text-sm text-secondary">Lädt…</p>
        ) : checkRows.length === 0 ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Aktuell nichts zu prüfen. Alle automatischen Einteilungen liegen klar über oder unter der Unsicherheitsgrenze.
          </div>
        ) : (
          <div className="space-y-4">
            {checkRows.map((row) => (
              <CheckCard
                key={row.id}
                row={row}
                suppliers={suppliers}
                onMarkOk={handleMarkOk}
                onConfirm={handleConfirm}
                onNonZr={handleNonZr}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CheckCard({
  row, suppliers, onMarkOk, onConfirm, onNonZr,
}: {
  row: ZrParsedRow;
  suppliers: ZrSupplier[];
  onMarkOk: (row: ZrParsedRow) => Promise<void>;
  onConfirm: (row: ZrParsedRow, candidate: Candidate) => Promise<void>;
  onNonZr: (row: ZrParsedRow) => Promise<void>;
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

  const isAuto = row.matchStatus === "auto";

  return (
    <div className="rounded-xl border border-border bg-card p-5 grid md:grid-cols-[1fr_1.6fr_auto] gap-5 items-start">
      <div>
        <div className="font-medium">{row.rawName}</div>
        <div className="text-xs text-secondary mt-0.5">von: {row.haendler}</div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={[
            "rounded-full px-2 py-0.5 text-xs font-medium",
            isAuto ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary/20 text-secondary",
          ].join(" ")}>
            {isAuto ? "Automatisch: ZR-Marke" : "Automatisch: keine ZR-Marke"}
          </span>
          <span className="rounded-full bg-popover px-2 py-0.5 text-xs font-medium">{row.matchScore ?? 0}%</span>
        </div>
        {row.matchedKanoname && (
          <div className="mt-1.5 text-xs text-muted">
            {isAuto ? "Zugeordnet zu:" : "Ähnlichste Firmierung:"}{" "}
            <span className="font-medium text-secondary">{row.matchedKanoname}</span>
            {row.matchedMarke && <span> (über Marke „{row.matchedMarke}“)</span>}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs text-muted mb-1.5">Falls falsch, richtige Firmierung wählen:</div>
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
          disabled={busy}
          onClick={async () => { setBusy(true); await onMarkOk(row); setBusy(false); }}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✓"} Passt so
        </button>
        <button
          type="button"
          disabled={!selected || busy}
          onClick={async () => { if (!selected) return; setBusy(true); await onConfirm(row, selected); setBusy(false); }}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Andere Firmierung
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await onNonZr(row); setBusy(false); }}
          className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
        >
          Keine ZR-Marke
        </button>
      </div>
    </div>
  );
}
