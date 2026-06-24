import type { ReactNode, ChangeEvent } from "react";
import { useState, useCallback, useRef, useLayoutEffect, createContext, useContext } from "react";
import { Check, Save, AlertCircle } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import {
  MASK_CONFIG,
  contentCountBefore,
  cursorFromContent,
  type MaskType,
} from "@/lib/input-masks";

// ─── FormSection Error Context ─────────────────────────────────────────────────
// Provides showErrors to child inputs so they can highlight empty required fields
interface FormSectionCtxValue { showErrors: boolean; }
const FormSectionCtx = createContext<FormSectionCtxValue>({ showErrors: false });
export function useFormSectionErrors() { return useContext(FormSectionCtx); }

export function FormSection({
  id,
  letter,
  title,
  description,
  onSave,
  validate,
  children,
}: {
  id: string;
  letter: string;
  title: string;
  description?: string;
  onSave?: () => void;
  /** Optional: return error string if invalid, null if valid */
  validate?: () => string | null;
  children: ReactNode;
}) {
  const { state, update } = useOnboarding();
  const saved = !!state.completedSections[id];
  const [justSaved, setJustSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    // DOM-level check: find all [required] inputs/selects/textareas in this section
    const section = document.getElementById(id);
    const requiredEls = section?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input[required], select[required], textarea[required]"
    );
    const hasEmptyRequired = Array.from(requiredEls ?? []).some((el) => !el.value.trim());

    // Custom validation (e.g. pills selection)
    const customError = validate?.();

    if (hasEmptyRequired || customError) {
      setShowErrors(true);
      setErrorMsg(customError ?? "Bitte fülle erst alle Pflichtfelder aus.");
      return;
    }

    // All good – save
    setShowErrors(false);
    setErrorMsg(null);
    update({ completedSections: { ...state.completedSections, [id]: true } });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    onSave?.();
  };

  return (
    <FormSectionCtx.Provider value={{ showErrors }}>
      <section
        id={id}
        className={[
          "rounded-2xl border bg-card p-4 sm:p-8 transition-all duration-300",
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

        {showErrors && errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          {justSaved && (
            <span className="inline-flex items-center justify-center gap-1.5 text-xs text-success animate-in fade-in slide-in-from-right-2">
              <Check className="h-3.5 w-3.5" /> Gespeichert
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 sm:py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </section>
    </FormSectionCtx.Provider>
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
 * AutoSaveInput – shows green border on blur if changed, red border when
 * FormSection showErrors is true and the field is required and empty.
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
  const isFilled = value.trim() !== "";
  const { showErrors } = useFormSectionErrors();
  const hasError = showErrors && (props.required ?? false) && !isFilled;

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
        hasError
          ? "border-destructive/60 ring-1 ring-destructive/20"
          : savedFlash
          ? "border-success ring-1 ring-success/40 transition-all duration-300"
          : isFilled
          ? "border-success/60"
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
  const isFilled = value.trim() !== "";
  const { showErrors } = useFormSectionErrors();
  const hasError = showErrors && (props.required ?? false) && !isFilled;

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
        hasError
          ? 'border-destructive/60 ring-1 ring-destructive/20'
          : savedFlash
          ? 'border-success ring-1 ring-success/40 transition-all duration-300'
          : isFilled
          ? 'border-success/60'
          : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
