import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Check, Lock, Loader2,
  Shield, Info, Download, CloudUpload,
  FileCheck2, Send, AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, getProgressBreakdown } from "@/lib/onboarding-state";
import { generateNeukundenPdf, generateLieferantPdf, downloadPdf, isIOS } from "@/lib/pdf-generator";
import { ConfettiPopup } from "@/components/ui/ConfettiPopup";

export const Route = createFileRoute("/signaturen")({
  head: () => ({ meta: [{ title: "Onboarding abschließen | unitex Onboarding" }] }),
  component: SignaturenPage,
});

function SignaturenPage() {
  const { state } = useOnboarding();
  const { total } = getProgressBreakdown(state);
  const isAdmin = state.role === "admin";
  const unlocked = total >= 75;

  return <KundeAbschlussPage unlocked={isAdmin || unlocked} readOnly={isAdmin} />;
}

// ─── Kunden-Flow: Schritt 3 – Onboarding abschließen ─────────────────────────

function KundeAbschlussPage({ unlocked, readOnly = false }: { unlocked: boolean; readOnly?: boolean }) {
  const { state, uploadDoc, completeSection } = useOnboarding();
  const signed = !!state.completedSections["abschluss"];
  const isLieferant = state.memberType === "lieferant";

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [uploadedForm, setUploadedForm] = useState<{ name: string; size: number } | null>(
    state.uploadedDocs["neukundenformular_signed"]
      ? { name: state.uploadedDocs["neukundenformular_signed"].fileName, size: state.uploadedDocs["neukundenformular_signed"].size }
      : null,
  );
  const [submitted, setSubmitted] = useState(signed);
  const [showEtappe3Confetti, setShowEtappe3Confetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const bytes = isLieferant
        ? await generateLieferantPdf(state)
        : await generateNeukundenPdf(state);
      const filename = isLieferant
        ? "unitex-zusatzblatt-lieferant.pdf"
        : "unitex-neukundenformular.pdf";
      downloadPdf(bytes, filename);
    } catch (err) {
      setGenerateError("Das PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Die Datei überschreitet die maximale Größe von 20 MB.");
      return;
    }
    setUploadedForm({ name: file.name, size: file.size });
    uploadDoc("neukundenformular_signed", { name: file.name, size: file.size });
  };

  const handleSubmit = () => {
    if (!uploadedForm) return;
    completeSection("abschluss");
    setSubmitted(true);
    setShowEtappe3Confetti(true);
  };

  const formLabel = isLieferant ? "Lieferantenstammblatt" : "Neukundenformular";

  return (
    <AppShell
      title="Onboarding abschließen"
      subtitle={isLieferant
        ? "Letzter Schritt: Zusatzblatt Lieferanten unterschreiben und einreichen."
        : "Letzter Schritt: Neukundenformular unterschreiben und einreichen."}
    >
      {/* Admin banner */}
      {readOnly && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-4">
          <Shield className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-display font-semibold text-amber-300">Admin-Modus: Einreichung nicht möglich</p>
            <p className="text-sm text-amber-400/80 mt-1">
              Als Admin-Mitarbeiter können Sie diesen Bereich einsehen, aber <strong>nicht selbst hochladen oder einreichen</strong>.
              Die Einreichung muss durch den Kunden über seinen persönlichen Magic Link erfolgen.
            </p>
          </div>
        </div>
      )}

      {!readOnly && showEtappe3Confetti && (
        <ConfettiPopup
          title="Herzlichen Glückwunsch!"
          message="Ihr Onboarding ist abgeschlossen! Wir prüfen nun Ihre Unterlagen und melden uns in Kürze bei Ihnen."
          buttonLabel="Schließen"
          intense
          onClose={() => setShowEtappe3Confetti(false)}
        />
      )}

      {/* Gate */}
      {!unlocked && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5 flex items-start gap-4">
          <Lock className="h-6 w-6 text-muted mt-0.5" />
          <div className="flex-1">
            <p className="font-display font-semibold">Noch nicht freigeschaltet</p>
            <p className="text-sm text-secondary mt-1">
              Bitte vervollständigen Sie zuerst Ihre Unternehmensdaten und laden Sie alle Pflichtdokumente hoch.
            </p>
          </div>
          <Link
            to="/unternehmen"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary shrink-0"
          >
            Zu den Unternehmensdaten
          </Link>
        </div>
      )}

      <div className={["space-y-6", !unlocked ? "opacity-40 pointer-events-none select-none" : ""].join(" ")}>

        {/* ── Thank-you state ─────────────────────────────────────────────── */}
        {submitted && (
          <div className="rounded-2xl border border-success/40 bg-success/5 p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 border border-success/30 mx-auto">
              <Check className="h-8 w-8 text-success" strokeWidth={2.5} />
            </div>
            <h2 className="font-display text-xl font-semibold">
              {readOnly ? "Unterlagen eingereicht" : "Vielen Dank!"}
            </h2>
            <p className="text-sm text-secondary max-w-md mx-auto leading-relaxed">
              {readOnly
                ? "Der Kunde hat alle Unterlagen eingereicht. Die Prüfung läuft."
                : "Wir haben alle Unterlagen erhalten und kümmern uns nun darum. Sie erhalten eine Nachricht von uns, sobald Ihr Onboarding abgeschlossen ist."}
            </p>
          </div>
        )}

        {!submitted && (
          <>
            {/* ── Step 1: Download ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-display font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">{formLabel} herunterladen</h3>
                  <p className="text-sm text-secondary mt-1">
                    Das Portal hat Ihr {formLabel} automatisch mit Ihren Daten ausgefüllt.
                    Laden Sie es herunter und drucken Sie es aus.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={generating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 sm:py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px]"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> PDF wird erstellt…</>
                ) : (
                  <><Download className="h-4 w-4" /> {formLabel} herunterladen (PDF)</>
                )}
              </button>
              {isIOS() && !generating && !generateError && (
                <p className="text-xs text-secondary mt-2 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  Das PDF öffnet sich in einem neuen Tab. Tippen Sie auf „Teilen" → „In Dateien sichern", um es zu speichern.
                </p>
              )}
              {generateError && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{generateError}
                </p>
              )}
            </div>

            {/* ── Step 2: Sign & stamp ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-display font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">Formular unterschreiben & stempeln</h3>
                  <p className="text-sm text-secondary mt-1 leading-relaxed">
                    Bitte unterschreiben Sie das Formular handschriftlich und versehen Sie es mit Ihrem{" "}
                    <strong className="text-foreground bg-amber-500/15 px-1 rounded">Firmenstempel</strong>.
                    Anschließend scannen oder fotografieren Sie das unterschriebene Formular.
                  </p>
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Wichtig:</strong> Das Formular muss sowohl <strong>unterschrieben</strong> als auch mit dem <strong>Firmenstempel</strong> versehen sein.
                      Formulare ohne Firmenstempel können leider nicht bearbeitet werden.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Step 3: Upload ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-display font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-semibold">Unterschriebenes Formular hochladen</h3>
                  <p className="text-sm text-secondary mt-1">
                    Laden Sie das unterzeichnete und gestempelte Formular hier hoch.
                  </p>
                </div>
              </div>

              {readOnly ? (
                uploadedForm ? (
                  <div className="rounded-xl border border-success/50 bg-success/5 p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{uploadedForm.name}</p>
                      <p className="text-xs text-secondary">Vom Kunden hochgeladen · bereit zur Prüfung</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center gap-2 text-center">
                    <Info className="h-5 w-5 text-muted" />
                    <p className="text-sm text-secondary">Noch nicht hochgeladen</p>
                  </div>
                )
              ) : uploadedForm ? (
                <div className="rounded-xl border border-success/50 bg-success/5 p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{uploadedForm.name}</p>
                    <p className="text-xs text-secondary">Hochgeladen · bereit zur Einreichung</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUploadedForm(null); }}
                    className="text-xs text-secondary hover:text-foreground underline"
                  >
                    Ersetzen
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files[0]);
                  }}
                  className={[
                    "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                    dragging ? "border-primary bg-upload-active" : "border-upload bg-upload-active",
                  ].join(" ")}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <CloudUpload className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    Datei hier ablegen oder{" "}
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="text-primary underline underline-offset-4"
                    >
                      auswählen
                    </button>
                  </p>
                  <p className="mt-1 text-xs text-secondary">PDF, JPG, PNG · max. 20 MB</p>
                </div>
              )}
            </div>

            {/* ── Submit button (Kunde only) ────────────────────────────────── */}
            {!readOnly && (
              <div className="flex flex-col sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!uploadedForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  <Send className="h-4 w-4" />
                  Alles zur Prüfung einreichen
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
