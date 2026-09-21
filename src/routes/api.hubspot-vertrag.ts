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

// HubSpot liefert reine Datumsfelder als "JJJJ-MM-TT"
function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function addWeeksIso(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + weeks * 7));
  return dt.toISOString().slice(0, 10);
}

function toGermanDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
        const problems: string[] = Object.entries(data)
          .filter(([, v]) => !v || !String(v).trim())
          .map(([k]) => k);

        // 4) Kündigungsdatum: ZR Beginn + 6 Wochen
        let kuendigungAbIso: string | undefined;
        let kuendigungAbDe: string | undefined;
        if (data.zrStart) {
          if (isIsoDate(data.zrStart)) {
            kuendigungAbIso = addWeeksIso(data.zrStart, 6);
            kuendigungAbDe = toGermanDate(kuendigungAbIso);
          } else {
            problems.push(`zrStart (unerwartetes Format: ${data.zrStart})`);
          }
        }

        const result = { data, kuendigungAbIso, kuendigungAbDe, contactCount: contactIds.length };

        if (problems.length > 0) {
          console.warn(`[hubspot-vertrag] Unternehmen ${companyId}: ${problems.join("; ")}`);
          return json(422, { ok: false, problems, ...result });
        }
        console.log(`[hubspot-vertrag] Unternehmen ${companyId}: Daten vollständig`);
        return json(200, { ok: true, ...result });
      },
    },
  },
});