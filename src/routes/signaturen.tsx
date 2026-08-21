import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check, Lock, Loader2,
  Shield, Info, AlertTriangle, FileCheck2, Download,
} from "lucide-react";
import { useOnboarding, getProgressBreakdown, getDownloadUrl } from "@/lib/onboarding-state";
import { AppShell } from "@/components/layout/AppShell";
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
  const { state, completeSection, submitForReview } = useOnboarding();
  const activeCustomer = state.customerAccounts.find((a) => a.id === state.activeCustomerId);
  const signed = !!state.completedSections["abschluss"];
  const isLieferant = state.memberType === "lieferant";

  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(signed);
  const [showEtappe3Confetti, setShowEtappe3Confetti] = useState(false);

  const handleSubmit = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      completeSection("abschluss");
      await submitForReview();
      setSubmitted(true);
      setShowEtappe3Confetti(true);
    } catch (e) {
      console.error("Einreichung zur Prüfung fehlgeschlagen:", e);
      setSubmitError("Die Einreichung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  const formLabel = isLieferant ? "Zusatzblatt Lieferanten" : "Neukundenformular";

  return (
    <AppShell
      title="Onboarding abschließen"
      subtitle={`Letzter Schritt: Angaben bestätigen und ${formLabel} zur Prüfung einreichen.`}
    >
      {/* Admin banner */}
      {readOnly && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-4">
          <Shield className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-display font-semibold text-amber-300">Admin-Modus: Einreichung nicht möglich</p>
            <p className="text-sm text-amber-400/80 mt-1">
              Als Admin-Mitarbeiter können Sie diesen Bereich einsehen, aber <strong>nicht selbst unterschreiben</strong>.
              Die digitale Unterschrift muss durch den Kunden über seinen persönlichen Magic Link erfolgen.
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
                ? "Der Kunde hat die Angaben bestätigt und zur Prüfung eingereicht."
                : "Sie haben Ihre Angaben bestätigt und eingereicht. Wir kümmern uns nun darum und melden uns, sobald Ihr Onboarding abgeschlossen ist."}
            </p>
            {readOnly && (activeCustomer?.signedDocumentPath || activeCustomer?.neukundenformularPath || activeCustomer?.gwgBogenPath) && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {activeCustomer?.neukundenformularPath && (
                  <button
                    type="button"
                    onClick={async () => {
                      const url = await getDownloadUrl(activeCustomer.neukundenformularPath!);
                      if (url) window.open(url, "_blank");
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Download className="h-4 w-4" /> {formLabel} ansehen
                  </button>
                )}
                {activeCustomer?.gwgBogenPath && (
                  <button
                    type="button"
                    onClick={async () => {
                      const url = await getDownloadUrl(activeCustomer.gwgBogenPath!);
                      if (url) window.open(url, "_blank");
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Download className="h-4 w-4" /> GWG-Bogen ansehen
                  </button>
                )}
                {activeCustomer?.signedDocumentPath && (
                  <button
                    type="button"
                    onClick={async () => {
                      const url = await getDownloadUrl(activeCustomer.signedDocumentPath!);
                      if (url) window.open(url, "_blank");
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Download className="h-4 w-4" /> Signiertes PDF ansehen (alt)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!submitted && !readOnly && (
          <>
            {/* ── Bestätigung & Einreichung ────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">Angaben bestätigen & einreichen</h3>
                  <p className="text-sm text-secondary mt-1 leading-relaxed">
                    Das {formLabel} wird nach erfolgreicher Prüfung automatisch für Sie erstellt –
                    kein Download, kein Ausdrucken, kein Hochladen nötig.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border bg-popover/50 p-4">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span className="text-sm text-foreground leading-relaxed">
                  Ich bestätige, dass meine Angaben vollständig und korrekt sind, und akzeptiere die{" "}
                  <a href="#" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    AGB
                  </a>{" "}
                  von unitex.
                </span>
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!confirmed || submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 sm:py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Wird eingereicht…</>
                ) : (
                  <><FileCheck2 className="h-4 w-4" /> Zur Prüfung einreichen</>
                )}
              </button>

              {submitError && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{submitError}
                </p>
              )}

              {!submitError && (
                <p className="text-xs text-secondary mt-2 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  Tanja prüft Ihre Angaben und meldet sich, falls noch etwas korrigiert werden muss.
                </p>
              )}
            </div>
          </>
        )}

        {!submitted && readOnly && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center gap-2 text-center">
            <Info className="h-5 w-5 text-muted" />
            <p className="text-sm text-secondary">Kunde hat die Einreichung noch nicht bestätigt.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}