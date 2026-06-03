import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberType = "händler" | "lieferant";
export type LegalForm = "eK" | "GbR" | "GmbH" | "GmbHCoKG" | "KG" | "OHG";
export type ContractType = "probe" | "3jahre" | "5jahre";

export interface UploadedDoc {
  fileName: string;
  size: number;
  uploadedAt: string;
}

export interface OnboardingState {
  email: string | null;
  signedIn: boolean;
  userName: string;
  companyName: string;
  memberType: MemberType | null;
  legalForm: LegalForm | null;
  contractType: ContractType | null;
  /** System-driven map: docId -> uploaded file metadata. Empty = nicht hochgeladen. */
  uploadedDocs: Record<string, UploadedDoc>;
  /** Mark form sections as completed (system-driven via "Speichern"). */
  completedSections: Record<string, boolean>;
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
  uploadedDocs: {
    ausweiskopie_gf: {
      fileName: "ausweis_mueller.pdf",
      size: 340_000,
      uploadedAt: new Date().toISOString(),
    },
    hr_auszug: {
      fileName: "hr_auszug.pdf",
      size: 1_200_000,
      uploadedAt: new Date().toISOString(),
    },
  },
  completedSections: {
    steuernummer: true,
    sepa_mandat: true,
  },
  submittedAt: null,
};

interface Ctx {
  state: OnboardingState;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: { name: string; size: number }) => void;
  removeDoc: (id: string) => void;
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
      uploadDoc: (id, file) =>
        setState((s) => ({
          ...s,
          uploadedDocs: {
            ...s.uploadedDocs,
            [id]: {
              fileName: file.name,
              size: file.size,
              uploadedAt: new Date().toISOString(),
            },
          },
        })),
      removeDoc: (id) =>
        setState((s) => {
          const next = { ...s.uploadedDocs };
          delete next[id];
          return { ...s, uploadedDocs: next };
        }),
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

// ---------------------------------------------------------------------------
// Checklist – system-driven, read-only for the user.
// ---------------------------------------------------------------------------

export type ChecklistSource =
  | { kind: "upload"; docId: string }
  | { kind: "section"; sectionId: string };

export interface ChecklistItem {
  id: string;
  label: string;
  source: ChecklistSource;
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Identifikation",
    items: [
      { id: "ausweiskopie", label: "Ausweiskopie", source: { kind: "upload", docId: "ausweiskopie_gf" } },
      { id: "hr_auszug", label: "Auszug Handelsregister", source: { kind: "upload", docId: "hr_auszug" } },
      { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag", source: { kind: "upload", docId: "gesellschaftsvertrag" } },
      { id: "gesellschafterliste", label: "Gesellschafterliste", source: { kind: "upload", docId: "gesellschafterliste" } },
    ],
  },
  {
    title: "Finanzen",
    items: [
      { id: "steuernummer", label: "Steuernummer", source: { kind: "section", sectionId: "steuernummer" } },
      { id: "sepa_mandat", label: "SEPA Mandat", source: { kind: "section", sectionId: "sepa_mandat" } },
    ],
  },
  {
    title: "Formulare",
    items: [
      { id: "neukundenformular", label: "Neukundenformular", source: { kind: "section", sectionId: "neukundenformular" } },
      { id: "gwg_bogen", label: "GWG Bogen (falls vorhanden)", source: { kind: "upload", docId: "gwg_bogen" } },
    ],
  },
];

export function isChecklistItemDone(item: ChecklistItem, state: OnboardingState): boolean {
  if (item.source.kind === "upload") return !!state.uploadedDocs[item.source.docId];
  return !!state.completedSections[item.source.sectionId];
}

export function getChecklistProgress(state: OnboardingState): { done: number; total: number; pct: number } {
  const all = CHECKLIST_GROUPS.flatMap((g) => g.items);
  const done = all.filter((i) => isChecklistItemDone(i, state)).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}