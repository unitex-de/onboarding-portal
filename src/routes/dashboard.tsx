import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, getProgressBreakdown } from "@/lib/onboarding-state";
import { CoachmarkTour, useTour, type TourStep } from "@/components/ui/CoachmarkTour";
import { ArrowRight, FileText, FolderUp, PenLine, SendHorizonal, Lock, Shield, Info, Check, X, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | unitex Onboarding" }] }),
  component: DashboardPage,
});

// ── Tour Steps ────────────────────────────────────────────────────────────────
const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Herzlich Willkommen!",
    body: "Schön, dass Sie dabei sind! Diese kurze Tour zeigt Ihnen in wenigen Schritten, wie das Onboarding-Portal funktioniert – damit Sie schnell und unkompliziert Mitglied werden können.",
    placement: "center",
  },
  {
    target: "progress-ring",
    title: "Ihr Gesamtfortschritt",
    body: "Hier können Sie Ihren bisherigen Fortschritt einsehen. Wie Sie sehen gibt es drei Schritte die zu bearbeiten sind.",
    placement: "bottom-left",
  },
  {
    target: "step-stammdaten",
    title: "Schritt 1 · Unternehmensdaten",
    body: "Zuerst füllen Sie das Unternehmensdaten-Formular aus mit den grundlegendsten Daten die wir für die ZR, sowie Ihre Verträge benötigen. Ihre Angaben befüllen automatisch die Verträge in Schritt 3.",
    placement: "top",
  },
  {
    target: "step-dokumente",
    title: "Schritt 2 · Dokumente",
    body: "Hier laden Sie ganz einfach benötigte Dokumente hoch. Der Upload-Manager zeigt Ihnen ganz genau an, welche Dokumente gefordert werden.",
    placement: "top",
  },
  {
    target: "step-signaturen",
    title: "Schritt 3 · Onboarding abschließen",
    body: "Erst wenn Schritt 1 & 2 erledigt sind können Sie Ihr Neukundenformular herunterladen, unterschreiben und einreichen!",
    placement: "top",
  },
  {
    target: "right-checklist",
    title: "Ihre Checkliste",
    body: "Die Checkliste zeigt Ihnen jederzeit Ihren Fortschritt an. Zur einfacheren Navigation können Sie auf die Punkte der Checkliste klicken und gelangen direkt dorthin wo noch Daten fehlen.",
    placement: "left",
  },
  {
    target: "checklist-download",
    title: "Checkliste herunterladen",
    body: "Hier erhalten Sie eine kompakte PDF die Ihnen alles auf einem Blick nochmal aufzeigt.",
    placement: "left",
  },
  {
    target: null,
    title: "Nun sind Sie dran!",
    body: "Wenn Sie die Tour neu starten wollen, klicken Sie links in der Navigation auf 'Tour starten'.",
    placement: "center",
  },
];

// ── Typewriter hook ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 50, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [text]);
  return { displayed, done };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const color = pct === 100 ? "#10b981" : "var(--primary)";
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
      <circle cx="65" cy="65" r={r} stroke="var(--popover)" strokeWidth="10" fill="none" />
      <circle cx="65" cy="65" r={r} stroke={color} strokeWidth="10" fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        className="transition-all duration-700"
      />
      <text x="65" y="65" textAnchor="middle" dominantBaseline="central"
        transform="rotate(90 65 65)" fill="var(--card-foreground)"
        className="font-display font-bold" fontSize="22">{pct}%</text>
    </svg>
  );
}

// ── Animated dashboard entrance ───────────────────────────────────────────────
function DashboardEntrance({ name, onDone }: { name: string; onDone: () => void }) {
  const { displayed, done } = useTypewriter(`Willkommen ${name} im unitex Onboarding Portal`, 55, 300);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="font-display text-4xl font-bold text-foreground">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-9 bg-primary ml-1 animate-pulse" />}
        </h1>
        <div className="min-h-[2.5rem] flex flex-col items-center gap-3">
          {done && (
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all animate-in fade-in duration-500"
            >
              Zum Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {!done && (
            <button
              type="button"
              onClick={onDone}
              className="text-xs text-muted hover:text-secondary underline underline-offset-4 transition-colors"
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function DashboardPage() {
  const navigate = useNavigate();

  // BUG 6: navigate to /unternehmen#grunddaten after tour completion
  const handleTourComplete = useCallback(() => {
    navigate({ to: "/unternehmen" }).then(() => {
      setTimeout(() => {
        const el = document.getElementById("grunddaten");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    });
  }, [navigate]);

  return (
    <CoachmarkTour steps={TOUR_STEPS} onComplete={handleTourComplete}>
      <DashboardContent />
    </CoachmarkTour>
  );
}

function DashboardContent() {
  const { start: startTour } = useTour();
  const { state, update } = useOnboarding();
  const { stammdaten, uploads, signaturen, total } = getProgressBreakdown(state);

  // DESIGN 5: use manually set zrStartDate
  const zrDisplay = state.zrStartDate
    ? new Date(state.zrStartDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Wird festgelegt";

  // DESIGN 4: step 3 unlocked and highlighted at ≥90%
  const signaturesUnlocked = total >= 90;
  const canSubmit = total >= 100;
  const isLieferant = state.memberType === "lieferant";
  const isAdmin = state.role === "admin";

  // ── First-visit animated entrance ──────────────────────────────────────────
  const [showEntrance, setShowEntrance] = useState(false);
  const entranceShownRef = useRef(false);
  useEffect(() => {
    if (!entranceShownRef.current && !state.dashboardSeen && !isAdmin) {
      const key = `unitex_entrance_${state.email}`;
      if (!sessionStorage.getItem(key)) {
        entranceShownRef.current = true;
        setShowEntrance(true);
        sessionStorage.setItem(key, "1");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEntranceDone = useCallback(() => {
    setShowEntrance(false);
    update({ dashboardSeen: true });
    startTour();
  }, [startTour, update]);

  // ── pendingTourStart from sidebar ──────────────────────────────────────────
  useEffect(() => {
    if (state.pendingTourStart) {
      update({ pendingTourStart: false });
      startTour();
    }
  }, [state.pendingTourStart, startTour, update]);

  // ── Hint toast ─────────────────────────────────────────────────────────────
  const [showHint, setShowHint] = useState(false);

  // ── Submission success modal ────────────────────────────────────────────────
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);

  const onSubmit = () => {
    update({ submittedAt: new Date().toISOString() });
    setShowSubmitSuccess(true);
  };

  return (
    <>
      {showEntrance && (
        <DashboardEntrance
          name={state.userName}
          onDone={handleEntranceDone}
        />
      )}
      <AppShell
          title={`Guten Tag, ${state.userName}`}
          subtitle={`${state.companyName} · ${isLieferant ? "Lieferanten" : "Händler"}-Onboarding`}
        >
          {/* Hint toast – temporär unten links */}
          {showHint && !isAdmin && (
            <div className="fixed bottom-20 left-6 z-50 max-w-xs rounded-xl border border-border bg-card shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-foreground font-medium">Hinweis</p>
                <p className="text-xs text-secondary mt-0.5">
                  Einige Felder können bereits von Ihrem unitex Servicepartner ausgefüllt worden sein, bitte prüfen Sie diese auf Richtigkeit!
                </p>
              </div>
              <button onClick={() => setShowHint(false)} className="text-muted hover:text-foreground shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress card */}
            <div
              data-tour="progress-ring"
              className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-8"
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                <ProgressRing pct={total} />
                <div className="flex-1 space-y-4 sm:pt-1 text-center sm:text-left w-full">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-secondary">Gesamtfortschritt</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold">{total}% abgeschlossen</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {total < 90
                        ? "Unternehmensdaten und Dokumente vervollständigen, um Schritt 3 freizuschalten."
                        : total < 100
                        ? "Fast geschafft! Bitte laden Sie Ihr unterschriebenes Formular hoch."
                        : "Alles vollständig – bereit zur Einreichung."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DESIGN 5: ZR-Start from admin-set date */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary">ZR-Startdatum</p>
                <p className="mt-3 font-display text-3xl font-bold text-primary">
                  {zrDisplay}
                </p>
                {!state.zrStartDate && (
                  <p className="text-xs text-muted mt-1">Wird vom Admin festgelegt</p>
                )}
              </div>
              {(state.completedSections["abschluss"] || state.submittedAt) ? (
                <div className="mt-4 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0" />
                  Zur Prüfung eingereicht
                </div>
              ) : canSubmit && !isAdmin ? (
                <button type="button" onClick={onSubmit}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors animate-pulse hover:animate-none"
                >
                  <SendHorizonal className="h-4 w-4" />
                  Zur Prüfung freigeben
                </button>
              ) : null}
            </div>

            {/* Step 1: Unternehmensdaten */}
            <Link to="/unternehmen" data-tour="step-stammdaten"
              className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors">
              <FileText className="h-5 w-5 text-primary" />
              <h4 className="mt-3 font-display text-base font-semibold">01. Unternehmensdaten</h4>
              <p className="mt-1 text-sm text-secondary">
                {isLieferant ? "Firmendaten & Lieferanten-Stammblatt" : "Firma, Bank, GLN & GWG-Daten"}
              </p>
              <div className="mt-4 h-1 rounded-full bg-popover overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${stammdaten}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs text-secondary">
                <span>{stammdaten}% abgeschlossen</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Step 2: Dokumente */}
            <Link to="/upload-center" data-tour="step-dokumente"
              className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors">
              <FolderUp className="h-5 w-5 text-primary" />
              <h4 className="mt-3 font-display text-base font-semibold">02. Dokumente</h4>
              <p className="mt-1 text-sm text-secondary">
                {isLieferant ? "Handelsregister-Auszug" : "Pflichtdokumente für Ihre Rechtsform"}
              </p>
              <div className="mt-4 h-1 rounded-full bg-popover overflow-hidden">
                <div className="h-full bg-primary/70 transition-all duration-500" style={{ width: `${uploads}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs text-secondary">
                <span>{uploads}% hochgeladen</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* DESIGN 4: Step 3 with animated border at ≥90% */}
            {signaturesUnlocked ? (
              <Link to="/signaturen" data-tour="step-signaturen"
                className={[
                  "group rounded-2xl border bg-card p-6 hover:border-primary/60 transition-colors",
                  total >= 90 && signaturen < 100
                    ? "border-primary/60 shadow-[0_0_0_2px_hsl(var(--primary)/0.15)] animate-[pulse-border_2s_ease-in-out_infinite]"
                    : "border-border",
                ].join(" ")}>
                <PenLine className="h-5 w-5 text-primary" />
                <h4 className="mt-3 font-display text-base font-semibold">03. Onboarding abschließen</h4>
                <p className="mt-1 text-sm text-secondary">
                  {isLieferant ? "Zusatzblatt unterschreiben & einreichen" : "Neukundenformular unterschreiben & einreichen"}
                </p>
                <div className="mt-4 h-1 rounded-full bg-popover overflow-hidden">
                  <div className="h-full bg-primary/40 transition-all duration-500" style={{ width: `${signaturen}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-secondary">
                  <span>{signaturen}% abgeschlossen</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ) : (
              <div data-tour="step-signaturen"
                className="rounded-2xl border border-border bg-card/50 p-6 opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted" />
                  <PenLine className="h-4 w-4 text-muted" />
                </div>
                <h4 className="mt-3 font-display text-base font-semibold text-secondary">03. Onboarding abschließen</h4>
                <p className="mt-1 text-sm text-muted">Erst ab 90% Gesamtfortschritt verfügbar</p>
                <p className="mt-3 text-xs text-muted">Aktuell: {total}% – noch {90 - total}% fehlend</p>
              </div>
            )}
          </div>

          {/* Submission success modal */}
          {showSubmitSuccess && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="p-8 flex flex-col items-center text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold">Sie haben es geschafft!</h3>
                    <p className="mt-3 text-sm text-secondary leading-relaxed">
                      Nun prüfen wir sorgfältig Ihre Angaben und Dokumente. Ihr unitex Ansprechpartner meldet sich in Kürze bei Ihnen.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSubmitSuccess(false)}
                    className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-4 w-4" /> Verstanden
                  </button>
                </div>
              </div>
            </div>
          )}
        </AppShell>
    </>
  );
}

function MiniBar({ label, pct, colorClass = "bg-primary" }: { label: string; pct: number; colorClass?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-secondary">{label}</span>
        <span className="text-card-foreground font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-popover overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
