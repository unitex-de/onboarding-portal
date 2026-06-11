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

export interface CustomerAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  memberType: MemberType;
  legalForm: LegalForm;
  createdAt: string;
  magicLinkSent: boolean;
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
  /** Admin: list of all created customer accounts */
  customerAccounts: CustomerAccount[];
  /** Currently viewed customer ID (admin mode) */
  activeCustomerId: string | null;
  /** Has the user seen the onboarding tour? */
  tourSeen: boolean;
  /** Accountant is different from Geschäftsführer */
  buchungIdentischGF: boolean;
}

const STORAGE_KEY = "unitex_onboarding_state_v3";

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
  customerAccounts: [],
  activeCustomerId: null,
  tourSeen: false,
  buchungIdentischGF: true,
};

interface Ctx {
  state: OnboardingState;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: { name: string; size: number }) => void;
  removeDoc: (id: string) => void;
  completeSection: (id: string) => void;
  addCustomerAccount: (acc: Omit<CustomerAccount, "id" | "createdAt" | "magicLinkSent">) => CustomerAccount;
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
      addCustomerAccount: (acc) => {
        const newAcc: CustomerAccount = {
          ...acc,
          id: `cust_${Date.now()}`,
          createdAt: new Date().toISOString(),
          magicLinkSent: false,
        };
        setState((s) => ({
          ...s,
          customerAccounts: [...s.customerAccounts, newAcc],
        }));
        return newAcc;
      },
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

const SECTION_IDS_HAENDLER = ["grunddaten", "kontakt", "bankdaten", "gln_filialen", "geschaeftsdaten", "gwg_daten"];
const SECTION_IDS_LIEFERANT = ["grunddaten", "kontakt", "bankdaten", "lieferant_stamm"];

export function getSectionIds(memberType: MemberType | null): string[] {
  return memberType === "lieferant" ? SECTION_IDS_LIEFERANT : SECTION_IDS_HAENDLER;
}

export function getProgressBreakdown(state: OnboardingState): {
  stammdaten: number;
  uploads: number;
  signaturen: number;
  total: number;
} {
  const sectionIds = getSectionIds(state.memberType);
  const stammdatenDone = sectionIds.filter((id) => state.completedSections[id]).length;
  const stammdaten = Math.round((stammdatenDone / sectionIds.length) * 100);

  const requiredDocs = getRequiredDocIds(state.legalForm, state.memberType);
  const uploadsDone = requiredDocs.filter((id) => state.uploadedDocs[id]).length;
  const uploads = requiredDocs.length > 0 ? Math.round((uploadsDone / requiredDocs.length) * 100) : 0;

  const sigRequired = getRequiredSignatures(state);
  const sigDone = sigRequired.filter((id) => state.completedSections[`signed_${id}`]).length;
  const signaturen = Math.round((sigDone / sigRequired.length) * 100);

  const total = Math.round(stammdaten * 0.5 + uploads * 0.25 + signaturen * 0.25);

  return { stammdaten, uploads, signaturen, total };
}

export function getRequiredSignatures(state: OnboardingState): string[] {
  if (state.memberType === "lieferant") {
    return ["zr_vertrag", "gruen_vertrag", "sepa_gruen"];
  }
  const sigs = ["sepa", "anschluss"];
  if (state.hasSoliver) sigs.push("sonder");
  return sigs;
}

export function getChecklistProgress(state: OnboardingState): { done: number; total: number; pct: number } {
  const { total } = getProgressBreakdown(state);
  const allItems = CHECKLIST_GROUPS.flatMap((g) => g.items);
  const done = allItems.filter((i) => isChecklistItemDone(i, state)).length;
  return { done, total: allItems.length, pct: total };
}

// ---------------------------------------------------------------------------
// Required doc IDs per Rechtsform + MemberType
// ---------------------------------------------------------------------------
export function getRequiredDocIds(legalForm: LegalForm | null, memberType?: MemberType | null): string[] {
  // Lieferant: only HR-Auszug
  if (memberType === "lieferant") {
    return ["hr_auszug_lieferant"];
  }
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
// Checklist groups
// ---------------------------------------------------------------------------
export interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  source:
    | { kind: "upload"; docId: string }
    | { kind: "section"; sectionId: string }
    | { kind: "signature"; sigId: string };
  legalForms?: LegalForm[];
  onlySoliver?: boolean;
  memberTypes?: MemberType[];
}

export interface ChecklistGroup {
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Unternehmensdaten",
    items: [
      { id: "unternehmensinformationen", label: "Firmensitz", href: "/unternehmen#grunddaten", source: { kind: "section", sectionId: "grunddaten" } },
      { id: "kontaktinformationen",      label: "Kontaktinformationen",      href: "/unternehmen#kontakt",    source: { kind: "section", sectionId: "kontakt" } },
      { id: "bankdaten",                 label: "Ihre Bank- & Steuerdaten",                 href: "/unternehmen#bankdaten",  source: { kind: "section", sectionId: "bankdaten" } },
      { id: "gln_filialen",              label: "GLN & Filialen",            href: "/unternehmen#gln_filialen", source: { kind: "section", sectionId: "gln_filialen" }, memberTypes: ["händler"] },
      { id: "geschaeftsdaten",           label: "Geschäftszahlen",            href: "/unternehmen#geschaeftsdaten", source: { kind: "section", sectionId: "geschaeftsdaten" }, memberTypes: ["händler"] },
      { id: "gwg_daten",                 label: "Wirtschaftlich Berechtigte",                 href: "/unternehmen#gwg_daten",  source: { kind: "section", sectionId: "gwg_daten" }, memberTypes: ["händler"] },
      { id: "lieferant_stamm",           label: "Ihre Unternehmensdaten",    href: "/unternehmen#lieferant_stamm", source: { kind: "section", sectionId: "lieferant_stamm" }, memberTypes: ["lieferant"] },
    ],
  },
  {
    title: "Dokumenten-Uploads",
    items: [
      { id: "cl_ausweiskopie",       label: "Ausweiskopie",                             href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_gf" }, memberTypes: ["händler"] },
      { id: "cl_ausw_kommanditisten",label: "Ausweiskopie aller Kommanditisten",        href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_kommanditisten" }, legalForms: ["GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_gewerbeanmeldung",   label: "Gewerbe-Anmeldung",                        href: "/upload-center", source: { kind: "upload", docId: "gewerbeanmeldung" }, legalForms: ["eK", "GbR"], memberTypes: ["händler"] },
      { id: "cl_hr_auszug",          label: "Auszug Handels-Register",                  href: "/upload-center", source: { kind: "upload", docId: "hr_auszug" }, memberTypes: ["händler"] },
      { id: "cl_gesellschaft",       label: "Gesellschafterliste & Gesellschaftsvertrag", href: "/upload-center", source: { kind: "upload", docId: "gesellschafterliste" }, legalForms: ["GmbH", "GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_hr_lieferant",       label: "Handelsregister-Auszug",                   href: "/upload-center", source: { kind: "upload", docId: "hr_auszug_lieferant" }, memberTypes: ["lieferant"] },
    ],
  },
  {
    title: "Verträge & Signaturen",
    items: [
      // Händler
      { id: "cl_sepa",       label: "SEPA-Lastschriftmandat",          href: "/signaturen", source: { kind: "signature", sigId: "sepa" }, memberTypes: ["händler"] },
      { id: "cl_vertrag",    label: "Mitgliedsvertrag unitex",         href: "/signaturen", source: { kind: "signature", sigId: "anschluss" }, memberTypes: ["händler"] },
      { id: "cl_sonder",     label: "Schreiben Sonderkonditionen",     href: "/signaturen", source: { kind: "signature", sigId: "sonder" }, onlySoliver: true, memberTypes: ["händler"] },
      // Lieferant
      { id: "cl_zr_vertrag",    label: "ZR-Vertrag",                   href: "/signaturen", source: { kind: "signature", sigId: "zr_vertrag" }, memberTypes: ["lieferant"] },
      { id: "cl_gruen_vertrag", label: "Vertrag GRÜN raw",             href: "/signaturen", source: { kind: "signature", sigId: "gruen_vertrag" }, memberTypes: ["lieferant"] },
      { id: "cl_sepa_gruen",    label: "SEPA-Mandat GRÜN raw",         href: "/signaturen", source: { kind: "signature", sigId: "sepa_gruen" }, memberTypes: ["lieferant"] },
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

export function getVisibleItems(state: OnboardingState): ChecklistItem[] {
  return CHECKLIST_GROUPS.flatMap((g) => g.items).filter((item) => {
    if (item.onlySoliver && !state.hasSoliver) return false;
    if (item.legalForms && state.legalForm && !item.legalForms.includes(state.legalForm)) return false;
    if (item.memberTypes && state.memberType && !item.memberTypes.includes(state.memberType)) return false;
    return true;
  });
}
