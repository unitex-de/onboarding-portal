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
  umsatz?: string;
  mitarbeiter?: string;
  gruendung?: string;
  ustId?: string;
  glnNr?: string;
  sortiment?: string[];
  marken?: string;
  zrVolumen?: string;
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
  if (input.umsatz) props.annualrevenue = input.umsatz;
  if (input.mitarbeiter) props.numberofemployees = input.mitarbeiter;
  if (input.gruendung) props.founded_year = input.gruendung;
  if (input.ustId) props.ust_idnr_ = input.ustId;
  if (input.glnNr) props.n04__gln = input.glnNr;
  if (input.sortiment && input.sortiment.length > 0) {
    props.n01__sortiment__geklont_ = input.sortiment.join(";");
  }
  if (input.marken) props.n03__marken__nur_lieferanten_ = input.marken;
  if (input.zrVolumen) props.n05__umsatz_zr__ca____autom__ = input.zrVolumen;
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
      umsatz: z.string().optional(),
      mitarbeiter: z.string().optional(),
      gruendung: z.string().optional(),
      ustId: z.string().optional(),
      glnNr: z.string().optional(),
      sortiment: z.array(z.string()).optional(),
      marken: z.string().optional(),
      zrVolumen: z.string().optional(),
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