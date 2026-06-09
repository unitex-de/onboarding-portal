import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberType = "händler" | "lieferant";
export type LegalForm = "eK" | "GbR" | "GmbH" | "GmbHCoKG" | "KG" | "OHG";
export type ContractType = "probe" | "3jahre" | "5jahre";
export type UserRole = "admin" | "kunde";

export interface UploadedDoc {
  fileName: string;
  size: number;
  uploadedAt: string;
}

export interface OnboardingState {
  email: string | null;
  signedIn: boolean;
  role: UserRole;
  userName: string;
  companyName: string;
  memberType: MemberType | null;
  /** Set by Admin on creation – cannot be changed by Kunde afterwards */
  legalForm: LegalForm | null;
  legalFormLockedByAdmin: boolean;
  contractType: ContractType | null;
  /** s.Oliver / Comma / Isco cooperation → triggers Sonderformular */
  hasSoliver: boolean;
  uploadedDocs: Record<string, UploadedDoc>;
  /** Form sections completed via "Speichern" */
  completedSections: Record<string, boolean>;
  submittedAt: string | null;
}

const STORAGE_KEY = "unitex_onboarding_state_v2";

const DEFAULT_STATE: OnboardingState = {
  email: null,
  signedIn: false,
  role: "kunde",
  userName: "Max Mustermensch",
  companyName: "Beispiel GmbH",
  memberType: "händler",
  legalForm: "GmbH",
  legalFormLockedByAdmin: false,
  contractType: null,
  hasSoliver: false,
  uploadedDocs: {},
  completedSections: {},
  submittedAt: null,
};

interface Ctx {
  state: OnboardingState;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: { name: string; size: number }) => void;
  removeDoc: (id: string) => void;
  completeSection: (id: string) => void;
  reset: () => void;
}

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
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
            [id]: { fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() },
          },
        })),
      removeDoc: (id) =>
        setState((s) => {
          const next = { ...s.uploadedDocs };
          delete next[id];
          return { ...s, uploadedDocs: next };
        }),
      completeSection: (id) =>
        setState((s) => ({
          ...s,
          completedSections: { ...s.completedSections, [id]: true },
        })),
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

// ---------------------------------------------------------------------------
// ZR-Start: today + 10 Werktage → nächster 1. des Monats
// ---------------------------------------------------------------------------
export function calcZrStartDate(from: Date = new Date()): Date {
  const d = new Date(from);
  let added = 0;
  while (added < 10) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  // Advance to next 1st of month
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function formatDateDe(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Progress calculation: 50% Stammdaten + 25% Uploads + 25% Signaturen
// ---------------------------------------------------------------------------

const SECTION_IDS = ["grunddaten", "kontakt", "bankdaten", "gln_filialen", "geschaeftsdaten", "gwg_daten"];

export function getProgressBreakdown(state: OnboardingState): {
  stammdaten: number; // 0-100
  uploads: number;    // 0-100
  signaturen: number; // 0-100
  total: number;      // 0-100 weighted
} {
  // Stammdaten: 6 sections, each section = 1 point
  const stammdatenDone = SECTION_IDS.filter((id) => state.completedSections[id]).length;
  const stammdaten = Math.round((stammdatenDone / SECTION_IDS.length) * 100);

  // Uploads: required docs for this legalForm
  const requiredDocs = getRequiredDocIds(state.legalForm);
  const uploadsDone = requiredDocs.filter((id) => state.uploadedDocs[id]).length;
  const uploads = requiredDocs.length > 0 ? Math.round((uploadsDone / requiredDocs.length) * 100) : 0;

  // Signaturen: SEPA + Mitgliedsvertrag + (optional Sonderformular)
  const sigRequired = ["sepa", "anschluss"];
  if (state.hasSoliver) sigRequired.push("sonder");
  const sigDone = sigRequired.filter((id) => state.completedSections[`signed_${id}`]).length;
  const signaturen = Math.round((sigDone / sigRequired.length) * 100);

  // Weighted total: 50% + 25% + 25%
  const total = Math.round(stammdaten * 0.5 + uploads * 0.25 + signaturen * 0.25);

  return { stammdaten, uploads, signaturen, total };
}

// Returns total % for legacy callers
export function getChecklistProgress(state: OnboardingState): { done: number; total: number; pct: number } {
  const { total } = getProgressBreakdown(state);
  // Approximate done/total for display
  const allItems = CHECKLIST_GROUPS.flatMap((g) => g.items);
  const done = allItems.filter((i) => isChecklistItemDone(i, state)).length;
  return { done, total: allItems.length, pct: total };
}

// ---------------------------------------------------------------------------
// Required doc IDs per Rechtsform
// ---------------------------------------------------------------------------
export function getRequiredDocIds(legalForm: LegalForm | null): string[] {
  switch (legalForm) {
    case "eK":
      return ["ausweiskopie_gf", "gewerbeanmeldung"];
    case "GbR":
      return ["ausweiskopie_gf", "gewerbeanmeldung"];
    case "GmbH":
      return ["ausweiskopie_gf", "hr_auszug", "gesellschafterliste", "gesellschaftsvertrag"];
    case "GmbHCoKG":
      return ["ausweiskopie_gf", "ausweiskopie_kommanditisten", "hr_auszug", "gesellschafterliste", "gesellschaftsvertrag"];
    case "KG":
      return ["ausweiskopie_gf", "ausweiskopie_kommanditisten", "hr_auszug", "gesellschafterliste", "gesellschaftsvertrag"];
    case "OHG":
      return ["ausweiskopie_gf", "ausweiskopie_kommanditisten", "hr_auszug", "gesellschafterliste", "gesellschaftsvertrag"];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Checklist groups – with anchor links
// ---------------------------------------------------------------------------
export interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  source:
    | { kind: "upload"; docId: string }
    | { kind: "section"; sectionId: string }
    | { kind: "signature"; sigId: string };
  /** Only show for certain Rechtsformen */
  legalForms?: LegalForm[];
  /** Only show when hasSoliver = true */
  onlySoliver?: boolean;
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Unternehmens- & Stammdaten",
    items: [
      { id: "unternehmensinformationen", label: "Unternehmensinformationen", href: "/unternehmen#grunddaten", source: { kind: "section", sectionId: "grunddaten" } },
      { id: "kontaktinformationen",      label: "Kontaktinformationen",      href: "/unternehmen#kontakt",    source: { kind: "section", sectionId: "kontakt" } },
      { id: "bankdaten",                 label: "Bankdaten",                 href: "/unternehmen#bankdaten",  source: { kind: "section", sectionId: "bankdaten" } },
      { id: "gln_filialen",              label: "GLN & Filialen",            href: "/unternehmen#gln_filialen", source: { kind: "section", sectionId: "gln_filialen" } },
      { id: "geschaeftsdaten",           label: "Geschäftsdaten",            href: "/unternehmen#geschaeftsdaten", source: { kind: "section", sectionId: "geschaeftsdaten" } },
      { id: "gwg_daten",                 label: "GWG Daten",                 href: "/unternehmen#gwg_daten",  source: { kind: "section", sectionId: "gwg_daten" } },
    ],
  },
  {
    title: "Dokumenten-Uploads",
    items: [
      { id: "cl_ausweiskopie",       label: "Ausweiskopie",                             href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_gf" } },
      { id: "cl_ausw_kommanditisten",label: "Ausweiskopie aller Kommanditisten",        href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_kommanditisten" }, legalForms: ["GmbHCoKG", "KG", "OHG"] },
      { id: "cl_gewerbeanmeldung",   label: "Gewerbe-Anmeldung",                        href: "/upload-center", source: { kind: "upload", docId: "gewerbeanmeldung" }, legalForms: ["eK", "GbR"] },
      { id: "cl_hr_auszug",          label: "Auszug Handels-Register",                  href: "/upload-center", source: { kind: "upload", docId: "hr_auszug" } },
      { id: "cl_gesellschaft",       label: "Gesellschafterliste & Gesellschaftsvertrag", href: "/upload-center", source: { kind: "upload", docId: "gesellschafterliste" }, legalForms: ["GmbH", "GmbHCoKG", "KG", "OHG"] },
      { id: "cl_jur_person",         label: "Unterlagen jur. Person als Gesellschafter", href: "/upload-center", source: { kind: "upload", docId: "jur_person_unterlagen" }, legalForms: ["GmbH", "GmbHCoKG"] },
    ],
  },
  {
    title: "Signaturen",
    items: [
      { id: "cl_sepa",    label: "SEPA-Lastschriftmandat",         href: "/signaturen", source: { kind: "signature", sigId: "sepa" } },
      { id: "cl_vertrag", label: "Mitgliedsvertrag unitex",        href: "/signaturen", source: { kind: "signature", sigId: "anschluss" } },
      { id: "cl_sonder",  label: "Schreiben mit Sonderkonditionen", href: "/signaturen", source: { kind: "signature", sigId: "sonder" }, onlySoliver: true },
    ],
  },
];

export function isChecklistItemDone(item: ChecklistItem, state: OnboardingState): boolean {
  const { source } = item;
  if (source.kind === "upload") return !!state.uploadedDocs[source.docId];
  if (source.kind === "section") return !!state.completedSections[source.sectionId];
  if (source.kind === "signature") return !!state.completedSections[`signed_${source.sigId}`];
  return false;
}

/** Filter checklist items visible for the current state */
export function getVisibleItems(state: OnboardingState): ChecklistItem[] {
  return CHECKLIST_GROUPS.flatMap((g) => g.items).filter((item) => {
    if (item.onlySoliver && !state.hasSoliver) return false;
    if (item.legalForms && state.legalForm && !item.legalForms.includes(state.legalForm)) return false;
    return true;
  });
}
