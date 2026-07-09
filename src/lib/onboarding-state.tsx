import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "./supabase";
import { notifyReviewSubmitted, notifyCustomerRejected } from "./api/notify.functions";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type MemberType = "händler" | "lieferant";
export type LegalForm = "eK" | "GbR" | "GmbH" | "GmbHCoKG" | "KG" | "OHG";
export type ContractType = "probe" | "3jahre" | "5jahre";
export type UserRole = "admin" | "kunde";
export type CustomerStatus = "Entwurf" | "Link gesendet" | "Signiert" | "Zur Prüfung eingereicht" | "Freigegeben" | "Nachbesserung nötig";

export interface UploadedDoc {
  fileName: string;
  size: number;
  uploadedAt: string;
  storagePath: string;
}

export interface SavedFormData {
  strasse?: string;
  plz?: string;
  ort?: string;
  land?: string;
  emailFirma?: string;
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
    jobbezeichnung?: string;
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
  webseite?: string;
  swiftCode?: string;
  glnNr?: string;
  umsatz?: string;
  mitarbeiter?: string;
  gruendung?: string;
  marken?: string;
  zrVolumen?: string;
  bilanzsumme?: string;
  wkvDeckungsbeitrag?: string;
  wirtschaftAbhaengig?: boolean;
  wirtschaftAbhaengigText?: string;
  shareholders?: Array<{ name: string; capital: string; voting: string; pep: boolean }>;
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
  loggedInName?: string;
  isCollaborator?: boolean;
  savedFormData?: SavedFormData;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
}

export interface Collaborator {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  invitedBy: string | null;
  createdAt: string;
}

export interface OnboardingState {
  loading: any;
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
  reviewStatus: CustomerStatus | null;
  reviewNote: string | null;
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
  loading: false,
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
  reviewStatus: null,
  reviewNote: null,
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
      // Schlüssel im Record ist die docId (z.B. "ausweiskopie_gf"), die wir
      // aus dem storage_key extrahieren: {customerId}/{docId}-{dateiname}
      const uploadedDocs: Record<string, UploadedDoc> = {};
      for (const doc of docs ?? []) {
        const docId = extractDocIdFromStorageKey(doc.storage_key);
        uploadedDocs[docId] = {
          fileName: doc.file_name,
          size: doc.size,
          uploadedAt: doc.uploaded_at,
          storagePath: doc.storage_key,
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
        savedFormData,
        submittedAt: c.submitted_at ?? null,
        reviewedAt: c.reviewed_at ?? null,
        reviewedBy: c.reviewed_by ?? null,
        reviewNote: c.review_note ?? null,
      };
    })
  );

  return result;
}

/** Liest einen einzelnen Kunden anhand seiner E-Mail-Adresse */
export async function fetchCustomerByEmail(email: string): Promise<CustomerAccount | null> {
  let { data: c, error } = await supabase
    .from("customers")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  // Kein direkter Kunde mit dieser E-Mail → prüfen, ob es ein Mitbearbeiter ist
  let collaboratorName: string | undefined;

  if (!c && !error) {
    const { data: collab } = await supabase
      .from("collaborators")
      .select("customer_id, first_name, last_name")
      .eq("email", email)
      .maybeSingle();

    if (collab) {
      collaboratorName = `${collab.first_name ?? ""} ${collab.last_name ?? ""}`.trim();

      const result = await supabase
        .from("customers")
        .select("*")
        .eq("id", collab.customer_id)
        .maybeSingle();
      c = result.data;
      error = result.error;
    }
  }

  if (error || !c) return null;
  // ... ab hier bleibt der Rest der Funktion unverändert (docs, formSections, etc.)

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
    const docId = extractDocIdFromStorageKey(doc.storage_key);
    uploadedDocs[docId] = {
      fileName: doc.file_name,
      size: doc.size,
      uploadedAt: doc.uploaded_at,
      storagePath: doc.storage_key,
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
    loggedInName: collaboratorName,
    isCollaborator: !!collaboratorName,
    savedFormData,
    submittedAt: c.submitted_at ?? null,
    reviewedAt: c.reviewed_at ?? null,
    reviewedBy: c.reviewed_by ?? null,
    reviewNote: c.review_note ?? null,
  };
}

export async function markDashboardSeen(customerId: string): Promise<void> {
  await supabase
    .from("customers")
    .update({ dashboard_seen: true })
    .eq("id", customerId);
}

/** Erzeugt eine zeitlich begrenzte signierte URL zum Anzeigen/Herunterladen einer Datei */
export async function getDownloadUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60 * 60); // 1 Stunde gültig, wie im Sicherheitskonzept vorgesehen

  if (error || !data) {
    console.error("Signierte URL konnte nicht erstellt werden:", error);
    return null;
  }

  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Storage-Key Helper
// ---------------------------------------------------------------------------

/**
 * storage_key hat die Form {customerId}/{docId}-{dateiname}.
 * Diese Funktion extrahiert die docId daraus, damit wir die Datei dem
 * richtigen Checklisten-Slot (z.B. "ausweiskopie_gf") zuordnen können.
 * customerId ist eine UUID (enthält keine "-" im Sinne von Trennzeichen
 * zwischen docId und Dateiname, da UUIDs nur als ganzer erster Pfadteil
 * vorkommen), daher reicht ein Split nach dem ersten "/".
 */
function extractDocIdFromStorageKey(storageKey: string): string {
  const afterSlash = storageKey.split("/")[1] ?? storageKey;
  // alles bis zum ersten "-" ist die docId, der Rest ist der Dateiname
  const dashIndex = afterSlash.indexOf("-");
  return dashIndex === -1 ? afterSlash : afterSlash.slice(0, dashIndex);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface Ctx {
  state: OnboardingState;
  loading: boolean;
  update: (p: Partial<OnboardingState>) => void;
  uploadDoc: (id: string, file: File) => void;
  removeDoc: (id: string) => void;
  completeSection: (id: string) => void;
  updateFormData: (d: Partial<SavedFormData>) => void;
  submitForReview: () => Promise<void>;
  inviteCollaborator: (email: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  fetchCollaborators: () => Promise<Collaborator[]>;
  removeCollaborator: (id: string) => Promise<void>;
  addCustomerAccount: (acc: Omit<CustomerAccount, "id" | "createdAt" | "magicLinkSent" | "magicToken" | "status" | "linkSentAt" | "uploadedDocs" | "completedSections">) => Promise<CustomerAccount>;
  updateCustomerAccount: (id: string, patch: Partial<CustomerAccount>) => Promise<void>;
  reviewCustomer: (id: string, decision: "Freigegeben" | "Nachbesserung nötig", note?: string) => Promise<void>;
  sendMagicLink: (id: string) => Promise<void>;
  refreshCustomers: () => Promise<void>;
  reset: () => void;
}

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  // Ref hält den aktuellen State synchron, damit useCallback-Funktionen
  // mit [] als Dependency trotzdem den aktuellen activeCustomerId sehen
  // (kein "stale closure"-Problem).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Ermittelt die Kunden-ID für DB-Schreibzugriffe:
  // - Admin, der gerade einen Kunden bearbeitet → activeCustomerId
  // - Kunde, der selbst eingeloggt ist → eigene customers-Zeile über E-Mail
  const resolveCustomerId = useCallback(async (): Promise<string | null> => {
    const activeId = stateRef.current.activeCustomerId;
    if (activeId) return activeId;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return null;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", session.user.email)
      .maybeSingle();

    if (customer?.id) return customer.id;

    // Kein direkter Kunde → prüfen, ob die Session-E-Mail ein Mitbearbeiter ist
    const { data: collab } = await supabase
      .from("collaborators")
      .select("customer_id")
      .eq("email", session.user.email)
      .maybeSingle();

    return collab?.customer_id ?? null;
  }, []);

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
        .maybeSingle();

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
            userName: customer.loggedInName || `${customer.firstName} ${customer.lastName}`.trim(),
            companyName: customer.companyName,
            memberType: customer.memberType,
            legalForm: customer.legalForm,
            legalFormLockedByAdmin: true,
            uploadedDocs: customer.uploadedDocs,
            completedSections: customer.completedSections,
            postalCode: customer.postalCode,
            country: customer.country,
            zrStartDate: customer.zrStartDate,
            dashboardSeen: customer.dashboardSeen,
            savedFormData: customer.savedFormData ?? {},
            submittedAt: customer.submittedAt ?? null,
            reviewStatus: customer.status,
            reviewNote: customer.reviewNote ?? null,
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
  // Dokument hochladen (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const uploadDoc = useCallback(async (docId: string, file: File) => {
    const customerId = await resolveCustomerId();
    if (!customerId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const actorEmail = session?.user?.email ?? null;

    const { data: existingDocs } = await supabase
      .from("documents")
      .select("storage_key")
      .eq("customer_id", customerId)
      .like("storage_key", `${customerId}/${docId}-%`);

    if (existingDocs && existingDocs.length > 0) {
      const oldPaths = existingDocs.map((d) => d.storage_key);
      await supabase.storage.from("documents").remove(oldPaths);
      await supabase
        .from("documents")
        .delete()
        .eq("customer_id", customerId)
        .in("storage_key", oldPaths);
    }

    // Storage-Pfad: {customerId}/{docId}-{dateiname}
    const storagePath = `${customerId}/${docId}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      console.error("Storage-Upload fehlgeschlagen:", uploadError);
      alert("Datei konnte nicht hochgeladen werden. Bitte erneut versuchen.");
      return;
    }

    const uploadedAt = new Date().toISOString();
    await supabase.from("documents").upsert({
      customer_id: customerId,
      file_name: file.name,
      storage_key: storagePath,
      size: file.size,
      uploaded_at: uploadedAt,
      created_by: actorEmail,
    }, { onConflict: "customer_id,storage_key" });

    setState((s) => ({
      ...s,
      uploadedDocs: {
        ...s.uploadedDocs,
        [docId]: { fileName: file.name, size: file.size, uploadedAt, storagePath },
      },
    }));
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Dokument entfernen (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const removeDoc = useCallback(async (docId: string) => {
    const customerId = await resolveCustomerId();
    if (!customerId) return;

    const storagePath = stateRef.current.uploadedDocs[docId]?.storagePath;

    if (storagePath) {
      await supabase.storage.from("documents").remove([storagePath]);
    }

    await supabase
      .from("documents")
      .delete()
      .eq("customer_id", customerId)
      .like("storage_key", `${customerId}/${docId}-%`);

    setState((s) => {
      const next = { ...s.uploadedDocs };
      delete next[docId];
      return { ...s, uploadedDocs: next };
    });
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Sektion als abgeschlossen markieren (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const completeSection = useCallback(async (sectionId: string) => {
    const customerId = await resolveCustomerId();
    if (!customerId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const actorEmail = session?.user?.email ?? null;

    // Aktuelle completed-Sections laden und mergen
    const { data: existing } = await supabase
      .from("form_data")
      .select("data")
      .eq("customer_id", customerId)
      .eq("section", "_completed")
      .maybeSingle();

    const merged = { ...(existing?.data ?? {}), [sectionId]: true };

    await supabase.from("form_data").upsert({
      customer_id: customerId,
      section: "_completed",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: actorEmail,
    }, { onConflict: "customer_id,section" });

    setState((s) => ({
      ...s,
      completedSections: { ...s.completedSections, [sectionId]: true },
    }));
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Formulardaten speichern (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const updateFormData = useCallback(async (d: Partial<SavedFormData>) => {
    const customerId = await resolveCustomerId();
    if (!customerId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const actorEmail = session?.user?.email ?? null;

    // Aktuelle Daten laden und mergen
    const { data: existing } = await supabase
      .from("form_data")
      .select("data")
      .eq("customer_id", customerId)
      .eq("section", "stammdaten")
      .maybeSingle();

    const merged = { ...(existing?.data ?? {}), ...d };

    await supabase.from("form_data").upsert({
      customer_id: customerId,
      section: "stammdaten",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: actorEmail,
    }, { onConflict: "customer_id,section" });

    setState((s) => ({
      ...s,
      savedFormData: { ...s.savedFormData, ...d },
    }));
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Zur Prüfung einreichen (Kunde) – setzt Status + Timestamp, resettet ggf. alte Review-Daten
  // ---------------------------------------------------------------------------
  const submitForReview = useCallback(async () => {
    const customerId = await resolveCustomerId();
    if (!customerId) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("customers")
      .update({
        status: "Zur Prüfung eingereicht",
        submitted_at: now,
        reviewed_at: null,
        reviewed_by: null,
        review_note: null,
      })
      .eq("id", customerId);
    if (error) throw new Error(error.message);
    setState((s) => ({ ...s, submittedAt: now, reviewStatus: "Zur Prüfung eingereicht", reviewNote: null }));
    // Benachrichtigung an Tanja – Fehler hier sollen die Einreichung selbst nicht blockieren
    if (stateRef.current.memberType) {
      try {
        const result = await notifyReviewSubmitted({
          data: {
            companyName: stateRef.current.companyName,
            memberType: stateRef.current.memberType,
            customerId,
          },
        });
      } catch (e) {
        console.error("[submitForReview] Benachrichtigung an Tanja fehlgeschlagen:", e);
      }
    }
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Mitbearbeiter einladen (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const inviteCollaborator = useCallback(async (email: string, firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> => {
    const customerId = await resolveCustomerId();
    if (!customerId) return { success: false, error: "Kein Kundenkonto gefunden." };

    const { data: { session } } = await supabase.auth.getSession();
    const actorEmail = session?.user?.email ?? null;

    const { error: insertError } = await supabase
      .from("collaborators")
      .insert({
        customer_id: customerId,
        email,
        first_name: firstName,
        last_name: lastName,
        invited_by: actorEmail,
      });

    if (insertError) {
      // Postgres-Fehlercode 23505 = unique constraint verletzt (customer_id, email)
      if (insertError.code === "23505") {
        return { success: false, error: "Diese Person ist bereits als Mitbearbeiter eingetragen." };
      }
      return { success: false, error: insertError.message };
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `https://onboarding.unitex.de/?email=${encodeURIComponent(email)}&verify=1`,
      },
    });

    if (otpError) {
      return { success: false, error: "Eintrag gespeichert, aber Einladungs-Mail konnte nicht versendet werden." };
    }

    return { success: true };
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Mitbearbeiter-Liste laden (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const fetchCollaborators = useCallback(async (): Promise<Collaborator[]> => {
    const customerId = await resolveCustomerId();
    if (!customerId) return [];

    const { data, error } = await supabase
      .from("collaborators")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.first_name ?? "",
      lastName: c.last_name ?? "",
      invitedBy: c.invited_by,
      createdAt: c.created_at,
    }));
  }, [resolveCustomerId]);

  // ---------------------------------------------------------------------------
  // Mitbearbeiter entfernen (Kunde oder Admin im Namen eines Kunden)
  // ---------------------------------------------------------------------------
  const removeCollaborator = useCallback(async (id: string): Promise<void> => {
    await supabase
      .from("collaborators")
      .delete()
      .eq("id", id);
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
  // Prüfung entscheiden (Admin/Tanja): Freigabe oder Nachbesserung nötig
  // ---------------------------------------------------------------------------
  const reviewCustomer = useCallback(async (
    id: string,
    decision: "Freigegeben" | "Nachbesserung nötig",
    note?: string,
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const actorEmail = session?.user?.email ?? null;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("customers")
      .update({
        status: decision,
        reviewed_at: now,
        reviewed_by: actorEmail,
        review_note: decision === "Nachbesserung nötig" ? (note ?? null) : null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    // Bei Rückweisung: "abschluss" freigeben, damit der Kunde die Signaturen-Seite wieder bearbeiten kann
    if (decision === "Nachbesserung nötig") {
      const { data: existing } = await supabase
        .from("form_data")
        .select("data")
        .eq("customer_id", id)
        .eq("section", "_completed")
        .maybeSingle();
      if (existing?.data) {
        const { abschluss: _abschluss, ...rest } = existing.data as Record<string, boolean>;
        await supabase.from("form_data").upsert({
          customer_id: id,
          section: "_completed",
          data: rest,
          updated_at: now,
          updated_by: actorEmail,
        }, { onConflict: "customer_id,section" });
      }
      // Kunde per Mail über die nötige Korrektur informieren
      const target = stateRef.current.customerAccounts.find((a) => a.id === id);
      if (target && note) {
        try {
          await notifyCustomerRejected({
            data: { customerEmail: target.email, companyName: target.companyName, note },
          });
        } catch (e) {
          console.error("[reviewCustomer] Benachrichtigung an Kunden fehlgeschlagen:", e);
        }
      }
    }
    setState((s) => ({
      ...s,
      customerAccounts: s.customerAccounts.map((a) =>
        a.id === id
          ? {
              ...a,
              status: decision,
              reviewedAt: now,
              reviewedBy: actorEmail,
              reviewNote: decision === "Nachbesserung nötig" ? (note ?? null) : null,
              completedSections: decision === "Nachbesserung nötig"
                ? { ...a.completedSections, abschluss: false }
                : a.completedSections,
            }
          : a
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
      submitForReview,
      inviteCollaborator,
      fetchCollaborators,
      removeCollaborator,
      addCustomerAccount,
      updateCustomerAccount,
      reviewCustomer,
      sendMagicLink,
      refreshCustomers,
      reset,
    }),
    [state, loading, update, uploadDoc, removeDoc, completeSection, updateFormData, submitForReview,
     inviteCollaborator, fetchCollaborators, removeCollaborator, addCustomerAccount, updateCustomerAccount, reviewCustomer, sendMagicLink, refreshCustomers, reset]
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