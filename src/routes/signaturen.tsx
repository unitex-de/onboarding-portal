import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileSignature, Lock, ShieldCheck, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, getChecklistProgress } from "@/lib/onboarding-state";

const CREDITOR_ID = "DE850200000018324";

export const Route = createFileRoute("/signaturen")({
  head: () => ({ meta: [{ title: "Signaturen | unitex Onboarding" }] }),
  component: SignaturenPage,
});

interface Package {
  id: string;
  title: string;
  desc: string;
  tokens: { label: string; value: string }[];
  conditional?: boolean;
}

function SignaturenPage() {
  const { state, update } = useOnboarding();
  const { pct } = getChecklistProgress(state);
  const unlocked = pct >= 80;
  const contractLabel =
    state.contractType === "5jahre" ? "5 Jahre Laufzeit"
    : state.contractType === "3jahre" ? "3 Jahre Laufzeit"
    : state.contractType === "probe" ? "Probe-Vertrag"
    : "— bitte Vertragsart wählen —";

  const packages: Package[] = [
    {
      id: "anschluss",
      title: "Anschluss-Vertrag",
      desc: "Hauptvertrag Ihrer Mitgliedschaft.",
      tokens: [
        { label: "Firmenname", value: state.companyName },
        { label: "GF-Name", value: state.userName },
        { label: "Vertragsart", value: contractLabel },
        { label: "ZR-Start", value: "automatisch nach Einreichung" },
      ],
    },
    {
      id: "sepa",
      title: "SEPA Firmenlastschrift-Mandat",
      desc: "Ermächtigt unitex zum Einzug fälliger Beträge.",
      tokens: [
        { label: "Firmenname", value: state.companyName },
        { label: "Gläubiger-ID", value: CREDITOR_ID },
      ],
    },
    {
      id: "sonder",
      title: "Sonderformular Zentralregulierung",
      desc: "Erforderlich bei Zusammenarbeit mit S.Oliver / Comma / Isco.",
      tokens: [{ label: "Firmenname", value: state.companyName }],
      conditional: true,
    },
  ];

  const [signing, setSigning] = useState<Package | null>(null);

  return (
    <AppShell
      title="Signaturen"
      subtitle="Verträge digital unterschreiben — sicher und rechtsverbindlich via PandaDoc."
    >
      {/* Status banner */}
      <div
        className={[
          "mb-6 rounded-xl border p-5 flex items-start gap-4",
          unlocked ? "border-success/40 bg-success-soft" : "border-border bg-card",
        ].join(" ")}
      >
        {unlocked ? <ShieldCheck className="h-6 w-6 text-success mt-0.5" /> : <Lock className="h-6 w-6 text-muted mt-0.5" />}
        <div className="flex-1">
          <p className="font-display font-semibold">
            {unlocked ? "Bereit zur Unterschrift" : "Signatur noch nicht freigegeben"}
          </p>
          <p className="text-sm text-secondary mt-1">
            {unlocked
              ? "Alle Voraussetzungen sind erfüllt. Sie können die Verträge jetzt digital signieren."
              : `Mindestens 80% der Checkliste müssen abgeschlossen sein. Aktuell: ${pct}%.`}
          </p>
        </div>
        {!unlocked && (
          <Link
            to="/upload-center"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary"
          >
            Zum Upload-Center
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {packages.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-popover text-primary">
                <FileSignature className="h-5 w-5" />
              </div>
              {p.conditional && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Bedingt
                </span>
              )}
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-secondary">{p.desc}</p>

            <dl className="mt-4 space-y-2 text-xs">
              {p.tokens.map((t) => (
                <div key={t.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{t.label}</dt>
                  <dd className="text-foreground text-right truncate max-w-[60%]">{t.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto pt-5">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => setSigning(p)}
                title={!unlocked ? `Mindestens 80% der Checkliste erforderlich (aktuell ${pct}%)` : ""}
                className={[
                  "w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
                  unlocked
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-popover text-muted cursor-not-allowed",
                ].join(" ")}
              >
                {state.completedSections[`signed_${p.id}`] ? "✓ Unterschrieben" : "Jetzt unterschreiben"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {signing && (
        <SigningModal
          pkg={signing}
          onClose={() => setSigning(null)}
          onSigned={() => {
            update({ completedSections: { ...state.completedSections, [`signed_${signing.id}`]: true } });
            setSigning(null);
          }}
        />
      )}
    </AppShell>
  );
}

function SigningModal({ pkg, onClose, onSigned }: { pkg: Package; onClose: () => void; onSigned: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <ShieldCheck className="h-4 w-4 text-success" />
            PandaDoc · Sichere Signatur
          </div>
          <button onClick={onClose} aria-label="Schließen" className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-8">
          <h3 className="font-display text-2xl font-semibold">{pkg.title}</h3>
          <p className="mt-2 text-sm text-secondary">
            Bitte prüfen Sie die folgenden Daten. Mit Klick auf „Signieren“ unterzeichnen Sie das Dokument rechtsverbindlich.
          </p>
          <div className="mt-6 rounded-lg border border-border bg-popover p-5 space-y-2 text-sm">
            {pkg.tokens.map((t) => (
              <div key={t.label} className="flex justify-between gap-4">
                <span className="text-muted">{t.label}</span>
                <span className="text-foreground font-medium">{t.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              Mit der Signatur akzeptieren Sie die AGB und Datenschutzbestimmungen der unitex GmbH.
            </span>
            <button
              onClick={onSigned}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-4 w-4" /> Jetzt signieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}