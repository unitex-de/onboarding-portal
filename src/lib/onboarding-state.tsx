import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberType = "händler" | "lieferant";
export type LegalForm = "eK" | "GbR" | "GmbH" | "GmbHCoKG" | "KG" | "OHG";
export type ContractType = "probe" | "3jahre" | "5jahre";

export interface OnboardingState {
  email: string | null;
  signedIn: boolean;
  userName: string;
  companyName: string;
  memberType: MemberType | null;
  legalForm: LegalForm | null;
  contractType: ContractType | null;
  checklist: Record<string, boolean>;
  submittedAt: string | null;
}

const STORAGE_KEY = "unitex_onboarding_state_v1";

const DEFAULT_STATE: OnboardingState = {
  email: null,
  signedIn: false,
  userName: "Max Mustermensch",
  companyName: "Beispiel GmbH",
  memberType: "händler",
  legalForm: "GmbH",
  contractType: null,
  checklist: {
    ausweiskopie: true,
    hr_auszug: true,
    gesellschaftsvertrag: false,
    gesellschafterliste: false,
    steuernummer: true,
    sepa_mandat: true,
    neukundenformular: false,
    gwg_bogen: false,
  },
  submittedAt: null,
};

interface Ctx {
  state: OnboardingState;
  update: (p: Partial<OnboardingState>) => void;
  toggleChecklist: (id: string) => void;
  reset: () => void;
}

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      update: (p) => setState((s) => ({ ...s, ...p })),
      toggleChecklist: (id) =>
        setState((s) => ({ ...s, checklist: { ...s.checklist, [id]: !s.checklist[id] } })),
      reset: () => setState(DEFAULT_STATE),
    }),
    [state],
  );

  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export function calcZrStartDate(from: Date = new Date()): Date {
  // Today + 10 business days
  const d = new Date(from);
  let added = 0;
  while (added < 10) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function formatDateDe(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}