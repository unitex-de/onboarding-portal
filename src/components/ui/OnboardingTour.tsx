import { useState } from "react";
import { X, ArrowRight, LayoutDashboard, Building2, FolderUp, PenLine, CheckSquare } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Ihr Dashboard",
    body: "Hier sehen Sie Ihren Gesamtfortschritt auf einen Blick. Der Fortschrittsring zeigt, wie weit Sie beim Onboarding sind.",
    highlight: null,
  },
  {
    icon: Building2,
    title: "1 · Stammdaten",
    body: "Tragen Sie alle Unternehmensdaten ein: Grunddaten, Kontakt, Bankverbindung, GLN & Filialen sowie GWG-Pflichtangaben.",
    highlight: null,
  },
  {
    icon: FolderUp,
    title: "2 · Dokumente hochladen",
    body: "Laden Sie alle für Ihre Rechtsform erforderlichen Dokumente hoch. Die Liste passt sich automatisch an Ihre Rechtsform an.",
    highlight: null,
  },
  {
    icon: PenLine,
    title: "3 · Signaturen",
    body: "Nach mindestens 75% Gesamtfortschritt können Sie Verträge digital über PandaDoc unterzeichnen.",
    highlight: null,
  },
  {
    icon: CheckSquare,
    title: "Zur Prüfung freigeben",
    body: "Sobald alles bei 100% ist, erscheint der Button 'Zur Prüfung freigeben'. Danach meldet sich Ihr unitex-Ansprechpartner.",
    highlight: null,
  },
];

export function OnboardingTour() {
  const { state, update } = useOnboarding();
  const [step, setStep] = useState(0);

  // Only show for Kunden who haven't seen the tour yet
  if (state.tourSeen || state.role === "admin") return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const dismiss = () => update({ tourSeen: true });
  const next = () => {
    if (isLast) dismiss();
    else setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i}
                className={[
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-border",
                ].join(" ")}
              />
            ))}
          </div>
          <button onClick={dismiss} className="text-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">{current.title}</h3>
            <p className="mt-2 text-sm text-secondary leading-relaxed">{current.body}</p>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-muted">{step + 1} / {STEPS.length}</span>
          <button onClick={next}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isLast ? "Los geht's!" : "Weiter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
