import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberType = "händler" | "lieferant";
export type LegalForm = "eK" | "GbR" | "GmbH" | "GmbHCoKG" | "KG" | "OHG";
export type ContractType = "probe" | "3jahre" | "5jahre";
export type UserRole = "admin" | "kunde";
export type CustomerStatus = "Entwurf" | "Link gesendet" | "Signiert";

export interface UploadedDoc {
  fileName: string;
  size: number;
  uploadedAt: string;
}

export interface SavedFormData {
  strasse?: string;
  plz?: string;
  ort?: string;
  land?: string;
  bankname?: string;
  bic?: string;
  iban?: string;
  steuernummer?: string;
  ustId?: string;
  contacts?: Array<{
    kind: "gf" | "buchhaltung" | "extra";
    vorname: string;
    nachname: string;
    handy: string;
    telefon: string;
    email: string;
  }>;
  branches?: Array<{
    name: string;
    street: string;
    zip: string;
    city: string;
    gln: string;
  }>;
  hasGln?: boolean;
  sortiment?: string[];
  separateAbrechnung?: boolean | null;
  postadressen?: boolean | null;
  postadrResult?: { name: string; street: string; zip: string; city: string; gln: string };
  einzugseinzel?: boolean | null;
  liefSortiment?: string;
  liefMarken?: string;
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
  magicToken: string;
  status: CustomerStatus;
  linkSentAt: string | null;
  /** PLZ des Kunden für Mitarbeiter-Zuweisung */
  postalCode?: string;
  /** Land des Kunden (z.B. "AT", "CH", "DE") */
  country?: string;
  /** ZR-Startdatum, manuell vom Admin eingetragen */
  zrStartDate?: string;
  uploadedDocs: Record<string, UploadedDoc>;
  completedSections: Record<string, boolean>;
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
  /** Has the user dismissed the welcome entrance (dashboard seen)? */
  dashboardSeen: boolean;
  /** Pending tour start requested from sidebar navigation */
  pendingTourStart: boolean;
  /** Accountant is different from Geschäftsführer */
  buchungIdentischGF: boolean;
  /** PLZ des Kunden */
  postalCode?: string;
  /** Land des Kunden */
  country?: string;
  /** ZR-Startdatum, gesetzt vom Admin */
  zrStartDate?: string;
  /** Gespeicherte Formulardaten für PDF-Generierung */
  savedFormData: SavedFormData;
}

const STORAGE_KEY = "unitex_onboarding_state_v4";

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
  dashboardSeen: false,
  pendingTourStart: false,
  buchungIdentischGF: true,
  postalCode: "",
  country: "DE",
  zrStartDate: undefined,
  savedFormData: {},
};

/** Generates a secure random magic token */
export function generateMagicToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds the magic link URL */
export function buildMagicLink(token: string, email: string): string {
  const encoded = encodeURIComponent(email);
  return `https://onboarding.unitex.de/verify?token=${token}&email=${encoded}`;
}

interface Ctx {
  state: OnboardingState;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: { name: string; size: number }) => void;
  removeDoc: (id: string) => void;
  completeSection: (id: string) => void;
  updateFormData: (d: Partial<SavedFormData>) => void;
  addCustomerAccount: (acc: Omit<CustomerAccount, "id" | "createdAt" | "magicLinkSent" | "magicToken" | "status" | "linkSentAt" | "uploadedDocs" | "completedSections">) => CustomerAccount;
  updateCustomerAccount: (id: string, patch: Partial<CustomerAccount>) => void;
  sendMagicLink: (id: string) => void;
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
      updateFormData: (d) =>
        setState((s) => ({
          ...s,
          savedFormData: { ...s.savedFormData, ...d },
        })),
      addCustomerAccount: (acc) => {
        const token = generateMagicToken();
        const newAcc: CustomerAccount = {
          ...acc,
          id: `cust_${Date.now()}`,
          createdAt: new Date().toISOString(),
          magicLinkSent: false,
          magicToken: token,
          status: "Entwurf",
          linkSentAt: null,
          uploadedDocs: {},
          completedSections: {},
        };
        setState((s) => ({
          ...s,
          customerAccounts: [...s.customerAccounts, newAcc],
        }));
        return newAcc;
      },
      updateCustomerAccount: (id, patch) =>
        setState((s) => ({
          ...s,
          customerAccounts: s.customerAccounts.map((a) =>
            a.id === id ? { ...a, ...patch } : a
          ),
        })),
      sendMagicLink: (id) =>
        setState((s) => ({
          ...s,
          customerAccounts: s.customerAccounts.map((a) =>
            a.id === id
              ? { ...a, magicLinkSent: true, status: "Link gesendet", linkSentAt: new Date().toISOString() }
              : a
          ),
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

  // Schritt 3 "Onboarding abschließen" – 100% wenn abschluss-Sektion gesetzt
  const abschluss = state.completedSections["abschluss"] ? 100 : 0;

  // Neue Gewichtung: 50% Stammdaten, 40% Uploads, 10% Abschluss
  const total = Math.round(stammdaten * 0.5 + uploads * 0.4 + abschluss * 0.1);

  return { stammdaten, uploads, signaturen: abschluss, total };
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
// Support contact resolution by PLZ / Kundentyp
// ---------------------------------------------------------------------------
export interface SupportContact {
  name: string;
  initials: string;
  role: string;
  phone: string;
  email: string;
}

export const SUPPORT_TANJA: SupportContact = {
  name: "Tanja Lemke",
  initials: "TL",
  role: "Vertragswesen",
  phone: "+49 731 707 94 52",
  email: "t.lemke@unitex.de",
};

export const SUPPORT_ANNE: SupportContact = {
  name: "Anne Hutter",
  initials: "AH",
  role: "Kundenservice Zentrale",
  phone: "+49 731 707 94 0",
  email: "a.hutter@unitex.de",
};

export const SUPPORT_KERSTIN: SupportContact = {
  name: "Kerstin Bier",
  initials: "KB",
  role: "Wachstumsmanagement",
  phone: "+49 172 287 85 81",
  email: "k.bier@unitex.de",
};

export const SUPPORT_OLIVER: SupportContact = {
  name: "Oliver Borggrefe",
  initials: "OB",
  role: "Mitgliederservice Mitte-Nord",
  phone: "+49 172 438 75 63",
  email: "o.borggrefe@unitex.de",
};

export const SUPPORT_THOMAS: SupportContact = {
  name: "Thomas Römer",
  initials: "TR",
  role: "Mitgliederservice Süd-West & AT & CH",
  phone: "+49 172 637 56 06",
  email: "t.roemer@unitex.de",
};

export const SUPPORT_SABINE: SupportContact = {
  name: "Sabine Steinhardt",
  initials: "SS",
  role: "Mitgliederservice Süd-Ost",
  phone: "+49 1511 851 54 27",
  email: "s.steinhardt@unitex.de",
};

/**
 * Determine the responsible admin contact based on customer type and PLZ.
 * Lieferant → Kerstin Bier
 * Händler →
 *   PLZ starts 17-19, 2, 30-33, 37-39, 4, 58-59 → Oliver Borggrefe
 *   PLZ starts 34-36, 50-57, 6, 7 or AT/CH        → Thomas Römer
 *   PLZ starts 0, 10-16, 8, 9                      → Sabine Steinhardt
 */
export function getResponsibleAdmin(
  memberType: MemberType | null,
  postalCode: string | undefined,
  country: string | undefined
): SupportContact {
  if (memberType === "lieferant") return SUPPORT_KERSTIN;

  // Check for AT/CH
  const c = (country ?? "DE").toUpperCase();
  if (c === "AT" || c === "CH") return SUPPORT_THOMAS;

  const plz = (postalCode ?? "").trim();
  if (!plz) return SUPPORT_SABINE; // fallback

  const num = parseInt(plz.slice(0, 5), 10);
  const twoDigit = parseInt(plz.slice(0, 2), 10);
  const oneDigit = parseInt(plz[0] ?? "0", 10);

  // Oliver: 17-19, 2x, 30-33, 37-39, 4x, 58-59
  if (
    (twoDigit >= 17 && twoDigit <= 19) ||
    oneDigit === 2 ||
    (twoDigit >= 30 && twoDigit <= 33) ||
    (twoDigit >= 37 && twoDigit <= 39) ||
    oneDigit === 4 ||
    (twoDigit >= 58 && twoDigit <= 59)
  ) {
    return SUPPORT_OLIVER;
  }

  // Thomas: 34-36, 50-57, 6x, 7x
  if (
    (twoDigit >= 34 && twoDigit <= 36) ||
    (twoDigit >= 50 && twoDigit <= 57) ||
    oneDigit === 6 ||
    oneDigit === 7
  ) {
    return SUPPORT_THOMAS;
  }

  // Sabine: 0x, 10-16, 8x, 9x
  return SUPPORT_SABINE;
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
      { id: "gwg_daten",                 label: "GWG Daten",                 href: "/unternehmen#gwg_daten",  source: { kind: "section", sectionId: "gwg_daten" }, memberTypes: ["händler"] },
      { id: "lieferant_stamm",           label: "Ihre Unternehmensdaten",    href: "/unternehmen#lieferant_stamm", source: { kind: "section", sectionId: "lieferant_stamm" }, memberTypes: ["lieferant"] },
    ],
  },
  {
    title: "Dokumente",
    items: [
      { id: "cl_ausweiskopie",        label: "Ausweiskopie",                              href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_gf" }, memberTypes: ["händler"] },
      { id: "cl_ausw_kommanditisten", label: "Ausweiskopie aller Kommanditisten",         href: "/upload-center", source: { kind: "upload", docId: "ausweiskopie_kommanditisten" }, legalForms: ["GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_gewerbeanmeldung",    label: "Gewerbe-Anmeldung",                         href: "/upload-center", source: { kind: "upload", docId: "gewerbeanmeldung" }, legalForms: ["eK", "GbR"], memberTypes: ["händler"] },
      { id: "cl_hr_auszug",           label: "Auszug Handels-Register",                   href: "/upload-center", source: { kind: "upload", docId: "hr_auszug" }, legalForms: ["GmbH", "GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_gesellschaft",        label: "Gesellschafterliste",                        href: "/upload-center", source: { kind: "upload", docId: "gesellschafterliste" }, legalForms: ["GmbH", "GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_gesellschaftsvertrag",label: "Gesellschaftsvertrag",                       href: "/upload-center", source: { kind: "upload", docId: "gesellschaftsvertrag" }, legalForms: ["GmbH", "GmbHCoKG", "KG", "OHG"], memberTypes: ["händler"] },
      { id: "cl_hr_lieferant",        label: "Handelsregister-Auszug",                    href: "/upload-center", source: { kind: "upload", docId: "hr_auszug_lieferant" }, memberTypes: ["lieferant"] },
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
