import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

const COMPANY_PROPERTIES = [
  "name",
  "address",
  "address2",
  "zip",
  "city",
  "n06__zr_ab",
  "vertragslaufzeit",
];
const CONTACT_PROPERTIES = ["firstname", "lastname", "email", "jobklassifikation"];

function tokenMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function hubspotGet(
  token: string,
  path: string,
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

export const Route = createFileRoute("/api/hubspot-vertrag")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.HUBSPOT_WEBHOOK_TOKEN;
        const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
        if (!expectedToken || !hubspotToken) {
          console.error("[hubspot-vertrag] HUBSPOT_WEBHOOK_TOKEN oder HUBSPOT_ACCESS_TOKEN fehlt");
          return new Response("Server misconfigured", { status: 500 });
        }

        const url = new URL(request.url);
        if (!tokenMatches(url.searchParams.get("token"), expectedToken)) {
          console.warn("[hubspot-vertrag] Ungültiger Token, Request abgelehnt");
          return new Response("Unauthorized", { status: 401 });
        }

        const rawBody = await request.text();
        let body: any = null;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const companyId = String(body?.hs_object_id ?? body?.object?.objectId ?? body?.companyId ?? "");
        if (!companyId) {
          console.warn("[hubspot-vertrag] Keine Unternehmens-ID im Body gefunden");
          return new Response("companyId fehlt", { status: 400 });
        }
        console.log(`[hubspot-vertrag] Vertrag angefordert für Unternehmen ${companyId}`);

        // 1) Unternehmen lesen
        const companyRes = await hubspotGet(
          hubspotToken,
          `/crm/v3/objects/companies/${companyId}?properties=${COMPANY_PROPERTIES.join(",")}`,
        );
        if (!companyRes.ok || !companyRes.body) {
          console.error(`[hubspot-vertrag] Unternehmen ${companyId} nicht lesbar (Status ${companyRes.status})`);
          return new Response("Unternehmen nicht gefunden", { status: 502 });
        }
        const p = companyRes.body.properties ?? {};

        // 2) Kontakte lesen und GF als Client Signer wählen
        const assocRes = await hubspotGet(
          hubspotToken,
          `/crm/v4/objects/company/${companyId}/associations/contact`,
        );
        const contactIds: string[] = (assocRes.ok ? (assocRes.body?.results ?? []) : []).map(
          (r: any) => String(r.toObjectId),
        );
        const gfContacts: any[] = [];
        for (const id of contactIds) {
          const c = await hubspotGet(
            hubspotToken,
            `/crm/v3/objects/contacts/${id}?properties=${CONTACT_PROPERTIES.join(",")}`,
          );
          if (c.ok && c.body?.properties?.jobklassifikation === "I/GF" && c.body.properties.email) {
            gfContacts.push(c.body.properties);
          }
        }
        if (gfContacts.length > 1) {
          console.warn(`[hubspot-vertrag] ${gfContacts.length} GF-Kontakte mit E-Mail gefunden, nehme den ersten`);
        }
        const signer = gfContacts[0];

        // 3) Vollständigkeit prüfen
        const data = {
          firmenname: p.name,
          strasse: p.address,
          hausnummer: p.address2,
          plz: p.zip,
          ort: p.city,
          zrStart: p.n06__zr_ab,
          laufzeit: p.vertragslaufzeit,
          signerVorname: signer?.firstname,
          signerNachname: signer?.lastname,
          signerEmail: signer?.email,
        };
        const missing = Object.entries(data)
          .filter(([, v]) => !v || !String(v).trim())
          .map(([k]) => k);

        // Testphase: Rohwerte protokollieren, später reduzieren
        console.log("[hubspot-vertrag] Daten:", JSON.stringify({ ...data, contactCount: contactIds.length }));

        if (missing.length > 0) {
          console.warn(`[hubspot-vertrag] Fehlende Angaben: ${missing.join(", ")}`);
          return new Response(`Fehlende Angaben: ${missing.join(", ")}`, { status: 422 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});