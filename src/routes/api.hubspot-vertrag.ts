import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// --- PandaDoc-Konfiguration (Template "Anschluss-Vertrag Händler ZR") ---
const TEMPLATE_ID = "dmTxoEw7cxUFoMKhEJFMk9";
const ROLE_CLIENT = "Client";
const ROLE_UNITEX = "unitex";
const BLOCK_LAUFZEIT = "Content Placeholder 1";
const BLOCK_ZUSATZ = "Content Placeholder 2";
const LAUFZEIT_ITEMS: Record<string, string> = {
  "1 Jahr": "dwqdzoVmh9LL3BsftPUUtW",
  "3 Jahre": "QJFmRe8aMez3UyENb85qVj",
  "5 Jahre": "65VPHHmVznFKhGdsXj8CtR",
};
const ZUSATZ_5_JAHRE = "Fr5NgG2rXZUFSD8CU67C4o";
const ZUSATZ_STANDARD = "cVD89rdwZqTBFXTBpebt2g";
const FOLDER_UUID = "FBYhPMbuynzG7Ebmxmnqa2"; // Ordner Haendler_ZR_Vertraege (mit MGS geteilt)

// Unterzeichner für unitex
const UNITEX_SIGNER = { first_name: "Xaver", last_name: "Albrecht", email: "x.albrecht@unitex.de" };

// TESTMODUS: solange true, bekommt die Rolle unitex die Testadresse statt Xaver,
// und der Aufruf darf "testLaufzeit" und "testZrStart" mitgeben.
const TEST_MODE = true;
const TEST_EMAIL_UNITEX = "projekte@unitex.de";

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

async function hubspotPatchCompany(
  token: string,
  companyId: string,
  properties: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties }),
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
        const pandadocKey = process.env.PANDADOC_API_KEY;
        if (!expectedToken || !hubspotToken || !pandadocKey) {
          console.error("[hubspot-vertrag] Umgebungsvariable fehlt (Webhook-Token, HubSpot oder PandaDoc)");
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
        const zrStart: string | undefined =
          TEST_MODE && typeof body?.testZrStart === "string" ? body.testZrStart : p.n06__zr_ab;
        const laufzeit: string | undefined =
          TEST_MODE && typeof body?.testLaufzeit === "string" ? body.testLaufzeit : p.vertragslaufzeit;
        const data = {
          firmenname: p.name,
          strasse: p.address,
          hausnummer: p.address2,
          plz: p.zip,
          ort: p.city,
          zrStart,
          laufzeit,
          signerVorname: signer?.firstname,
          signerNachname: signer?.lastname,
          signerEmail: signer?.email,
        };
        const problems: string[] = Object.entries(data)
          .filter(([, v]) => !v || !String(v).trim())
          .map(([k]) => k);

        if (data.laufzeit && !LAUFZEIT_ITEMS[String(data.laufzeit).trim()]) {
          problems.push(`laufzeit (nicht unterstützt: ${data.laufzeit})`);
        }

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

        // 5) Entwurf in PandaDoc anlegen (kein Versand)
        const laufzeitKey = String(data.laufzeit).trim();
        const zusatzId = laufzeitKey === "5 Jahre" ? ZUSATZ_5_JAHRE : ZUSATZ_STANDARD;

        const unitexRecipient = TEST_MODE
          ? { ...UNITEX_SIGNER, email: TEST_EMAIL_UNITEX }
          : UNITEX_SIGNER;

        const createPayload = {
          name: `Anschluss-Vertrag ${data.firmenname}`,
          template_uuid: TEMPLATE_ID,
          folder_uuid: FOLDER_UUID,
          recipients: [
            {
              email: data.signerEmail,
              first_name: data.signerVorname,
              last_name: data.signerNachname,
              role: ROLE_CLIENT,
            },
            { ...unitexRecipient, role: ROLE_UNITEX },
          ],
          tokens: [
            { name: "Firmenname", value: data.firmenname },
            { name: "Strasse", value: data.strasse },
            { name: "Hausnummer", value: data.hausnummer },
            { name: "PLZ", value: data.plz },
            { name: "Ort", value: data.ort },
            { name: "ZR_Startdatum", value: toGermanDate(data.zrStart!) },
            { name: "Kuendigung_ab", value: kuendigungAbDe },
            { name: "Laufzeit", value: laufzeitKey },
          ],
          content_placeholders: [
            {
              block_id: BLOCK_LAUFZEIT,
              content_library_items: [{ id: LAUFZEIT_ITEMS[laufzeitKey] }],
            },
            {
              block_id: BLOCK_ZUSATZ,
              content_library_items: [{ id: zusatzId }],
            },
          ],
          metadata: { hubspot_company_id: companyId },
        };

        const createRes = await fetch(`${PANDADOC_BASE}/documents`, {
          method: "POST",
          headers: { Authorization: `API-Key ${pandadocKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });
        const created: any = await createRes.json().catch(() => null);
        if (!createRes.ok || !created?.id) {
          console.error(
            `[hubspot-vertrag] PandaDoc-Erstellung fehlgeschlagen für ${companyId} (Status ${createRes.status}): ${JSON.stringify(created)}`,
          );
          return json(502, { ok: false, step: "pandadoc", status: createRes.status, error: created, ...result });
        }

        console.log(`[hubspot-vertrag] Unternehmen ${companyId}: Entwurf ${created.id} angelegt`);
        const docUrl = `https://app.pandadoc.com/a/#/documents/${created.id}`;

        // 6) Link nach HubSpot zurückschreiben
        const patchRes = await hubspotPatchCompany(hubspotToken, companyId, { pandadoc_link: docUrl });
        if (!patchRes.ok) {
          console.error(
            `[hubspot-vertrag] pandadoc_link für ${companyId} nicht gesetzt (Status ${patchRes.status}): ${JSON.stringify(patchRes.body)}`,
          );
        } else {
          console.log(`[hubspot-vertrag] Unternehmen ${companyId}: pandadoc_link gesetzt`);
        }

        return json(200, {
          ok: true,
          testMode: TEST_MODE,
          ...result,
          pandadoc: { id: created.id, status: created.status, url: docUrl },
          hubspotLink: patchRes.ok
            ? { ok: true }
            : { ok: false, status: patchRes.status, error: patchRes.body },
        });
      },
    },
  },
});