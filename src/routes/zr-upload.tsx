import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { fetchSuppliers } from "@/lib/zr-suppliers";
import { fetchLearnedAliases } from "@/lib/zr-aliases";
import { buildMatchContext, matchRawName } from "@/lib/zr-matcher";
import { parseCreditorFile, haendlerFromFilename, kundenNrFromFilename } from "@/lib/zr-parser";
import {
  type ZrSession, type NewParsedRow, createSession, insertParsedRows, getSessions,
} from "@/lib/zr-sessions";

export const Route = createFileRoute("/zr-upload")({
  head: () => ({ meta: [{ title: "ZR-Upload | unitex Onboarding" }] }),
  component: ZrUploadPage,
});

type Summary = {
  sessionId: number;
  total: number;
  auto: number;
  review: number;
  nonZr: number;
  fileErrors: string[];
};

function ZrUploadPage() {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [sessions, setSessions] = useState<ZrSession[]>([]);
  const [batchName, setBatchName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSessions = async () => {
    try {
      setSessions(await getSessions());
    } catch (err) {
      console.error("Fehler beim Laden der Sessions:", err);
    }
  };

  useEffect(() => { loadSessions(); }, []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const xlsxFiles = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".xlsx"));
    setFiles((prev) => [...prev, ...xlsxFiles]);
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setSummary(null);

    try {
      const suppliers = await fetchSuppliers();
      if (suppliers.length === 0) {
        setError('Es sind noch keine Lieferanten-Stammdaten hinterlegt. Bitte zuerst unter "ZR-Lieferanten" die Basis einrichten.');
        setProcessing(false);
        return;
      }
      const learnedAliases = await fetchLearnedAliases();
      const ctx = buildMatchContext(suppliers, learnedAliases);

      const sessionId = await createSession(batchName.trim() || "Batch");

      const allRows: NewParsedRow[] = [];
      const fileErrors: string[] = [];

      for (const file of files) {
        const haendler = haendlerFromFilename(file.name);
        const kundenNrList = kundenNrFromFilename(file.name);
        const kundenNr = kundenNrList.length > 0 ? kundenNrList.join(",") : null;
        try {
          const buffer = await file.arrayBuffer();
          // "unitex" ist die ZR selbst, keine Marke — solche Positionen fließen
          // nicht in die Auswertung ein (siehe app.py::upload)
          const parsed = parseCreditorFile(buffer, haendler).filter(
            (r) => !r.rawName.toLowerCase().includes("unitex")
          );
          for (const row of parsed) {
            const match = matchRawName(row.rawName, ctx);
            allRows.push({
              sessionId,
              haendler: row.haendler,
              kundenNr,
              rawName: row.rawName,
              matchedLiefNr: match.matchedLiefNr,
              matchedKanoname: match.matchedKanoname,
              matchedMarke: match.matchedMarke,
              matchScore: match.matchScore,
              matchStatus: match.matchStatus,
              wert: row.wert,
              wertTyp: row.wertTyp,
            });
          }
        } catch (err: any) {
          fileErrors.push(`${file.name}: ${err.message ?? err}`);
        }
      }

      if (allRows.length > 0) await insertParsedRows(allRows);

      setSummary({
        sessionId,
        total: allRows.length,
        auto: allRows.filter((r) => r.matchStatus === "auto").length,
        review: allRows.filter((r) => r.matchStatus === "review").length,
        nonZr: allRows.filter((r) => r.matchStatus === "non_zr").length,
        fileErrors,
      });
      setFiles([]);
      setBatchName("");
      await loadSessions();
    } catch (err: any) {
      setError(`Fehler beim Verarbeiten: ${err.message ?? err}`);
    } finally {
      setProcessing(false);
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
          <Link to="/zr-abgleich" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück zum ZR-Abgleich
          </Link>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          📤 ZR-Upload
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-10 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">Neuer Batch hochladen</h1>
        <p className="text-sm text-secondary mb-8">
          Alle Händler-Kreditorenlisten auf einmal hochladen — das Format wird automatisch erkannt.
        </p>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {summary && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="font-display text-lg font-semibold">Batch verarbeitet</h2>
            </div>
            <p className="text-sm text-secondary mb-4">
              {summary.total} Positionen erkannt · {summary.auto} automatisch zugeordnet ·{" "}
              {summary.review} zur Prüfung · {summary.nonZr} als Nicht-ZR eingestuft.
            </p>
            {summary.fileErrors.length > 0 && (
              <div className="mb-4 text-sm text-destructive">
                {summary.fileErrors.map((e) => <div key={e}>⚠️ {e}</div>)}
              </div>
            )}
            <Link
              to="/zr-review/$sessionId"
              params={{ sessionId: String(summary.sessionId) }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Zur Prüfung ({summary.review} offen) →
            </Link>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 mb-10">
          <div className="mb-5">
            <label className="text-xs font-medium text-secondary uppercase tracking-wide">Batch-Name</label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="z.B. Januar 2026"
              className="mt-1.5 w-full max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            className={[
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            ].join(" ")}
          >
            <Upload className="h-8 w-8 text-muted" />
            <p className="text-sm">
              Dateien hier ablegen oder <span className="text-primary font-medium">klicken zum Auswählen</span>
            </p>
            <p className="text-xs text-muted">Alle Händler-Dateien auf einmal — beliebig viele (.xlsx)</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-secondary">{files.length} Datei(en):</p>
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-md bg-popover px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 truncate">
                    <FileSpreadsheet className="h-4 w-4 text-secondary shrink-0" /> {f.name}
                  </span>
                  <button type="button" onClick={() => removeFile(f.name)} className="p-1 rounded hover:bg-card text-secondary hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={files.length === 0 || processing}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {processing ? "Wird verarbeitet…" : "Verarbeiten & Matching starten"}
          </button>
        </div>

        <h2 className="font-display text-lg font-semibold mb-3">Bisherige Batches</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-secondary">Noch keine Batches hochgeladen.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Erstellt am</th>
                  <th className="text-right px-4 py-3">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3">{s.name || `Batch #${s.id}`}</td>
                    <td className="px-4 py-3 text-secondary">
                      {new Date(s.createdAt).toLocaleString("de-DE")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/zr-review/$sessionId"
                        params={{ sessionId: String(s.id) }}
                        className="text-primary hover:underline"
                      >
                        Review öffnen →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}