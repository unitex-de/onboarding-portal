import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

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
  postalCode?: string;
  country?: string;
  zrStartDate?: string;
  uploadedDocs: Record<string, UploadedDoc>;
  completedSections: Record<string, boolean>;
  dashboardSeen: boolean;
}

export interface OnboardingState {
  email: string | null;
  signedIn: boolean;
  role: UserRole;
  userName: string;
  companyName: string;
  memberType: MemberType | null;
  legalForm: LegalForm | null;
  legalFormLockedByAdmin: boolean;
  contractType: ContractType | null;
  hasSoliver: boolean;
  uploadedDocs: Record<string, UploadedDoc>;
  completedSections: Record<string, boolean>;
  submittedAt: string | null;
  customerAccounts: CustomerAccount[];
  activeCustomerId: string | null;
  tourSeen: boolean;
  dashboardSeen: boolean;
  pendingTourStart: boolean;
  buchungIdentischGF: boolean;
  postalCode?: string;
  country?: string;
  zrStartDate?: string;
  savedFormData: SavedFormData;
}

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

// ---------------------------------------------------------------------------
// Helper – unverändert
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Supabase Hilfsfunktionen – Datenbank lesen/schreiben
// ---------------------------------------------------------------------------

/** Liest alle Kunden aus Supabase und baut CustomerAccount-Objekte */
async function fetchAllCustomers(): Promise<CustomerAccount[]> {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !customers) return [];

  // Für jeden Kunden: Dokumente und Formulardaten nachladen
  const result: CustomerAccount[] = await Promise.all(
    customers.map(async (c) => {
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("customer_id", c.id);

      const { data: formSections } = await supabase
        .from("form_data")
        .select("*")
        .eq("customer_id", c.id);

      // Dokumente in das Record-Format umwandeln
      const uploadedDocs: Record<string, UploadedDoc> = {};
      for (const doc of docs ?? []) {
        uploadedDocs[doc.storage_key] = {
          fileName: doc.file_name,
          size: doc.size,
          uploadedAt: doc.uploaded_at,
        };
      }

      // Abgeschlossene Sektionen aus form_data zusammenbauen
      const completedSections: Record<string, boolean> = {};
      const savedFormData: SavedFormData = {};
      for (const section of formSections ?? []) {
        if (section.section === "_completed") {
          Object.assign(completedSections, section.data);
        } else {
          Object.assign(savedFormData, section.data);
        }
      }

      return {
        id: c.id,
        firstName: c.first_name ?? "",
        lastName: c.last_name ?? "",
        email: c.email,
        companyName: c.company ?? "",
        memberType: c.member_type as MemberType,
        legalForm: c.legal_form as LegalForm,
        createdAt: c.created_at,
        magicLinkSent: !!c.link_sent_at,
        magicToken: c.magic_token ?? "",
        status: c.status as CustomerStatus,
        linkSentAt: c.link_sent_at ?? null,
        postalCode: c.postal_code ?? "",
        country: c.country ?? "DE",
        zrStartDate: c.zr_start_date ?? undefined,
        uploadedDocs,
        completedSections,
        dashboardSeen: c.dashboard_seen ?? false,
      };
    })
  );

  return result;
}

/** Liest einen einzelnen Kunden anhand seiner E-Mail-Adresse */
export async function fetchCustomerByEmail(email: string): Promise<CustomerAccount | null> {
  const { data: c, error } = await supabase
    .from("customers")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !c) return null;

  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .eq("customer_id", c.id);

  const { data: formSections } = await supabase
    .from("form_data")
    .select("*")
    .eq("customer_id", c.id);

  const uploadedDocs: Record<string, UploadedDoc> = {};
  for (const doc of docs ?? []) {
    uploadedDocs[doc.storage_key] = {
      fileName: doc.file_name,
      size: doc.size,
      uploadedAt: doc.uploaded_at,
    };
  }

  const completedSections: Record<string, boolean> = {};
  const savedFormData: SavedFormData = {};
  for (const section of formSections ?? []) {
    if (section.section === "_completed") {
      Object.assign(completedSections, section.data);
    } else {
      Object.assign(savedFormData, section.data);
    }
  }

  return {
    id: c.id,
    firstName: c.first_name ?? "",
    lastName: c.last_name ?? "",
    email: c.email,
    companyName: c.company ?? "",
    memberType: c.member_type as MemberType,
    legalForm: c.legal_form as LegalForm,
    createdAt: c.created_at,
    magicLinkSent: !!c.link_sent_at,
    magicToken: c.magic_token ?? "",
    status: c.status as CustomerStatus,
    linkSentAt: c.link_sent_at ?? null,
    postalCode: c.postal_code ?? "",
    country: c.country ?? "DE",
    zrStartDate: c.zr_start_date ?? undefined,
    uploadedDocs,
    completedSections,
    dashboardSeen: c.dashboard_seen ?? false,
  };
}

export async function markDashboardSeen(customerId: string): Promise<void> {
  await supabase
    .from("customers")
    .update({ dashboard_seen: true })
    .eq("id", customerId);
}
// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface Ctx {
  state: OnboardingState;
  loading: boolean;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: { name: string; size: number }) => void;
  removeDoc: (id: string) => void;
  completeSection: (id: string) => void;
  updateFormData: (d: Partial<SavedFormData>) => void;
  addCustomerAccount: (acc: Omit<CustomerAccount, "id" | "createdAt" | "magicLinkSent" | "magicToken" | "status" | "linkSentAt" | "uploadedDocs" | "completedSections">) => Promise<CustomerAccount>;
  updateCustomerAccount: (id: string, patch: Partial<CustomerAccount>) => Promise<void>;
  sendMagicLink: (id: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
  reset: () => void;
}

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Beim Start: Supabase Auth-Session prüfen und Daten laden
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      const email = session.user.email;

      // Ist diese E-Mail ein Admin?
      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("email", email)
        .single();

      if (adminRow) {
        // Admin: alle Kunden laden
        const customerAccounts = await fetchAllCustomers();
        setState((s) => ({
          ...s,
          email,
          signedIn: true,
          role: "admin",
          customerAccounts,
        }));
      } else {
        // Kunde: nur eigene Daten laden
        const customer = await fetchCustomerByEmail(email);
        if (customer) {
          setState((s) => ({
            ...s,
            email,
            signedIn: true,
            role: "kunde",
            userName: `${customer.firstName} ${customer.lastName}`.trim(),
            companyName: customer.companyName,
            memberType: customer.memberType,
            legalForm: customer.legalForm,
            legalFormLockedByAdmin: true,
            uploadedDocs: customer.uploadedDocs,
            completedSections: customer.completedSections,
            postalCode: customer.postalCode,
            country: customer.country,
            zrStartDate: customer.zrStartDate,
          }));
        }
      }

      setLoading(false);
    }

    init();

    // Auth-Zustand beobachten (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState(DEFAULT_STATE);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // Admin: alle Kunden neu laden
  // ---------------------------------------------------------------------------
  const refreshCustomers = useCallback(async () => {
    const customers = await fetchAllCustomers();
    setState((s) => ({ ...s, customerAccounts: customers }));
  }, []);

  // ---------------------------------------------------------------------------
  // Lokales State-Update (für UI-Felder die nicht sofort persistiert werden)
  // ---------------------------------------------------------------------------
  const update = useCallback((p: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  // ---------------------------------------------------------------------------
  // Dokument hochladen (Kunde)
  // ---------------------------------------------------------------------------
  const uploadDoc = useCallback(async (docId: string, file: { name: string; size: number }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    // Kunden-UUID aus der DB holen
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!customer) return;

    await supabase.from("documents").upsert({
      customer_id: customer.id,
      file_name: file.name,
      storage_key: docId,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    }, { onConflict: "customer_id,storage_key" });

    // Lokalen State aktualisieren
    setState((s) => ({
      ...s,
      uploadedDocs: {
        ...s.uploadedDocs,
        [docId]: { fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() },
      },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Dokument entfernen (Kunde)
  // ---------------------------------------------------------------------------
  const removeDoc = useCallback(async (docId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!customer) return;

    await supabase
      .from("documents")
      .delete()
      .eq("customer_id", customer.id)
      .eq("storage_key", docId);

    setState((s) => {
      const next = { ...s.uploadedDocs };
      delete next[docId];
      return { ...s, uploadedDocs: next };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Sektion als abgeschlossen markieren (Kunde)
  // ---------------------------------------------------------------------------
  const completeSection = useCallback(async (sectionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!customer) return;

    // Aktuelle completed-Sections laden und mergen
    const { data: existing } = await supabase
      .from("form_data")
      .select("data")
      .eq("customer_id", customer.id)
      .eq("section", "_completed")
      .single();

    const merged = { ...(existing?.data ?? {}), [sectionId]: true };

    await supabase.from("form_data").upsert({
      customer_id: customer.id,
      section: "_completed",
      data: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: "customer_id,section" });

    setState((s) => ({
      ...s,
      completedSections: { ...s.completedSections, [sectionId]: true },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Formulardaten speichern (Kunde)
  // ---------------------------------------------------------------------------
  const updateFormData = useCallback(async (d: Partial<SavedFormData>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!customer) return;

    // Aktuelle Daten laden und mergen
    const { data: existing } = await supabase
      .from("form_data")
      .select("data")
      .eq("customer_id", customer.id)
      .eq("section", "stammdaten")
      .single();

    const merged = { ...(existing?.data ?? {}), ...d };

    await supabase.from("form_data").upsert({
      customer_id: customer.id,
      section: "stammdaten",
      data: merged,
      updated_at: new Date().toISOString(),
    }, { onConflict: "customer_id,section" });

    setState((s) => ({
      ...s,
      savedFormData: { ...s.savedFormData, ...d },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Neuen Kunden anlegen (Admin)
  // ---------------------------------------------------------------------------
  const addCustomerAccount = useCallback(async (
    acc: Omit<CustomerAccount, "id" | "createdAt" | "magicLinkSent" | "magicToken" | "status" | "linkSentAt" | "uploadedDocs" | "completedSections">
  ): Promise<CustomerAccount> => {
    const token = generateMagicToken();

    const { data, error } = await supabase
      .from("customers")
      .insert({
        email: acc.email,
        first_name: acc.firstName,
        last_name: acc.lastName,
        company: acc.companyName,
        member_type: acc.memberType,
        legal_form: acc.legalForm,
        status: "Entwurf",
        magic_token: token,
        postal_code: acc.postalCode ?? "",
        country: acc.country ?? "DE",
        zr_start_date: acc.zrStartDate ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Kunde konnte nicht angelegt werden");

    const newAcc: CustomerAccount = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      companyName: data.company,
      memberType: data.member_type as MemberType,
      legalForm: data.legal_form as LegalForm,
      createdAt: data.created_at,
      magicLinkSent: false,
      magicToken: token,
      status: "Entwurf",
      linkSentAt: null,
      postalCode: data.postal_code ?? "",
      country: data.country ?? "DE",
      zrStartDate: data.zr_start_date ?? undefined,
      uploadedDocs: {},
      completedSections: {},
      dashboardSeen: false,
    };

    setState((s) => ({
      ...s,
      customerAccounts: [newAcc, ...s.customerAccounts],
    }));

    return newAcc;
  }, []);

  // ---------------------------------------------------------------------------
  // Kunden aktualisieren (Admin)
  // ---------------------------------------------------------------------------
  const updateCustomerAccount = useCallback(async (id: string, patch: Partial<CustomerAccount>) => {
    const { error } = await supabase
      .from("customers")
      .update({
        first_name: patch.firstName,
        last_name: patch.lastName,
        company: patch.companyName,
        member_type: patch.memberType,
        legal_form: patch.legalForm,
        status: patch.status,
        postal_code: patch.postalCode,
        country: patch.country,
        zr_start_date: patch.zrStartDate ?? null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    setState((s) => ({
      ...s,
      customerAccounts: s.customerAccounts.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Magic Link als gesendet markieren (Admin)
  // ---------------------------------------------------------------------------
  const sendMagicLink = useCallback(async (id: string) => {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("customers")
      .update({
        status: "Link gesendet",
        link_sent_at: now,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);

    setState((s) => ({
      ...s,
      customerAccounts: s.customerAccounts.map((a) =>
        a.id === id
          ? { ...a, magicLinkSent: true, status: "Link gesendet", linkSentAt: now }
          : a
      ),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      loading,
      update,
      uploadDoc,
      removeDoc,
      completeSection,
      updateFormData,
      addCustomerAccount,
      updateCustomerAccount,
      sendMagicLink,
      refreshCustomers,
      reset,
    }),
    [state, loading, update, uploadDoc, removeDoc, completeSection, updateFormData,
     addCustomerAccount, updateCustomerAccount, sendMagicLink, refreshCustomers, reset]
  );

  return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// ZR-Start: today + 10 Werktage → nächster 1. des Monats – unverändert
// ---------------------------------------------------------------------------
export function calcZrStartDate(from: Date = new Date()): Date {
  const d = new Date(from);
  let added = 0;
  while (added < 10) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function formatDateDe(d: Date): string {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Progress calculation – unverändert
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

  const abschluss = state.completedSections["abschluss"] ? 100 : 0;

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
// Required doc IDs – unverändert
// ---------------------------------------------------------------------------
export function getRequiredDocIds(legalForm: LegalForm | null, memberType?: MemberType | null): string[] {
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
// Support contacts – unverändert
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

export function getResponsibleAdmin(
  memberType: MemberType | null,
  postalCode: string | undefined,
  country: string | undefined
): SupportContact {
  if (memberType === "lieferant") return SUPPORT_KERSTIN;

  const c = (country ?? "DE").toUpperCase();
  if (c === "AT" || c === "CH") return SUPPORT_THOMAS;

  const plz = (postalCode ?? "").trim();
  if (!plz) return SUPPORT_SABINE;

  const twoDigit = parseInt(plz.slice(0, 2), 10);
  const oneDigit = parseInt(plz[0] ?? "0", 10);

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

  if (
    (twoDigit >= 34 && twoDigit <= 36) ||
    (twoDigit >= 50 && twoDigit <= 57) ||
    oneDigit === 6 ||
    oneDigit === 7
  ) {
    return SUPPORT_THOMAS;
  }

  return SUPPORT_SABINE;
}

// ---------------------------------------------------------------------------
// Checklist – unverändert
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