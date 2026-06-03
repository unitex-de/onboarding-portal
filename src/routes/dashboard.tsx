import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, calcZrStartDate, formatDateDe, getChecklistProgress } from "@/lib/onboarding-state";
import { ArrowRight, CheckCircle2, FileText, PenLine } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | unitex Onboarding" }] }),
  component: DashboardPage,
});

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
      <circle cx="65" cy="65" r={r} stroke="var(--popover)" strokeWidth="10" fill="none" />
      <circle
        cx="65"
        cy="65"
        r={r}
        stroke="var(--primary)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        className="transition-all duration-700"
      />
      <text
        x="65"
        y="65"
        textAnchor="middle"
        dominantBaseline="central"
        transform="rotate(90 65 65)"
        fill="var(--card-foreground)"
        className="font-display font-bold"
        fontSize="22"
      >
        {pct}%
      </text>
    </svg>
  );
}

function DashboardPage() {
  const { state } = useOnboarding();
  const { done, total, pct } = getChecklistProgress(state);
  const zr = calcZrStartDate();

  return (
    <AppShell
      title={`Guten Tag, ${state.userName.split(" ")[0]}`}
      subtitle="Sie sind auf dem Weg zur Mitgliedschaft bei unitex."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-8">
            <ProgressRing pct={pct} />
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Gesamtfortschritt</p>
              <h3 className="mt-1 font-display text-2xl font-semibold">
                {done} von {total} erledigt
              </h3>
              <p className="mt-2 text-sm text-secondary max-w-md">
                Sobald alle Pflichtdokumente und Formulare vollständig sind, können Sie Ihre Verträge digital unterschreiben.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/40 bg-card p-8">
          <p className="text-xs uppercase tracking-wide text-secondary">Voraussichtlicher ZR-Start</p>
          <p className="mt-3 font-display text-3xl font-bold text-primary">{formatDateDe(zr)}</p>
          <p className="mt-2 text-sm text-secondary">+10 Werktage ab Einreichung</p>
        </div>

        {[
          { to: "/unternehmen" as const, icon: FileText, title: "Stammdaten vervollständigen", desc: "Firma, Bank und GLN-Angaben" },
          { to: "/upload-center" as const, icon: CheckCircle2, title: "Pflichtdokumente hochladen", desc: "HR-Auszug, Gesellschaftsvertrag …" },
          { to: "/signaturen" as const, icon: PenLine, title: "Verträge unterschreiben", desc: "Anschluss-Vertrag & SEPA-Mandat" },
        ].map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/60 transition-colors"
          >
            <Icon className="h-6 w-6 text-primary" />
            <h4 className="mt-4 font-display text-base font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-secondary">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
              Öffnen <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}