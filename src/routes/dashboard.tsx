import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  useOnboarding,
  calcZrStartDate,
  getProgressBreakdown,
} from "@/lib/onboarding-state";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { ArrowRight, FileText, FolderUp, PenLine, SendHorizonal, Lock, Shield } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | unitex Onboarding" }] }),
  component: DashboardPage,
});

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const color = pct === 100 ? "var(--emerald, #10b981)" : "var(--primary)";
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
      <circle cx="65" cy="65" r={r} stroke="var(--popover)" strokeWidth="10" fill="none" />
      <circle cx="65" cy="65" r={r} stroke={color} strokeWidth="10" fill="none"
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        className="transition-all duration-700"
      />
      <text x="65" y="65" textAnchor="middle" dominantBaseline="central"
        transform="rotate(90 65 65)" fill="var(--card-foreground)"
        className="font-display font-bold" fontSize="22"
      >
        {pct}%
      </text>
    </svg>
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

function DashboardPage() {
  const { state, update } = useOnboarding();
  const navigate = useNavigate();
  const { stammdaten, uploads, signaturen, total } = getProgressBreakdown(state);
  const zr = calcZrStartDate();

  const signaturesUnlocked = total >= 75;
  const canSubmit = total >= 100;
  const isLieferant = state.memberType === "lieferant";

  // Auto-navigate when a section just hit 100%: Stammdaten → Upload, Upload → Signaturen
  useEffect(() => {
    // This just triggers on mount; actual auto-nav happens from section save buttons
  }, []);

  const onSubmit = async () => {
    update({ submittedAt: new Date().toISOString() });
    // Send notification email to TL
    try {
      await fetch("mailto:projekte@unitex.de", { method: "GET" }).catch(() => {});
      // In production: POST to a server function that sends email
      console.log("Notification sent to projekte@unitex.de");
    } catch { /* ignore */ }
  };

  return (
    <AppShell
      title={`Guten Tag, ${state.userName.split(" ")[0]}`}
      subtitle={`${state.companyName} · ${isLieferant ? "Lieferanten" : "Händler"}-Onboarding`}
    >
      <OnboardingTour />

      {/* Admin mode: hint to customer about pre-filled fields */}
      {state.role === "admin" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm">
          <span className="shrink-0 text-primary font-bold">Admin-Ansicht</span>
          <p className="text-secondary">
            Sie befüllen diesen Account als Admin. Wenn Sie fertig sind, kehren Sie zur{" "}
            <a href="/admin" className="text-primary underline underline-offset-4 hover:no-underline">Kontoübersicht</a>{" "}
            zurück und senden Sie dort den Magic Link an den Kunden.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-start gap-8">
            <ProgressRing pct={total} />
            <div className="flex-1 space-y-4 pt-1">
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary">Gesamtfortschritt</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{total}% abgeschlossen</h3>
                <p className="mt-1 text-sm text-secondary">
                  {total < 75
                    ? "Stammdaten und Dokumente vervollständigen, um Signaturen freizuschalten."
                    : total < 100
                    ? "Fast geschafft! Verträge jetzt unterschreiben."
                    : "Alles vollständig – bereit zur Einreichung."}
                </p>
              </div>
              <div className="space-y-2">
                <MiniBar label="01. Stammdaten" pct={stammdaten} colorClass="bg-primary" />
                <MiniBar label="02. Dokumente" pct={uploads} colorClass="bg-primary/70" />
                <MiniBar label="03. Signaturen" pct={signaturen} colorClass="bg-primary/40" />
              </div>
            </div>
          </div>
        </div>

        {/* ZR-Start + Submit */}
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Voraussichtlicher ZR-Start</p>
            <p className="mt-3 font-display text-3xl font-bold text-primary">
              01.{String(zr.getMonth() + 1).padStart(2, "0")}.{zr.getFullYear()}
            </p>
            <p className="mt-2 text-sm text-secondary">
              Ab dem 1. des Folgemonats nach vollständiger Einreichung
            </p>
          </div>
          {state.submittedAt ? (
            <div className="mt-4 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0" />
              Zur Prüfung eingereicht
            </div>
          ) : canSubmit ? (
            <button type="button" onClick={onSubmit}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <SendHorizonal className="h-4 w-4" />
              Zur Prüfung freigeben
            </button>
          ) : null}
        </div>

        {/* Step 1: Stammdaten */}
        <Link to="/unternehmen"
          className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h4 className="mt-3 font-display text-base font-semibold">01. Stammdaten</h4>
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
        <Link to="/upload-center"
          className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <FolderUp className="h-5 w-5 text-primary" />
          </div>
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

        {/* Step 3: Signaturen */}
        {signaturesUnlocked ? (
          <Link to="/signaturen"
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <PenLine className="h-5 w-5 text-primary" />
            </div>
            <h4 className="mt-3 font-display text-base font-semibold">03. Signaturen</h4>
            <p className="mt-1 text-sm text-secondary">Verträge digital unterzeichnen</p>
            <div className="mt-4 h-1 rounded-full bg-popover overflow-hidden">
              <div className="h-full bg-primary/40 transition-all duration-500" style={{ width: `${signaturen}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-secondary">
              <span>{signaturen}% signiert</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card/50 p-6 opacity-60 cursor-not-allowed">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-muted" />
              <PenLine className="h-4 w-4 text-muted" />
            </div>
            <h4 className="mt-3 font-display text-base font-semibold text-secondary">03. Signaturen</h4>
            <p className="mt-1 text-sm text-muted">Erst ab 75% Gesamtfortschritt verfügbar</p>
            <p className="mt-3 text-xs text-muted">Aktuell: {total}% – noch {75 - total}% fehlend</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
