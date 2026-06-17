import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Save } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";

export function FormSection({
  id,
  letter,
  title,
  description,
  onSave,
  children,
}: {
  id: string;
  letter: string;
  title: string;
  description?: string;
  /** Wenn übergeben, wird dieser Handler beim Speichern zusätzlich aufgerufen. */
  onSave?: () => void;
  children: ReactNode;
}) {
  const { state, update } = useOnboarding();
  const saved = !!state.completedSections[id];
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    update({ completedSections: { ...state.completedSections, [id]: true } });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    onSave?.();
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-8">
      <header className="flex items-start justify-between gap-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-popover font-display text-sm font-semibold text-primary">
            {letter}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
          </div>
        </div>
        {saved && !justSaved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5" /> Gespeichert
          </span>
        )}
      </header>

      <div className="space-y-4">{children}</div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {justSaved && (
          <span className="inline-flex items-center gap-1.5 text-xs text-success animate-in fade-in slide-in-from-right-2">
            <Check className="h-3.5 w-3.5" /> Gespeichert
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
      </div>
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
  required,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={["block space-y-1.5", className].filter(Boolean).join(" ")}>
      <span className="block text-xs font-medium uppercase tracking-wide text-secondary">
        {label}
        {required !== false && (
          <span className="ml-0.5 text-primary" aria-hidden="true"> *</span>
        )}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
