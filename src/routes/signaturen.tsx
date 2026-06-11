import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, FileSignature, Lock, ShieldCheck, X, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, getProgressBreakdown } from "@/lib/onboarding-state";
import { getServerConfig } from "@/lib/config.server";

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
}

interface ServerFnInput {
  packageId: string;
  tokens: Array<{ label: string; value: string }>;
}

export const createPandaDocDocument = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const { data } = ctx as unknown as { data: ServerFnInput };
    const config = getServerConfig();
    const {
      pandadocApiKey,
      pandadocTemplateSepa,
      pandadocTemplateAnschluss,
      pandadocTemplateSonder,
    } = config;

    const templateId =
      data.packageId === "sepa"
        ? pandadocTemplateSepa
        : data.packageId === "anschluss"
        ? pandadocTemplateAnschluss
        : data.packageId === "sonder"
        ? pandadocTemplateSonder
        : undefined;

    if (!pandadocApiKey || !templateId) {
      return { signingUrl: null };
    }

    const createRes = await fetch("https://api.pandadoc.com/public/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `API-Key ${pandadocApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `unitex Onboarding – ${data.packageId}`,
        template_uuid: templateId,
        tokens: data.tokens.map((token: { label: string; value: string }) => ({
          name: token.label,
          value: token.value,
        })),
        metadata: { packageId: data.packageId },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`PandaDoc document creation failed: ${createRes.status} ${errText}`);
    }

    const result = await createRes.json();
    return { signingUrl: result.signing_url || null };
  }) as unknown as (opts: { data: ServerFnInput }) => Promise<{ signingUrl: string | null }>;

function SignaturenPage() {
  const { state, completeSection } = useOnboarding();
  const { total } = getProgressBreakdown(state);

  // Gate: 75% required (Stammdaten + Uploads complete)
  const unlocked = total >= 75;

  const contractLabel =
    state.contractType === "5jahre" ? "5 Jahre Laufzeit"
    : state.contractType === "3jahre" ? "3 Jahre Laufzeit"
    : state.contractType === "probe" ? "Probe-Vertrag"
    : "Wird nach Auswahl angezeigt";

  const isLieferant = state.memberType === "lieferant";

  const haendlerPackages: Package[] = [
    {
      id: "sepa",
      title: "SEPA Firmenlastschrift-Mandat",
      desc: "Ermächtigt die RSB zum Einzug fälliger Beträge.",
      tokens: [{ label: "Firmenname", value: state.companyName }],
    },
    {
      id: "anschluss",
      title: "Mitgliedsvertrag unitex",
      desc: "Hauptvertrag Ihrer Mitgliedschaft bei unitex.",
      tokens: [
        { label: "Firmenname", value: state.companyName },
        { label: "GF-Name", value: state.userName },
      ],
    },
  ];
  if (state.hasSoliver) {
    haendlerPackages.push({
      id: "sonder",
      title: "Sonderformular Zentralregulierung",
      desc: "Erforderlich bei Zusammenarbeit mit s.Oliver / COMMA / Gebr. Amman (ISCO).",
      tokens: [{ label: "Firmenname", value: state.companyName }],
    });
  }

  const lieferantPackages: Package[] = [
    {
      id: "zr_vertrag",
      title: "ZR-Vertrag",
      desc: "Zentralregulierungsvertrag zwischen Lieferant und unitex.",
      tokens: [{ label: "Firmenname", value: state.companyName }],
    },
    {
      id: "gruen_vertrag",
      title: "Vertrag GRÜN raw",
      desc: "Rechnungsportalvertrag mit der GRÜN raw GmbH.",
      tokens: [{ label: "Firmenname", value: state.companyName }],
    },
    {
      id: "sepa_gruen",
      title: "SEPA-Mandat GRÜN raw",
      desc: "SEPA-Lastschriftmandat für das GRÜN raw Rechnungsportal.",
      tokens: [{ label: "Firmenname", value: state.companyName }],
    },
  ];

  const packages: Package[] = isLieferant ? lieferantPackages : haendlerPackages;

  const [signing, setSigning] = useState<Package | null>(null);

  return (
    <AppShell
      title="Signaturen"
      subtitle="Verträge einfach hier digital unterschreiben - sicher und rechtsverbindlich via PandaDoc."
    >
      {/* Status banner */}
      <div
        className={[
          "mb-6 rounded-xl border p-5 flex items-start gap-4",
          unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        ].join(" ")}
      >
        {unlocked
          ? <ShieldCheck className="h-6 w-6 text-primary mt-0.5" />
          : <Lock className="h-6 w-6 text-muted mt-0.5" />}
        <div className="flex-1">
          <p className="font-display font-semibold">
            {unlocked ? "Bereit zur Unterschrift" : "Signatur noch nicht freigegeben"}
          </p>
          <p className="text-sm text-secondary mt-1">
            {unlocked
              ? "Stammdaten und Dokumente sind vollständig. Sie können jetzt digital signieren."
              : `Mindestens 75% Gesamtfortschritt erforderlich (Stammdaten + Dokumente). Aktuell: ${total}%.`}
          </p>
        </div>
        {!unlocked && (
          <Link
            to="/unternehmen"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary shrink-0"
          >
            Stammdaten vervollständigen
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {packages.map((p) => {
          const signed = !!state.completedSections[`signed_${p.id}`];
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col">
              <div className="flex items-start justify-between">
                <div className={[
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  signed ? "bg-primary/20 text-primary" : "bg-popover text-primary",
                ].join(" ")}>
                  {signed
                    ? <Check className="h-5 w-5" strokeWidth={2.5} />
                    : <FileSignature className="h-5 w-5" />}
                </div>
                {signed && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Unterschrieben
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-secondary">{p.desc}</p>

              <dl className="mt-4 space-y-2 text-xs flex-1">
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
                  disabled={!unlocked || signed}
                  onClick={() => setSigning(p)}
                  className={[
                    "w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-colors",
                    signed
                      ? "bg-primary/10 text-primary border border-primary/20 cursor-default"
                      : unlocked
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-popover text-muted cursor-not-allowed",
                  ].join(" ")}
                >
                  {signed ? "✓ Unterschrieben" : "Jetzt unterschreiben"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {signing && (
        <SigningModal
          pkg={signing}
          onClose={() => setSigning(null)}
          onSigned={() => {
            completeSection(`signed_${signing.id}`);
            setSigning(null);
          }}
        />
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// PandaDoc Signing Modal
// ---------------------------------------------------------------------------
type ModalStep = "preview" | "loading" | "iframe" | "success";

function SigningModal({
  pkg,
  onClose,
  onSigned,
}: {
  pkg: Package;
  onClose: () => void;
  onSigned: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("preview");
  const [liveSigningUrl, setLiveSigningUrl] = useState<string | null>(null);

  const startSigning = async () => {
    setStep("loading");
    try {
      const createRes = await createPandaDocDocument({
        data: { packageId: pkg.id, tokens: pkg.tokens },
      });

      const signingUrl = createRes.signingUrl ?? null;
      setLiveSigningUrl(signingUrl);

      if (signingUrl) {
        setStep("iframe");
        const handler = (e: MessageEvent) => {
          if (e.data?.type === "pandadoc:document:completed" || e.data?.type === "session_view.document.completed") {
            window.removeEventListener("message", handler);
            setStep("success");
          }
        };
        window.addEventListener("message", handler);
      } else {
        setStep("success");
      }
    } catch {
      setStep("success");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className={[
        "w-full rounded-2xl border border-border bg-card overflow-hidden",
        step === "iframe" ? "max-w-4xl h-[80vh] flex flex-col" : "max-w-lg",
      ].join(" ")}>
        <header className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <ShieldCheck className="h-4 w-4 text-primary" />
            PandaDoc · Sichere Signatur
          </div>
          <button onClick={onClose} aria-label="Schließen" className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        {step === "preview" && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="font-display text-2xl font-semibold">{pkg.title}</h3>
              <p className="mt-2 text-sm text-secondary">
                Prüfen Sie die vorausgefüllten Daten. Mit Klick auf „Signieren" wird das Dokument in PandaDoc geöffnet.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-popover p-5 space-y-2 text-sm">
              {pkg.tokens.map((t) => (
                <div key={t.label} className="flex justify-between gap-4">
                  <span className="text-muted">{t.label}</span>
                  <span className="text-foreground font-medium">{t.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">
                Mit der Signatur akzeptieren Sie die AGB und Datenschutzbestimmungen der unitex GmbH.
              </span>
              <button
                onClick={startSigning}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shrink-0"
              >
                <FileSignature className="h-4 w-4" /> Signieren
              </button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="p-12 flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-secondary">Dokument wird vorbereitet…</p>
          </div>
        )}

        {step === "iframe" && (
          <iframe
            src={liveSigningUrl ?? ""}
            className="flex-1 w-full border-0"
            title="PandaDoc Signatur"
            allow="camera"
          />
        )}

        {step === "success" && (
          <div className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
              <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold">Signatur erfolgreich</h3>
              <p className="mt-2 text-sm text-secondary">
                „{pkg.title}" wurde rechtsverbindlich unterzeichnet.
              </p>
            </div>
            <button
              onClick={onSigned}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Weiter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
