/**
 * CoachmarkTour – zeigt einen echten Spotlight-Coachmark direkt auf dem Zielelement.
 * Kein externe Library, kein AGPL. Funktioniert via data-tour="step-id" Attribute.
 *
 * Verwendung:
 *   1. Zielelement: <div data-tour="progress-ring"> ... </div>
 *   2. Im Dashboard: <CoachmarkTour steps={TOUR_STEPS} />
 *   3. Trigger-Button: <TourStartButton />
 */

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { X, ArrowRight, ArrowLeft, HelpCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useOnboarding } from "@/lib/onboarding-state";

export interface TourStep {
  /** Muss mit dem data-tour="..." Attribut übereinstimmen */
  target: string;
  title: string;
  body: string;
  /** Wo der Tooltip erscheint, relativ zum Zielelement */
  placement?: "top" | "bottom" | "left" | "right" | "bottom-left" | "bottom-right";
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10; // padding um das highlighted Element

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top + window.scrollY,
    left: r.left + window.scrollX,
    width: r.width,
    height: r.height,
  };
}

function scrollToTarget(target: string) {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

interface TooltipStyle {
  top: number;
  left: number;
  maxWidth: number;
}

function calcTooltipStyle(
  rect: Rect,
  placement: TourStep["placement"] = "bottom"
): TooltipStyle {
  const vw = window.innerWidth;
  const tooltipW = Math.min(320, vw - 32);

  switch (placement) {
    case "top":
      return {
        top: rect.top - PAD - 8, // 8 for tooltip height estimate, adjusted after render
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16)),
        maxWidth: tooltipW,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: Math.max(16, rect.left - tooltipW - PAD - 16),
        maxWidth: tooltipW,
      };
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + PAD + 16,
        maxWidth: tooltipW,
      };
    case "bottom-left":
      return {
        top: rect.top + rect.height + PAD + 16,
        left: Math.max(16, rect.left),
        maxWidth: tooltipW,
      };
    case "bottom-right":
      return {
        top: rect.top + rect.height + PAD + 16,
        left: Math.max(16, rect.left + rect.width - tooltipW),
        maxWidth: tooltipW,
      };
    case "bottom":
    default:
      return {
        top: rect.top + rect.height + PAD + 16,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipW / 2, vw - tooltipW - 16)),
        maxWidth: tooltipW,
      };
  }
}

// ---------------------------------------------------------------------------
// Context so TourStartButton auf der Seite die Tour starten kann
// ---------------------------------------------------------------------------
import { createContext, useContext } from "react";

interface TourCtx {
  start: () => void;
  isRunning: boolean;
}
const TourContext = createContext<TourCtx>({ start: () => {}, isRunning: false });
export function useTour() { return useContext(TourContext); }

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------
export function CoachmarkTour({
  steps,
  children,
}: {
  steps: TourStep[];
  children?: ReactNode;
}) {
  const { state, update } = useOnboarding();
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const currentStep = steps[stepIdx];

  const measureTarget = useCallback(() => {
    if (!currentStep) return;
    const r = getTargetRect(currentStep.target);
    setRect(r);
  }, [currentStep]);

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [active, measureTarget]);

  // Measure + scroll on step change
  useEffect(() => {
    if (!active || !currentStep) return;
    scrollToTarget(currentStep.target);
    // Small delay so scroll settles
    const t = setTimeout(measureTarget, 350);
    return () => clearTimeout(t);
  }, [active, stepIdx, currentStep, measureTarget]);

  const start = useCallback(() => {
    setStepIdx(0);
    setActive(true);
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    update({ tourSeen: true });
  }, [update]);

  const next = useCallback(() => {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
    else dismiss();
  }, [stepIdx, steps.length, dismiss]);

  const prev = useCallback(() => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }, [stepIdx]);

  const tooltipStyle = rect ? calcTooltipStyle(rect, currentStep?.placement) : null;

  return (
    <TourContext.Provider value={{ start, isRunning: active }}>
      {children}

      {active && createPortal(
        <>
          {/* Dark overlay mit Spotlight-Ausschnitt via clip-path / SVG */}
          {rect && (
            <svg
              className="fixed inset-0 z-[9998] pointer-events-none"
              style={{ width: "100vw", height: "100vh" }}
            >
              <defs>
                <mask id="spotlight-mask">
                  {/* Weiß = sichtbar, Schwarz = abgedunkelt */}
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.left - PAD}
                    y={rect.top - PAD}
                    width={rect.width + PAD * 2}
                    height={rect.height + PAD * 2}
                    rx="10"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.65)"
                mask="url(#spotlight-mask)"
              />
              {/* Highlight-Rahmen um das Zielelement */}
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx="10"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeDasharray="6 3"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* Click outside to dismiss */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={dismiss}
            style={{ pointerEvents: "all" }}
          />

          {/* Tooltip */}
          {tooltipStyle && currentStep && (
            <div
              className="fixed z-[9999] rounded-2xl border border-primary/40 bg-card shadow-2xl overflow-hidden"
              style={{
                top: tooltipStyle.top,
                left: tooltipStyle.left,
                width: tooltipStyle.maxWidth,
                transform: "translateY(-50%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-0">
                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={[
                        "rounded-full transition-all duration-300",
                        i === stepIdx
                          ? "w-5 h-1.5 bg-primary"
                          : i < stepIdx
                          ? "w-2 h-1.5 bg-primary/40"
                          : "w-2 h-1.5 bg-border",
                      ].join(" ")}
                    />
                  ))}
                </div>
                <button
                  onClick={dismiss}
                  className="text-muted hover:text-foreground transition-colors"
                  title="Tour beenden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-2">
                <p className="font-display text-base font-semibold text-foreground">
                  {currentStep.title}
                </p>
                <p className="text-sm text-secondary leading-relaxed">
                  {currentStep.body}
                </p>
              </div>

              {/* Footer */}
              <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {stepIdx + 1} / {steps.length}
                  </span>
                  <button
                    onClick={dismiss}
                    className="text-xs text-muted hover:text-secondary underline underline-offset-2 transition-colors"
                  >
                    Überspringen
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {stepIdx > 0 && (
                    <button
                      onClick={prev}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-secondary hover:text-foreground hover:border-primary/60 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Zurück
                    </button>
                  )}
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {stepIdx === steps.length - 1 ? "Fertig" : "Weiter"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </TourContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Floating "Tour starten" Button – benutzt TourContext
// ---------------------------------------------------------------------------
export function TourStartButton() {
  const { start, isRunning } = useTour();
  const { state } = useOnboarding();

  if (state.role === "admin" || isRunning) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
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
