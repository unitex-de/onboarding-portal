import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// ---------------------------------------------------------------------------
// Basis-Hilfsfunktionen
// ---------------------------------------------------------------------------

function normalizeDomain(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

async function hubspotFetch(
  token: string,
  path: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

// ---------------------------------------------------------------------------
// Company: finden, Properties bauen, labels2-Merge
// ---------------------------------------------------------------------------

async function findCompany(
  token: string,
  propertyName: "domain" | "name",
  value: string,
): Promise<{ id: string; labels2?: string } | null> {
  const { ok, body } = await hubspotFetch(token, "/crm/v3/objects/companies/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName, operator: "EQ", value }] }],
      properties: ["name", "domain", "labels2"],
      limit: 1,
    }),
  });
  if (!ok) return null;
  const first = body?.results?.[0];
  if (!first) return null;
  return { id: first.id, labels2: first.properties?.labels2 ?? undefined };
}

/** Baut den neuen labels2-Wert: "Akquise" raus, "ZR" + Händler/Lieferant rein,
 *  alle anderen bestehenden Labels bleiben erhalten. */
function computeLabels2(existing: string | undefined, memberType: "händler" | "lieferant"): string {
  const roleLabel = memberType === "lieferant" ? "Lieferant" : "Händler";
  const set = new Set(
    (existing ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  set.delete("Akquise");
  set.add("ZR");
  set.add(roleLabel);
  return Array.from(set).join(";");
}

interface CompanySyncInput {
  companyName: string;
  website?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  land?: string;
  emailFirma?: string;
  umsatz?: string;
  mitarbeiter?: string;
  gruendung?: string;
  ustId?: string;
  glnNr?: string;
  sortiment?: string[];
  marken?: string;
  zrStartDate?: string;
}

/** Baut die Company-Properties. Nur Felder, die im Formular ausgefüllt sind,
 *  werden gesendet (leere Felder überschreiben keine bestehenden HubSpot-Werte). */
function buildCompanyProperties(
  input: CompanySyncInput,
  domain: string | null,
): Record<string, string> {
  const props: Record<string, string> = { name: input.companyName };
  if (domain) props.domain = domain;
  if (input.strasse) props.address = input.strasse;
  if (input.plz) props.zip = input.plz;
  if (input.ort) props.city = input.ort;
  if (input.land) props.country = input.land;
  if (input.emailFirma) props.e_mail_adresse = input.emailFirma;
  // Jahresumsatz: NICHT das HubSpot-Standardfeld annualrevenue (das ist ein
  // anderes Feld) – die tatsächlich genutzte Property ist n03__umsatz_haus.
  if (input.umsatz) props.n03__umsatz_haus = input.umsatz;
  if (input.mitarbeiter) props.numberofemployees = input.mitarbeiter;
  if (input.gruendung) props.founded_year = input.gruendung;
  if (input.ustId) props.ust_idnr_ = input.ustId;
  if (input.glnNr) props.n04__gln = input.glnNr;
  if (input.sortiment && input.sortiment.length > 0) {
    props.n01__sortiment__geklont_ = input.sortiment.join(";");
  }
  if (input.marken) props.n03__marken__nur_lieferanten_ = input.marken;
  // ZR-Volumen (n05__umsatz_zr__ca____autom__) wird in HubSpot automatisch
  // berechnet – bewusst NICHT vom Portal aus beschrieben, sonst überschreiben
  // wir die automatische Berechnung mit einer manuellen Schätzung.
  if (input.zrStartDate) props.n06__zr_ab = input.zrStartDate;
  props.onboarding_status = "Freigegeben";
  return props;
}

// ---------------------------------------------------------------------------
// Contact: Jobklassifikation-Mapping, Properties bauen, Upsert, Verknüpfung
// ---------------------------------------------------------------------------

type ContactKind = "gf" | "buchhaltung" | "extra";

interface ContactSyncInput {
  kind: ContactKind;
  vorname: string;
  nachname: string;
  handy?: string;
  telefon?: string;
  email: string;
  jobbezeichnung?: string;
  newsletterHandy?: boolean;
  newsletterEmail?: boolean;
}

/** Mappt die freie Formular-Jobbezeichnung auf die 12 HubSpot-Optionen von
 *  "jobklassifikation". GF und Buchhaltung sind über `kind` eindeutig,
 *  bei "extra" wird per Stichwort gesucht, sonst "Sonstiges". */
function mapJobklassifikation(kind: ContactKind, jobbezeichnung?: string): string {
  if (kind === "gf") return "I/GF";
  if (kind === "buchhaltung") return "Buchhaltung";

  const text = (jobbezeichnung ?? "").toLowerCase();
  if (!text) return "Sonstiges";
  if (/vertrieb|sales/.test(text)) return "Sales";
  if (/marketing/.test(text)) return "Marketing";
  if (/einkauf/.test(text)) return "Einkauf";
  if (/verwaltung/.test(text)) return "Verwaltung";
  if (/assistenz|assistent/.test(text)) return "Assistenz";
  if (/\bit\b|edv|informatik/.test(text)) return "IT/EDV";
  if (/student|auszubild|azubi|praktikant/.test(text)) return "Student";
  if (/agentur/.test(text)) return "Agentur";
  if (/geschäftsführ|gesellschafter|inhaber|\bgf\b/.test(text)) return "I/GF";
  if (/buchhaltung|finance|controlling|rechnungswesen/.test(text)) return "Buchhaltung";
  return "Sonstiges";
}

/** Kehrt mapJobklassifikation um: schätzt aus einer HubSpot-Jobklassifikation
 *  die passende Portal-Kontaktrolle für den Import. Bei Unsicherheit "extra" –
 *  der Kundenbetreuer/Kunde wählt die Rolle dann im Portal selbst nach. */
function guessContactKind(jobklassifikation?: string): ContactKind {
  if (jobklassifikation === "I/GF") return "gf";
  if (jobklassifikation === "Buchhaltung") return "buchhaltung";
  return "extra";
}

function buildContactProperties(
  companyName: string,
  contact: ContactSyncInput,
): Record<string, string> {
  const props: Record<string, string> = {
    email: contact.email,
    company: companyName,
    firstname: contact.vorname,
    lastname: contact.nachname,
    jobklassifikation: mapJobklassifikation(contact.kind, contact.jobbezeichnung),
  };
  if (contact.jobbezeichnung) props.jobtitle = contact.jobbezeichnung;
  if (contact.handy) props.mobilephone = contact.handy;
  if (contact.telefon) props.phone = contact.telefon;
  if (contact.newsletterHandy) props.onboarding_newsletter_einwilligung_sms = "true";
  if (contact.newsletterEmail) props.onboarding_newsletter_einwilligung_mail = "true";
  return props;
}

/** Legt einen Kontakt an oder aktualisiert ihn (Duplikat-Erkennung über E-Mail). */
async function upsertContact(
  token: string,
  properties: Record<string, string>,
  email: string,
): Promise<{ id: string | null; error?: string }> {
  const created = await hubspotFetch(token, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });

  if (created.status === 409) {
    const patched = await hubspotFetch(
      token,
      `/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
      { method: "PATCH", body: JSON.stringify({ properties }) },
    );
    if (!patched.ok) {
      return { id: null, error: patched.body?.message ?? "Update fehlgeschlagen (Contact)" };
    }
    return { id: patched.body.id };
  }

  if (!created.ok) {
    return { id: null, error: created.body?.message ?? "Anlegen fehlgeschlagen (Contact)" };
  }
  return { id: created.body.id };
}

/** Prüft, ob ein Kontakt bereits eine als "Primary" markierte Firma hat. */
async function contactHasPrimaryCompany(token: string, contactId: string): Promise<boolean> {
  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v4/objects/contact/${contactId}/associations/company`,
    { method: "GET" },
  );
  if (!ok) return false;
  const results = body?.results ?? [];
  return results.some((r: any) =>
    (r.associationTypes ?? []).some((t: any) => t.typeId === 1),
  );
}

/** Verknüpft Kontakt <-> Firma. GF wird Primary, außer der Kontakt hat schon
 *  eine Primary-Firma (die bleibt dann unangetastet). Andere Rollen sind
 *  immer normale (nicht-primäre) Verknüpfungen. */
async function associateContactWithCompany(
  token: string,
  contactId: string,
  companyId: string,
  candidateForPrimary: boolean,
): Promise<{ ok: boolean; primary: boolean; error?: string }> {
  let makePrimary = false;
  if (candidateForPrimary) {
    const hasPrimary = await contactHasPrimaryCompany(token, contactId);
    makePrimary = !hasPrimary;
  }
  const typeId = makePrimary ? 1 : 279;

  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v4/objects/contact/${contactId}/associations/company/${companyId}`,
    {
      method: "PUT",
      body: JSON.stringify([{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: typeId }]),
    },
  );
  if (!ok) {
    return { ok: false, primary: false, error: body?.message ?? "Verknüpfung fehlgeschlagen" };
  }
  return { ok: true, primary: makePrimary };
}

// ---------------------------------------------------------------------------
// Kunde nach Freigabe zu HubSpot syncen: Company + alle Kontakte
// ---------------------------------------------------------------------------
export const syncCustomerToHubspot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string(),
      companyName: z.string(),
      memberType: z.enum(["händler", "lieferant"]),
      website: z.string().optional(),
      strasse: z.string().optional(),
      plz: z.string().optional(),
      ort: z.string().optional(),
      land: z.string().optional(),
      emailFirma: z.string().optional(),
      umsatz: z.string().optional(),
      mitarbeiter: z.string().optional(),
      gruendung: z.string().optional(),
      ustId: z.string().optional(),
      glnNr: z.string().optional(),
      sortiment: z.array(z.string()).optional(),
      marken: z.string().optional(),
      zrStartDate: z.string().optional(),
      contacts: z
        .array(
          z.object({
            kind: z.enum(["gf", "buchhaltung", "extra"]),
            vorname: z.string(),
            nachname: z.string(),
            handy: z.string().optional(),
            telefon: z.string().optional(),
            email: z.string().email(),
            jobbezeichnung: z.string().optional(),
            newsletterHandy: z.boolean().optional(),
            newsletterEmail: z.boolean().optional(),
          }),
        )
        .min(1),
    }),
  )
  .handler(async ({ data }) => {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) {
      return { synced: false, demo: true };
    }

    // --- 1. Firma finden, anlegen oder aktualisieren ------------------------
    const domain = normalizeDomain(data.website);
    const found = domain
      ? await findCompany(token, "domain", domain)
      : await findCompany(token, "name", data.companyName);

    const companyProperties = buildCompanyProperties(data, domain);
    companyProperties.labels2 = computeLabels2(found?.labels2, data.memberType);

    let companyId: string | null = null;
    const companyAlreadyExisted = !!found;

    if (found) {
      companyId = found.id;
      const patched = await hubspotFetch(token, `/crm/v3/objects/companies/${found.id}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: companyProperties }),
      });
      if (!patched.ok) {
        console.error("[syncCustomerToHubspot] Company-Update-Fehler:", patched.body);
        return {
          synced: false,
          demo: false,
          error: patched.body?.message ?? "Company-Update fehlgeschlagen",
        };
      }
    } else {
      const created = await hubspotFetch(token, "/crm/v3/objects/companies", {
        method: "POST",
        body: JSON.stringify({ properties: companyProperties }),
      });
      if (!created.ok) {
        console.error("[syncCustomerToHubspot] Company-Anlage-Fehler:", created.body);
        return {
          synced: false,
          demo: false,
          error: created.body?.message ?? "Company konnte nicht angelegt werden",
        };
      }
      companyId = created.body.id;
    }

    // --- 2. Alle Kontakte anlegen/aktualisieren + verknüpfen ----------------
    const contactResults: Array<{
      email: string;
      ok: boolean;
      primary?: boolean;
      error?: string;
    }> = [];

    for (const contact of data.contacts) {
      const properties = buildContactProperties(data.companyName, contact);
      const upserted = await upsertContact(token, properties, contact.email);

      if (!upserted.id) {
        console.error(`[syncCustomerToHubspot] Contact-Fehler (${contact.email}):`, upserted.error);
        contactResults.push({ email: contact.email, ok: false, error: upserted.error });
        continue;
      }

      const association = await associateContactWithCompany(
        token,
        upserted.id,
        companyId as string,
        contact.kind === "gf",
      );
      if (!association.ok) {
        console.error(
          `[syncCustomerToHubspot] Verknuepfungs-Fehler (${contact.email}):`,
          association.error,
        );
      }
      contactResults.push({
        email: contact.email,
        ok: association.ok,
        primary: association.primary,
        error: association.error,
      });
    }

    return {
      synced: true,
      demo: false,
      companyId,
      companyAlreadyExisted,
      contacts: contactResults,
    };
  });

// ---------------------------------------------------------------------------
// HubSpot -> Portal: Kontakt-/Firmenkandidaten für den "Neuer Kunde"-Dialog
// ---------------------------------------------------------------------------

const CANDIDATE_CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "mobilephone",
  "jobtitle",
];
const CANDIDATE_COMPANY_PROPERTIES = ["name", "domain", "zip", "country", "labels2"];

export interface HubspotCandidate {
  companyId: string;
  companyName: string;
  domain?: string;
  postalCode?: string;
  country?: string;
  memberTypeGuess?: "händler" | "lieferant";
  contactId: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Leitet aus labels2 eine Klassifizierungs-Vermutung ab. Bei beiden oder
 *  keinem der beiden Labels bleibt es undefined, der Admin wählt dann manuell. */
function deriveMemberTypeGuess(labels2?: string): "händler" | "lieferant" | undefined {
  if (!labels2) return undefined;
  const hasHaendler = labels2.includes("Händler");
  const hasLieferant = labels2.includes("Lieferant");
  if (hasHaendler === hasLieferant) return undefined;
  return hasHaendler ? "händler" : "lieferant";
}

/** Liefert die IDs der verknüpften Objekte über die v4-Assoziations-API. */
async function getAssociatedIds(
  token: string,
  fromObjectType: "contact" | "company",
  fromId: string,
  toObjectType: "company" | "contact",
): Promise<string[]> {
  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v4/objects/${fromObjectType}/${fromId}/associations/${toObjectType}`,
    { method: "GET" },
  );
  if (!ok) return [];
  const results = body?.results ?? [];
  return results.map((r: any) => String(r.toObjectId)).filter(Boolean);
}

async function getCompanyById(token: string, id: string): Promise<any | null> {
  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v3/objects/companies/${id}?properties=${CANDIDATE_COMPANY_PROPERTIES.join(",")}`,
    { method: "GET" },
  );
  return ok ? body : null;
}

async function getContactById(token: string, id: string): Promise<any | null> {
  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v3/objects/contacts/${id}?properties=${CANDIDATE_CONTACT_PROPERTIES.join(",")}`,
    { method: "GET" },
  );
  return ok ? body : null;
}

function buildCandidate(company: any, contact: any): HubspotCandidate | null {
  if (!company?.id || !contact?.id) return null;
  const companyProps = company.properties ?? {};
  const contactProps = contact.properties ?? {};
  return {
    companyId: company.id,
    companyName: companyProps.name ?? "",
    domain: companyProps.domain || undefined,
    postalCode: companyProps.zip || undefined,
    country: companyProps.country || undefined,
    memberTypeGuess: deriveMemberTypeGuess(companyProps.labels2),
    contactId: contact.id,
    firstName: contactProps.firstname ?? "",
    lastName: contactProps.lastname ?? "",
    email: contactProps.email ?? "",
  };
}

async function searchCandidatesByEmail(token: string, email: string): Promise<HubspotCandidate[]> {
  const { ok, body } = await hubspotFetch(token, "/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
      properties: CANDIDATE_CONTACT_PROPERTIES,
      limit: 1,
    }),
  });
  if (!ok) return [];
  const contact = body?.results?.[0];
  if (!contact) return [];

  const companyIds = await getAssociatedIds(token, "contact", contact.id, "company");
  const candidates: HubspotCandidate[] = [];
  for (const companyId of companyIds) {
    const company = await getCompanyById(token, companyId);
    const candidate = company ? buildCandidate(company, contact) : null;
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}

async function searchCandidatesByCompanyName(token: string, name: string): Promise<HubspotCandidate[]> {
  const { ok, body } = await hubspotFetch(token, "/crm/v3/objects/companies/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "name", operator: "CONTAINS_TOKEN", value: name }] }],
      properties: CANDIDATE_COMPANY_PROPERTIES,
      limit: 10,
    }),
  });
  if (!ok) return [];
  const companies = body?.results ?? [];

  const candidates: HubspotCandidate[] = [];
  for (const company of companies) {
    const contactIds = await getAssociatedIds(token, "company", company.id, "contact");
    for (const contactId of contactIds) {
      const contact = await getContactById(token, contactId);
      const candidate = contact ? buildCandidate(company, contact) : null;
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

/** Sucht HubSpot-Kandidaten (Firma + Kontakt) für den "Neuer Kunde"-Dialog,
 *  entweder per Kontakt-E-Mail oder per Firmennamen-Teiltreffer. Bewusst
 *  schlank gehalten (wenige Properties) – für die volle Vorbefüllung nach
 *  Auswahl eines Treffers siehe importHubspotCompanyData unten. */
export const searchHubspotCandidates = createServerFn({ method: "POST" })
  .validator(
    z.object({
      mode: z.enum(["email", "company"]),
      query: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) {
      return { candidates: [], demo: true };
    }

    const candidates =
      data.mode === "email"
        ? await searchCandidatesByEmail(token, data.query)
        : await searchCandidatesByCompanyName(token, data.query);

    return { candidates, demo: false };
  });

// ---------------------------------------------------------------------------
// HubSpot -> Portal: volle Firmen-/Kontaktdaten für die Stammdaten-
// Vorbefüllung. Wird aufgerufen, NACHDEM der Nutzer eine Firma aus der
// Trefferliste von searchHubspotCandidates ausgewählt hat.
// ---------------------------------------------------------------------------

const IMPORT_COMPANY_PROPERTIES = [
  "name",
  "address",
  "address2",
  "zip",
  "city",
  "country",
  "e_mail_adresse",
  "website",
  "domain",
  "n06__zr_ab",
  "ust_idnr_",
  "n04__gln",
  "n03__umsatz_haus",
  "n01__sortiment__geklont_",
  "labels2",
];

const IMPORT_CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "mobilephone",
  "phone",
  "email",
  "jobtitle",
  "jobklassifikation",
];

export interface HubspotImportContact {
  kind: ContactKind;
  vorname: string;
  nachname: string;
  handy: string;
  telefon: string;
  email: string;
  jobbezeichnung?: string;
}

export interface HubspotImportData {
  companyName: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  land?: string;
  webseite?: string;
  emailFirma?: string;
  zrStartDate?: string;
  ustId?: string;
  glnNr?: string;
  umsatz?: string;
  sortiment?: string[];
  memberTypeGuess?: "händler" | "lieferant";
  contacts: HubspotImportContact[];
}

async function getCompanyContacts(token: string, companyId: string): Promise<any[]> {
  const contactIds = await getAssociatedIds(token, "company", companyId, "contact");
  const contacts: any[] = [];
  for (const id of contactIds) {
    const contact = await hubspotFetch(
      token,
      `/crm/v3/objects/contacts/${id}?properties=${IMPORT_CONTACT_PROPERTIES.join(",")}`,
      { method: "GET" },
    );
    if (contact.ok && contact.body) contacts.push(contact.body);
  }
  return contacts;
}

export const importHubspotCompanyData = createServerFn({ method: "POST" })
  .validator(z.object({ companyId: z.string() }))
  .handler(async ({ data }) => {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) {
      return { imported: false as const, demo: true };
    }

    const { ok, body: company } = await hubspotFetch(
      token,
      `/crm/v3/objects/companies/${data.companyId}?properties=${IMPORT_COMPANY_PROPERTIES.join(",")}`,
      { method: "GET" },
    );
    if (!ok || !company) {
      return { imported: false as const, demo: false, error: "Firma nicht gefunden" };
    }
    const p = company.properties ?? {};

    const rawContacts = await getCompanyContacts(token, data.companyId);
    const contacts: HubspotImportContact[] = rawContacts.map((c) => {
      const cp = c.properties ?? {};
      return {
        kind: guessContactKind(cp.jobklassifikation),
        vorname: cp.firstname ?? "",
        nachname: cp.lastname ?? "",
        handy: cp.mobilephone ?? "",
        telefon: cp.phone ?? "",
        email: cp.email ?? "",
        jobbezeichnung: cp.jobtitle || undefined,
      };
    });

    // Straße + Hausnummer: HubSpot trennt in address/address2, das Portal
    // hat aktuell nur ein zusammenhängendes "strasse"-Feld -> zusammenfügen.
    // Falls es im Portal doch ein separates Hausnummer-Feld gibt, hier Bescheid
    // geben, dann trenne ich das sauber auf.
    const strasse = [p.address, p.address2].filter(Boolean).join(" ").trim() || undefined;

    const result: HubspotImportData = {
      companyName: p.name ?? "",
      strasse,
      plz: p.zip || undefined,
      ort: p.city || undefined,
      land: p.country || undefined,
      webseite: p.website || p.domain || undefined,
      emailFirma: p.e_mail_adresse || undefined,
      zrStartDate: p.n06__zr_ab || undefined,
      ustId: p.ust_idnr_ || undefined,
      glnNr: p.n04__gln || undefined,
      umsatz: p.n03__umsatz_haus || undefined,
      sortiment: p.n01__sortiment__geklont_
        ? p.n01__sortiment__geklont_
            .split(";")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
      memberTypeGuess: deriveMemberTypeGuess(p.labels2),
      contacts,
    };

    return { imported: true as const, demo: false, data: result };
  });
