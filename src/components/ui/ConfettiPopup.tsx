import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { X } from "lucide-react";

interface ConfettiPopupProps {
  title: string;
  message?: string;
  buttonLabel?: string;
  intense?: boolean;
  onClose: () => void;
}

export function ConfettiPopup({
  title,
  message,
  buttonLabel = "Weiter",
  intense = false,
  onClose,
}: ConfettiPopupProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fire = () => {
      if (intense) {
        // Multiple bursts from different origins
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.5 }, colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] });
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.5 }, colors: ["#FACBBA", "#10b981", "#f59e0b", "#8b5cf6"] });
      } else {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { x: Math.random() * 0.6 + 0.2, y: 0.55 },
          colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
        });
      }
    };
    fire();
    intervalRef.current = setInterval(fire, intense ? 500 : 700);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      confetti.reset();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-5xl mb-4">🎉</div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {title}
        </h2>

        {message && (
          <p className="text-sm text-secondary mb-6 leading-relaxed">{message}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
