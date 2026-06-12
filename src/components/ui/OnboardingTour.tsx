import { useState, useEffect } from "react";
import { X, ArrowRight, LayoutDashboard, Building2, FolderUp, PenLine, ClipboardList, MapPin, Download } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Ihr Gesamtfortschritt",
    body: "Hier sehen Sie auf einen Blick, wie weit Sie beim Onboarding sind. Es gibt drei Bereiche, die Sie nacheinander ausfüllen.",
  },
  {
    icon: Building2,
    title: "1 · Stammdaten ausfüllen",
    body: "Zuerst füllen Sie das Stammdaten-Formular aus mit den grundlegendsten Daten, die wir für die ZR sowie Ihre Verträge benötigen. Ihre Angaben befüllen automatisch die Verträge in Schritt 3.",
  },
  {
    icon: FolderUp,
    title: "2 · Dokumente hochladen",
    body: "Hier laden Sie ganz einfach benötigte Dokumente hoch. Der Upload-Manager zeigt Ihnen genau an, welche Dokumente gefordert werden – angepasst an Ihre Rechtsform.",
  },
  {
    icon: PenLine,
    title: "3 · Verträge signieren",
    body: "Erst wenn Schritt 1 & 2 erledigt sind, können Sie Ihre Verträge signieren und den Onboarding-Prozess abschließen!",
  },
  {
    icon: ClipboardList,
    title: "Die Checkliste",
    body: "Die Checkliste rechts zeigt Ihnen jederzeit Ihren Fortschritt an. Zur einfacheren Navigation können Sie auf die Punkte klicken und gelangen direkt dorthin, wo noch Daten fehlen.",
  },
  {
    icon: Download,
    title: "Checkliste herunterladen",
    body: "Über den Download-Button in der Checkliste erhalten Sie eine kompakte PDF, die Ihnen alles auf einen Blick nochmal aufzeigt.",
  },
  {
    icon: MapPin,
    title: "Bereits vorausgefüllt?",
    body: "Einige Felder können bereits von Ihrem unitex Servicepartner ausgefüllt worden sein – bitte prüfen Sie diese auf Richtigkeit, bevor Sie fortfahren.",
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
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i}
                className={["h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-border"].join(" ")}
              />
            ))}
          </div>
          <button onClick={dismiss} className="text-muted hover:text-foreground transition-colors" aria-label="Tour schließen">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{current.title}</h3>
            <p className="mt-2 text-sm text-secondary leading-relaxed">{current.body}</p>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-muted">{step + 1} / {STEPS.length}</span>
          <button onClick={next}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            {isLast ? "Los geht's!" : "Weiter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small floating button (bottom-left) to restart the tour */
export function TourRestartButton() {
  const { state, update } = useOnboarding();
  if (state.role === "admin") return null;

  return (
    <button
      onClick={() => update({ tourSeen: false })}
      title="Onboarding-Tour neu starten"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-secondary shadow-lg hover:border-primary hover:text-primary transition-colors"
    >
      <MapPin className="h-3.5 w-3.5" />
      Tour
    </button>
  );
}
