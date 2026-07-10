import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Extrahiert eine reine Domain aus einer Webseiten-Eingabe, z.B.
 *  "https://www.dundermifflin.de/kontakt" -> "dundermifflin.de"
 *  Gibt null zurück, wenn kein brauchbarer Wert vorliegt.
 */
function normalizeDomain(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    // Falls kein Protokoll angegeben ist, eins ergänzen, damit URL() funktioniert
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
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

/** Sucht eine Company anhand eines Property-Werts (domain oder name). */
async function findCompanyId(
  token: string,
  propertyName: "domain" | "name",
  value: string,
): Promise<string | null> {
  const { ok, body } = await hubspotFetch(
    token,
    "/crm/v3/objects/companies/search",
    {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName, operator: "EQ", value },
            ],
          },
        ],
        properties: ["name", "domain"],
        limit: 1,
      }),
    },
  );
  if (!ok) return null;
  const first = body?.results?.[0];
  return first?.id ?? null;
}

async function createCompany(
  token: string,
  properties: Record<string, string>,
): Promise<{ id: string | null; error?: string }> {
  const { ok, body } = await hubspotFetch(token, "/crm/v3/objects/companies", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });
  if (!ok) {
    return { id: null, error: body?.message ?? "Unbekannter HubSpot-Fehler (Company)" };
  }
  return { id: body.id };
}

async function associateContactWithCompany(
  token: string,
  contactId: string,
  companyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { ok, body } = await hubspotFetch(
    token,
    `/crm/v4/objects/contact/${contactId}/associations/company/${companyId}`,
    {
      method: "PUT",
      body: JSON.stringify([
        { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 },
      ]),
    },
  );
  if (!ok) {
    return { ok: false, error: body?.message ?? "Unbekannter HubSpot-Fehler (Association)" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kunde nach Freigabe zu HubSpot syncen: Contact + Company + Verknüpfung
// ---------------------------------------------------------------------------
export const syncCustomerToHubspot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string(),
      companyName: z.string(),
      email: z.string().email(),
      website: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;

    // Demo-Modus – kein Token konfiguriert
    if (!token) {
      return { synced: false, demo: true };
    }

    // --- 1. Kontakt anlegen -------------------------------------------------
    let contactId: string | null = null;
    let contactAlreadyExisted = false;

    const contactResult = await hubspotFetch(token, "/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          email: data.email,
          company: data.companyName,
        },
      }),
    });

    if (contactResult.status === 409) {
      contactAlreadyExisted = true;
      // Bestehenden Kontakt anhand der E-Mail nachschlagen, um die ID fuer die
      // Firmen-Verknuepfung zu bekommen.
      const lookup = await hubspotFetch(
        token,
        `/crm/v3/objects/contacts/${encodeURIComponent(data.email)}?idProperty=email`,
        { method: "GET" },
      );
      contactId = lookup.ok ? lookup.body?.id ?? null : null;
    } else if (!contactResult.ok) {
      console.error("[syncCustomerToHubspot] Contact-Fehler:", contactResult.body);
      return {
        synced: false,
        demo: false,
        error: contactResult.body?.message ?? "Unbekannter HubSpot-Fehler (Contact)",
      };
    } else {
      contactId = contactResult.body.id;
    }

    if (!contactId) {
      console.error("[syncCustomerToHubspot] Konnte Contact-ID nicht ermitteln");
      return { synced: false, demo: false, error: "Contact-ID nicht ermittelbar" };
    }

    // --- 2. Firma finden oder anlegen ---------------------------------------
    const domain = normalizeDomain(data.website);
    let companyId: string | null = null;
    let companyAlreadyExisted = false;

    if (domain) {
      companyId = await findCompanyId(token, "domain", domain);
    } else {
      companyId = await findCompanyId(token, "name", data.companyName);
    }

    if (companyId) {
      companyAlreadyExisted = true;
    } else {
      const properties: Record<string, string> = { name: data.companyName };
      if (domain) properties.domain = domain;
      const created = await createCompany(token, properties);
      if (!created.id) {
        console.error("[syncCustomerToHubspot] Company-Fehler:", created.error);
        return {
          synced: contactAlreadyExisted ? false : true,
          demo: false,
          contactId,
          contactAlreadyExisted,
          error: `Company konnte nicht angelegt werden: ${created.error}`,
        };
      }
      companyId = created.id;
    }

    // --- 3. Kontakt mit Firma verknüpfen ------------------------------------
    const association = await associateContactWithCompany(token, contactId, companyId);
    if (!association.ok) {
      console.error("[syncCustomerToHubspot] Verknuepfungs-Fehler:", association.error);
      return {
        synced: true,
        demo: false,
        contactId,
        companyId,
        contactAlreadyExisted,
        companyAlreadyExisted,
        error: `Verknüpfung fehlgeschlagen: ${association.error}`,
      };
    }

    return {
      synced: true,
      demo: false,
      contactId,
      companyId,
      contactAlreadyExisted,
      companyAlreadyExisted,
    };
  });