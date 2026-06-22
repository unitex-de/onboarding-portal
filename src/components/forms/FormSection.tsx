import type { ReactNode, ChangeEvent } from "react";
import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { Check, Save } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import {
  MASK_CONFIG,
  contentCountBefore,
  cursorFromContent,
  type MaskType,
} from "@/lib/input-masks";

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
    <section
      id={id}
      className={[
        "rounded-2xl border bg-card p-8 transition-all duration-300",
        justSaved ? "border-success ring-1 ring-success/40" : "border-border",
      ].join(" ")}
    >
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

/**
 * AutoSaveInput – Input that shows green border flash on blur if value changed.
 */
export function AutoSaveInput({
  value,
  onChange,
  onBlur,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [lastSaved, setLastSaved] = useState(value);

  const handleBlur = useCallback(() => {
    if (value !== lastSaved && value.trim() !== "") {
      setSavedFlash(true);
      setLastSaved(value);
      onBlur?.();
      setTimeout(() => setSavedFlash(false), 1800);
    } else {
      onBlur?.();
    }
  }, [value, lastSaved, onBlur]);

  return (
    <input
      value={value}
      onChange={onChange}
      onBlur={handleBlur}
      className={[
        inputClass,
        savedFlash
          ? "border-success ring-1 ring-success/40 transition-all duration-300"
          : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export const inputClass =
  "w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

/**
 * MaskedInput – live-formats mobile, landline, and IBAN during input.
 * Cursor position is preserved across formatting insertions/deletions.
 */
export function MaskedInput({
  value,
  onChange,
  onBlur,
  mask,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  mask: MaskType;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursor = useRef<number | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [lastSaved, setLastSaved] = useState(value);

  const { format, isContent } = MASK_CONFIG[mask];

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const pos = e.target.selectionStart ?? raw.length;
      const formatted = format(raw);
      const n = contentCountBefore(raw, pos, isContent);
      pendingCursor.current = cursorFromContent(formatted, n, isContent);

      const fake = { target: { value: formatted } } as ChangeEvent<HTMLInputElement>;
      onChange(fake);
    },
    [format, isContent, onChange],
  );

  // Set cursor synchronously after React flushes the DOM update.
  useLayoutEffect(() => {
    if (pendingCursor.current !== null && inputRef.current) {
      const p = pendingCursor.current;
      pendingCursor.current = null;
      inputRef.current.setSelectionRange(p, p);
    }
  });

  const handleBlur = useCallback(() => {
    if (value !== lastSaved && value.trim() !== '') {
      setSavedFlash(true);
      setLastSaved(value);
      onBlur?.();
      setTimeout(() => setSavedFlash(false), 1800);
    } else {
      onBlur?.();
    }
  }, [value, lastSaved, onBlur]);

  return (
    <input
      ref={inputRef}
      value={format(value)}
      onChange={handleChange}
      onBlur={handleBlur}
      className={[
        inputClass,
        savedFlash ? 'border-success ring-1 ring-success/40 transition-all duration-300' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
