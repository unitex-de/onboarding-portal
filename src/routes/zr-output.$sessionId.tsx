import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, AlertTriangle, Search as SearchIcon, Upload, Trash2, Loader2, Download } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { getRowsForSession, getCheckCount, type ZrParsedRow } from "@/lib/zr-sessions";
import { computeOutput, computeDebComparison, fmtEur, type OutputData, type DebComparisonRow } from "@/lib/zr-output";
import {
  type DebitorenSnapshot, type DebitorenData,
  listDebitorenSnapshots, uploadDebitorenSnapshot, deleteDebitorenSnapshot, loadDebitorenSnapshot,
} from "@/lib/zr-debitoren";
import { fetchSuppliers, type ZrSupplier } from "@/lib/zr-suppliers";
import { exportSessionToExcel } from "@/lib/zr-export";

export const Route = createFileRoute("/zr-output/$sessionId")({
  head: () => ({ meta: [{ title: "ZR-Ergebnis | unitex Onboarding" }] }),
  component: ZrOutputPage,
});

function pctColor(pct: number): string {
  if (pct >= 60) return "text-emerald-400";
  if (pct >= 30) return "text-amber-400";
  return "text-red-400";
}

function ZrOutputPage() {
  const { sessionId: sessionIdParam } = Route.useParams();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [rows, setRows] = useState<ZrParsedRow[]>([]);
  const [pendingCheck, setPendingCheck] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState("");

  const [snapshots, setSnapshots] = useState<DebitorenSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [debData, setDebData] = useState<DebitorenData | null>(null);
  const [debLoading, setDebLoading] = useState(false);
  const [uploadingDeb, setUploadingDeb] = useState(false);
  const debFileInputRef = useRef<HTMLInputElement>(null);

  const [suppliers, setSuppliers] = useState<ZrSupplier[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchSuppliers().then(setSuppliers).catch((err) => console.error(err)); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSessionToExcel({ sessionId, rows, suppliers, debData });
    } catch (err: any) {
      alert(`Fehler beim Export: ${err.message ?? err}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(sessionId)) return;
    (async () => {
      setLoading(true);
      try {
        const [r, checkCount] = await Promise.all([getRowsForSession(sessionId), getCheckCount(sessionId)]);
        setRows(r);
        setPendingCheck(checkCount);
      } catch (err) {
        console.error("Fehler beim Laden der Auswertung:", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadSnapshots = async () => {
    try {
      const list = await listDebitorenSnapshots();
      setSnapshots(list);
      if (list.length > 0) setSelectedSnapshot((prev) => prev ?? list[0].path);
    } catch (err) {
      console.error("Fehler beim Laden der Debitoren-Snapshots:", err);
    }
  };

  useEffect(() => { loadSnapshots(); }, []);

  useEffect(() => {
    if (!selectedSnapshot) { setDebData(null); return; }
    setDebLoading(true);
    loadDebitorenSnapshot(selectedSnapshot)
      .then(setDebData)
      .catch((err) => { console.error("Fehler beim Laden des Debitoren-Snapshots:", err); setDebData(null); })
      .finally(() => setDebLoading(false));
  }, [selectedSnapshot]);

  const handleUploadDeb = async (file: File) => {
    setUploadingDeb(true);
    try {
      const path = await uploadDebitorenSnapshot(file);
      await loadSnapshots();
      setSelectedSnapshot(path);
    } catch (err: any) {
      alert(`Fehler beim Hochladen: ${err.message ?? err}`);
    } finally {
      setUploadingDeb(false);
      if (debFileInputRef.current) debFileInputRef.current.value = "";
    }
  };

  const handleDeleteSnapshot = async (path: string) => {
    if (!confirm("Diesen Debitoren-Snapshot wirklich löschen?")) return;
    try {
      await deleteDebitorenSnapshot(path);
      if (selectedSnapshot === path) setSelectedSnapshot(null);
      await loadSnapshots();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message ?? err}`);
    }
  };

  const data: OutputData = useMemo(() => computeOutput(rows), [rows]);
  const pendingReview = rows.filter((r) => r.matchStatus === "review").length;

  const debComparison: DebComparisonRow[] = useMemo(
    () => (debData ? computeDebComparison(rows, data, debData) : []),
    [rows, data, debData]
  );

  const visibleBrands = useMemo(() => {
    const q = brandFilter.trim().toLowerCase();
    return q ? data.zrBrands.filter((b) => b.toLowerCase().includes(q)) : data.zrBrands;
  }, [data.zrBrands, brandFilter]);

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
          📊 ZR-Ergebnis
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">ZR-Abdeckung – Ergebnis</h1>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-secondary">
            {data.haendlerList.length} Händler · {data.zrBrands.length} ZR-Marken erkannt
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Als Excel exportieren
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Lädt…</p>
        ) : (
          <>
            {pendingReview > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                Noch <b className="mx-1">{pendingReview}</b> unsichere Position(en) offen —{" "}
                <Link to="/zr-review/$sessionId" params={{ sessionId: String(sessionId) }} className="text-primary hover:underline ml-1">
                  jetzt klären →
                </Link>
              </div>
            )}
            {pendingCheck > 0 && (
              <div className="mb-6 flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
                🔍 <b className="mx-1">{pendingCheck}</b> automatisch eingeteilte Position(en) warten auf eine Stichproben-Prüfung —{" "}
                <Link to="/zr-check/$sessionId" params={{ sessionId: String(sessionId) }} className="text-primary hover:underline ml-1">
                  jetzt prüfen →
                </Link>
              </div>
            )}

            <h2 className="font-display text-lg font-semibold mb-3">Abdeckungsquote je Händler</h2>
            <div className="rounded-xl border border-border overflow-hidden mb-10">
              <table className="w-full text-sm">
                <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Händler</th>
                    <th className="text-right px-4 py-3">Gesamt</th>
                    <th className="text-right px-4 py-3">ZR-Marken</th>
                    <th className="text-right px-4 py-3">Nicht-ZR</th>
                    <th className="text-right px-4 py-3">Noch offen</th>
                    <th className="text-left px-4 py-3">ZR-Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.map((s) => (
                    <tr key={s.haendler} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{s.haendler}</td>
                      <td className="px-4 py-3 text-right">{s.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">{s.zr}</td>
                      <td className="px-4 py-3 text-right text-secondary">{s.nonZr}</td>
                      <td className="px-4 py-3 text-right text-amber-400">{s.review}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-popover overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.pct}%` }} />
                          </div>
                          <span className={`font-semibold text-xs ${pctColor(s.pct)}`}>{s.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.hasRevenueData && (
              <>
                <h2 className="font-display text-lg font-semibold mb-1">Marken-Umsatz-Analyse</h2>
                <p className="text-sm text-secondary mb-4">
                  Basiert auf den Werten aus den Kreditorenlisten (EK/VK je nach Format). Zeigt, welche Marken und
                  Händler den größten Anteil an eurem ZR-Volumen ausmachen.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border font-semibold text-sm">Top-Marken nach Umsatz</div>
                    <table className="w-full text-sm">
                      <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
                        <tr><th className="text-left px-4 py-2">Marke</th><th className="text-right px-4 py-2">Umsatz</th><th className="text-right px-4 py-2">Bei # Händlern</th></tr>
                      </thead>
                      <tbody>
                        {data.topBrands.map((b) => (
                          <tr key={b.brand} className="border-t border-border">
                            <td className="px-4 py-2 font-medium">{b.brand}</td>
                            <td className="px-4 py-2 text-right">{fmtEur(b.total)}</td>
                            <td className="px-4 py-2 text-right text-secondary">{b.haendlerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border font-semibold text-sm">Top-Händler nach ZR-Umsatz</div>
                    <table className="w-full text-sm">
                      <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
                        <tr><th className="text-left px-4 py-2">Händler</th><th className="text-right px-4 py-2">Umsatz</th><th className="text-right px-4 py-2"># Marken</th></tr>
                      </thead>
                      <tbody>
                        {data.haendlerTotals.map((h) => (
                          <tr key={h.haendler} className="border-t border-border">
                            <td className="px-4 py-2 font-medium">{h.haendler}</td>
                            <td className="px-4 py-2 text-right">{fmtEur(h.total)}</td>
                            <td className="px-4 py-2 text-right text-secondary">{h.brandCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mb-10 rounded-md border border-border bg-card px-4 py-3 text-xs text-secondary">
                  ℹ️ Diese Zahlen zeigen den Umsatz je Marke/Händler laut Kreditorenliste. Ob eine Position auch
                  tatsächlich über die ZR abgerechnet wurde, lässt sich daraus allein nicht ableiten.
                </div>
              </>
            )}

            <h2 className="font-display text-lg font-semibold mb-1">ZR-Ist-Umsatz-Abgleich</h2>
            <p className="text-sm text-secondary mb-3 max-w-3xl">
              Vergleicht den Wert aus der Kreditorenliste (was der Händler selbst gebucht hat) mit dem tatsächlich
              über die ZR abgerechneten Umsatz laut Debitorenliste
              {debData?.periodLabel && ` (Stand: ${debData.periodLabel.replace("Umsatz brutto bis ", "")})`}.
            </p>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {snapshots.length > 1 && (
                <select
                  value={selectedSnapshot ?? ""}
                  onChange={(e) => setSelectedSnapshot(e.target.value)}
                  className="rounded-md border border-border bg-popover px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {snapshots.map((s, i) => (
                    <option key={s.path} value={s.path}>
                      {s.path}{i === 0 ? " (aktuell)" : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedSnapshot && (
                <button
                  type="button"
                  onClick={() => handleDeleteSnapshot(selectedSnapshot)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-secondary hover:text-destructive hover:bg-popover"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Snapshot löschen
                </button>
              )}
              <input
                ref={debFileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDeb(f); }}
              />
              <button
                type="button"
                onClick={() => debFileInputRef.current?.click()}
                disabled={uploadingDeb}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-popover disabled:opacity-50"
              >
                {uploadingDeb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Neuen Debitoren-Snapshot hochladen
              </button>
            </div>

            {!selectedSnapshot ? (
              <div className="mb-10 rounded-md border border-border bg-card px-4 py-3 text-sm text-secondary">
                Noch kein Debitoren-Snapshot hochgeladen — der Ist-Umsatz-Abgleich ist optional.
              </div>
            ) : debLoading ? (
              <p className="text-sm text-secondary mb-10">Lädt…</p>
            ) : (
              <>
                <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>
                    <b>Wichtig für die Interpretation:</b> Je nach Format der Kreditorenliste ist der Wert dort ein
                    EK- oder VK-Wert (Spalte „Basis"). VK-Werte liegen wegen der Handelsspanne systematisch über
                    einem EK-basierten ZR-Umsatz — eine große Differenz kann also auch nur diesen
                    Preis-Basis-Unterschied widerspiegeln. Am aussagekräftigsten sind Zeilen mit Basis „EK".
                  </span>
                </div>
                {debComparison.length === 0 ? (
                  <div className="mb-10 rounded-md border border-border bg-card px-4 py-3 text-sm text-secondary">
                    Für diesen Batch konnten keine Händler mit der Debitorenliste verknüpft werden (fehlende
                    Kundennummer im Dateinamen).
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden mb-10">
                    <table className="w-full text-sm">
                      <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-4 py-3">Händler</th>
                          <th className="text-left px-4 py-3">Marke</th>
                          <th className="text-right px-4 py-3">Laut Kreditorenliste</th>
                          <th className="text-left px-4 py-3">Basis</th>
                          <th className="text-right px-4 py-3">Laut ZR-Debitorenliste</th>
                          <th className="text-right px-4 py-3">Differenz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debComparison.slice(0, 50).map((c, i) => (
                          <tr key={`${c.haendler}-${c.brand}-${i}`} className="border-t border-border">
                            <td className="px-4 py-2.5 font-medium">{c.haendler}</td>
                            <td className="px-4 py-2.5">{c.brand}</td>
                            <td className="px-4 py-2.5 text-right">{fmtEur(c.kreditWert)}</td>
                            <td className="px-4 py-2.5 text-xs text-muted">{c.wertTyp ?? "–"}</td>
                            <td className="px-4 py-2.5 text-right">{fmtEur(c.zrWert)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {c.delta === null ? (
                                <span className="text-muted text-xs">nur eine Quelle</span>
                              ) : (
                                <span className={c.delta > 1000 ? "text-red-400 font-semibold" : c.delta < -1000 ? "text-emerald-400 font-semibold" : "text-secondary"}>
                                  {fmtEur(c.delta)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Marken-Matrix (Händler × ZR-Marke)</h2>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  placeholder="Marke filtern…"
                  className="rounded-md border border-border bg-popover pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-[#000844] text-white text-left px-3 py-2 min-w-[160px]">Händler</th>
                      {visibleBrands.map((brand) => (
                        <th key={brand} className="bg-[#000844] text-white px-1 py-2 align-bottom" style={{ minWidth: 32 }}>
                          <div className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap h-32 flex items-end justify-center pb-1">
                            {brand}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.haendlerList.map((h) => (
                      <tr key={h} className="border-t border-border">
                        <td className="sticky left-0 bg-card font-semibold whitespace-nowrap px-3 py-2">{h}</td>
                        {visibleBrands.map((brand) => {
                          const val = data.matrix[h]?.[brand];
                          return (
                            <td key={brand} className="text-center px-1 py-2">
                              {val === undefined ? (
                                <span className="text-muted">·</span>
                              ) : val === true ? (
                                <span className="text-emerald-400 font-semibold">✓</span>
                              ) : (
                                <span>{Math.round(val).toLocaleString("de-DE")}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 text-xs text-muted border-t border-border">
                ✓ = vorhanden &nbsp;|&nbsp; Zahlen = Wert in € &nbsp;|&nbsp; · = nicht vertreten
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}