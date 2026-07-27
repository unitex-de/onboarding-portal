import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Check, Lock, Loader2,
  Shield, Info, AlertTriangle, PenLine, Download,
} from "lucide-react";
import { useOnboarding, getProgressBreakdown, getDownloadUrl } from "@/lib/onboarding-state";
import { AppShell } from "@/components/layout/AppShell";
import { generateNeukundenPdfFilled, generateLieferantPdfFilled } from "@/lib/pdf-form-filler";
import { createSigningSession } from "@/lib/api/pandadoc.functions";
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

// ─────────────────────────────────────────────────────────────────────────
// Hilfsfunktion: Uint8Array (aus pdf-lib) → Base64-String für den Server-Call
// ─────────────────────────────────────────────────────────────────────────
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // in Chunks, um Stack-Limits bei großen PDFs zu vermeiden
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// ─── Kunden-Flow: Schritt 3 – Onboarding abschließen ─────────────────────────

function KundeAbschlussPage({ unlocked, readOnly = false }: { unlocked: boolean; readOnly?: boolean }) {
  const { state, completeSection, submitForReview } = useOnboarding();
  const activeCustomer = state.customerAccounts.find((a) => a.id === state.activeCustomerId);
  const signed = !!state.completedSections["abschluss"];
  const isLieferant = state.memberType === "lieferant";

  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(signed);
  const [showEtappe3Confetti, setShowEtappe3Confetti] = useState(false);

  const handleSigningComplete = useCallback(async () => {
    completeSection("abschluss");
    setSubmitted(true);
    setShowEtappe3Confetti(true);
    try {
      await submitForReview();
    } catch (e) {
      console.error("Einreichung zur Prüfung fehlgeschlagen:", e);
    }
  }, [completeSection, submitForReview]);

  // Auf PandaDoc-Completion-Event lauschen, solange die Signiersitzung offen ist
  useEffect(() => {
    if (!signingUrl) return;
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://app.pandadoc.com") return;
      const type = (event.data as { type?: string } | undefined)?.type;
      if (type === "session_view.document.completed") {
        setSigningUrl(null);
        void handleSigningComplete();
      } else if (type === "session_view.document.exception") {
        setSigningError("Beim Unterschreiben ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [signingUrl, handleSigningComplete]);

  const handleStartSigning = async () => {
    setSigningLoading(true);
    setSigningError(null);
    try {
      const fd = state.savedFormData ?? {};
      const gf = fd.contacts?.find((c) => c.kind === "gf");
      const recipientEmail = gf?.email || fd.emailFirma;
      if (!recipientEmail) {
        setSigningError("Es ist keine E-Mail-Adresse für die Unterschrift hinterlegt. Bitte Unternehmensdaten prüfen.");
        setSigningLoading(false);
        return;
      }
      const pdfBytes = isLieferant
        ? await generateLieferantPdfFilled(state)
        : await generateNeukundenPdfFilled(state);

      const result = await createSigningSession({
        data: {
          packageId: isLieferant ? "lieferant" : "neukunde",
          pdfBase64: bytesToBase64(pdfBytes),
          recipientEmail,
          recipientFirstName: gf?.vorname ?? state.companyName ?? "Kunde",
          recipientLastName: gf?.nachname ?? "",
          documentName: `unitex Onboarding – ${state.companyName ?? ""}`,
          customerId: recipientEmail,
        },
      });
      setSigningUrl(result.signingUrl);
    } catch (err) {
      setSigningError("Die Signatur konnte nicht vorbereitet werden. Bitte versuchen Sie es erneut.");
      console.error("PandaDoc signing session error:", err);
    } finally {
      setSigningLoading(false);
    }
  };

  const formLabel = isLieferant ? "Zusatzblatt Lieferanten" : "Neukundenformular";

  return (
    <AppShell
      title="Onboarding abschließen"
      subtitle={`Letzter Schritt: ${formLabel} direkt hier im Portal digital unterschreiben.`}
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
                ? "Der Kunde hat digital unterschrieben. Die Prüfung läuft."
                : "Sie haben digital unterschrieben. Wir kümmern uns nun darum und melden uns, sobald Ihr Onboarding abgeschlossen ist."}
            </p>
            {readOnly && activeCustomer?.signedDocumentPath && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const url = await getDownloadUrl(activeCustomer.signedDocumentPath!);
                    if (url) window.open(url, "_blank");
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Download className="h-4 w-4" /> Signiertes PDF ansehen
                </button>
              </div>
            )}
          </div>
        )}

        {!submitted && !readOnly && (
          <>
            {/* ── Signatur-Karte ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <PenLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">{formLabel} digital unterschreiben</h3>
                  <p className="text-sm text-secondary mt-1 leading-relaxed">
                    Das Portal hat Ihr {formLabel} automatisch mit Ihren Daten ausgefüllt.
                    Unterschreiben Sie direkt hier – kein Download, kein Ausdrucken, kein Hochladen nötig.
                  </p>
                </div>
              </div>

              {!signingUrl && (
                <button
                  type="button"
                  onClick={handleStartSigning}
                  disabled={signingLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 sm:py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors min-h-[44px]"
                >
                  {signingLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Wird vorbereitet…</>
                  ) : (
                    <><PenLine className="h-4 w-4" /> Jetzt digital unterschreiben</>
                  )}
                </button>
              )}

              {signingError && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{signingError}
                </p>
              )}

              {signingUrl && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <iframe
                    src={signingUrl}
                    title="Dokument digital unterschreiben"
                    className="w-full"
                    style={{ height: "70vh", border: "none" }}
                  />
                </div>
              )}

              {!signingUrl && !signingLoading && !signingError && (
                <p className="text-xs text-secondary mt-2 flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  Die Unterschrift ist rechtsgültig (fortgeschrittene elektronische Signatur) und wird direkt an unitex übermittelt.
                </p>
              )}
            </div>
          </>
        )}

        {!submitted && readOnly && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center gap-2 text-center">
            <Info className="h-5 w-5 text-muted" />
            <p className="text-sm text-secondary">Kunde hat noch nicht digital unterschrieben.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}