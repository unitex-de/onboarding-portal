/**
 * CoachmarkTour – Spotlight-Coachmarks direkt auf Zielelemente.
 * Kein externe Library. Targets via data-tour="step-id".
 */
import {
  useState, useEffect, useCallback, useRef,
  type ReactNode, createContext, useContext,
} from "react";
import { X, ArrowRight, ArrowLeft, HelpCircle, MapPin } from "lucide-react";
import { createPortal } from "react-dom";
import { useOnboarding } from "@/lib/onboarding-state";

export interface TourStep {
  target: string | null;          // null = reines Modal (kein Spotlight)
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "bottom-left" | "bottom-right" | "center";
}

interface Rect { top: number; left: number; width: number; height: number; }

const PAD = 10;
const TOOLTIP_W = 320;
const TRANSITION_MS = 280;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
}

function scrollToTarget(target: string) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function calcTooltipPos(rect: Rect | null, placement: TourStep["placement"] = "bottom") {
  const vw = window.innerWidth;
  const w = Math.min(TOOLTIP_W, vw - 32);

  if (!rect || placement === "center") {
    return { top: window.innerHeight / 2 + window.scrollY, left: vw / 2 - w / 2, w, centered: true };
  }

  const clampL = (l: number) => Math.max(16, Math.min(l, vw - w - 16));

  switch (placement) {
    case "top":
      return { top: rect.top - PAD - 16, left: clampL(rect.left + rect.width / 2 - w / 2), w, centered: false };
    case "left":
      return { top: rect.top + rect.height / 2, left: Math.max(16, rect.left - w - PAD - 16), w, centered: false };
    case "right":
      return { top: rect.top + rect.height / 2, left: rect.left + rect.width + PAD + 16, w, centered: false };
    case "bottom-left":
      return { top: rect.top + rect.height + PAD + 16, left: clampL(rect.left), w, centered: false };
    case "bottom-right":
      return { top: rect.top + rect.height + PAD + 16, left: clampL(rect.left + rect.width - w), w, centered: false };
    default: // bottom
      return { top: rect.top + rect.height + PAD + 16, left: clampL(rect.left + rect.width / 2 - w / 2), w, centered: false };
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface TourCtx { start: () => void; isRunning: boolean; }
const TourContext = createContext<TourCtx>({ start: () => {}, isRunning: false });
export function useTour() { return useContext(TourContext); }

// ─── Main component ────────────────────────────────────────────────────────────
export function CoachmarkTour({ steps, children }: { steps: TourStep[]; children?: ReactNode }) {
  const { update } = useOnboarding();
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Smooth transition: fade between steps
  const [visible, setVisible] = useState(true);
  const transRef = useRef(false);

  const currentStep = steps[stepIdx];

  const measure = useCallback(() => {
    if (!currentStep?.target) { setRect(null); return; }
    setRect(getTargetRect(currentStep.target));
  }, [currentStep]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  // On step change: fade out → scroll → measure → fade in
  useEffect(() => {
    if (!active || !currentStep) return;
    if (transRef.current) return;
    transRef.current = true;
    setVisible(false);
    const t = setTimeout(() => {
      if (currentStep.target) scrollToTarget(currentStep.target);
      setTimeout(() => {
        measure();
        setVisible(true);
        transRef.current = false;
      }, 200);
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [stepIdx, active]); // eslint-disable-line

  const start = useCallback(() => { setStepIdx(0); setActive(true); setVisible(false); }, []);
  const dismiss = useCallback(() => { setActive(false); update({ tourSeen: true }); }, [update]);

  const goTo = useCallback((idx: number) => {
    if (transRef.current) return;
    setStepIdx(idx);
  }, []);

  const next = useCallback(() => {
    if (stepIdx < steps.length - 1) goTo(stepIdx + 1);
    else dismiss();
  }, [stepIdx, steps.length, goTo, dismiss]);

  const prev = useCallback(() => { if (stepIdx > 0) goTo(stepIdx - 1); }, [stepIdx, goTo]);

  const pos = calcTooltipPos(rect, currentStep?.placement);

  return (
    <TourContext.Provider value={{ start, isRunning: active }}>
      {children}
      {active && createPortal(
        <>
          {/* SVG overlay: spotlight cutout */}
          <svg
            className="fixed inset-0 pointer-events-none z-[9998]"
            style={{ width: "100vw", height: "100vh", transition: `opacity ${TRANSITION_MS}ms`, opacity: visible ? 1 : 0 }}
          >
            <defs>
              <mask id="cm-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={rect.left - PAD} y={rect.top - PAD}
                    width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                    rx="10" fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cm-mask)" />
            {rect && (
              <rect
                x={rect.left - PAD} y={rect.top - PAD}
                width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                rx="10" fill="none"
                stroke="var(--primary)" strokeWidth="2.5" strokeDasharray="8 4"
                style={{ animation: "cm-dash 1.2s linear infinite" }}
              />
            )}
          </svg>

          {/* Click backdrop to dismiss */}
          <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: "all" }} onClick={dismiss} />

          {/* Tooltip card */}
          <div
            className="fixed z-[9999] rounded-2xl border border-primary/40 bg-card shadow-2xl overflow-hidden"
            style={{
              width: pos.w,
              top: pos.top,
              left: pos.left,
              transform: pos.centered ? "translate(-50%, -50%)" : "translateY(-50%)",
              transition: `opacity ${TRANSITION_MS}ms, transform ${TRANSITION_MS}ms`,
              opacity: visible ? 1 : 0,
              pointerEvents: "all",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dots */}
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={[
                      "rounded-full transition-all duration-300",
                      i === stepIdx ? "w-5 h-1.5 bg-primary" : i < stepIdx ? "w-2 h-1.5 bg-primary/40" : "w-2 h-1.5 bg-border",
                    ].join(" ")}
                    aria-label={`Schritt ${i + 1}`}
                  />
                ))}
              </div>
              <button onClick={dismiss} className="text-muted hover:text-foreground transition-colors" title="Tour beenden">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-2">
              <p className="font-display text-base font-semibold text-foreground">{currentStep?.title}</p>
              <p className="text-sm text-secondary leading-relaxed">{currentStep?.body}</p>
            </div>

            <div className="border-t border-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{stepIdx + 1} / {steps.length}</span>
                <button onClick={dismiss} className="text-xs text-muted hover:text-secondary underline underline-offset-2">
                  Überspringen
                </button>
              </div>
              <div className="flex items-center gap-2">
                {stepIdx > 0 && (
                  <button onClick={prev} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-secondary hover:text-foreground hover:border-primary/60 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Zurück
                  </button>
                )}
                <button onClick={next} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  {stepIdx === steps.length - 1 ? "Fertig" : "Weiter"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Dashed-border animation keyframes */}
          <style>{`
            @keyframes cm-dash {
              to { stroke-dashoffset: -24; }
            }
          `}</style>
        </>,
        document.body
      )}
    </TourContext.Provider>
  );
}

// ─── Floating "Tour starten" trigger ──────────────────────────────────────────
export function TourStartButton() {
  const { start, isRunning } = useTour();
  const { state } = useOnboarding();
  if (state.role === "admin" || isRunning) return null;
  return (
    <div className="fixed bottom-20 left-6 z-40">
      <button
        onClick={start}
        className="inline-flex items-center gap-2 rounded-full bg-card border border-border shadow-lg px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground hover:border-primary/60 transition-all hover:shadow-xl"
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        Tour starten
      </button>
    </div>
  );
}
