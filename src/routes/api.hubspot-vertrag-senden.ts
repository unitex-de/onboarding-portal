import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";
const PORTAL_BASE = "https://onboarding.unitex.de";

function tokenMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Signatur für den festen Kundenlink: HMAC-SHA256 über die Dokument-ID
function signDocId(docId: string, secret: string): string {
  return createHmac("sha256", secret).update(docId).digest("base64url");
}

export const Route = createFileRoute("/api/hubspot-vertrag-senden")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.HUBSPOT_WEBHOOK_TOKEN;
        const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
        const pandadocKey = process.env.PANDADOC_API_KEY;
        const linkSecret = process.env.VERTRAG_LINK_SECRET;
        if (!expectedToken || !hubspotToken || !pandadocKey || !linkSecret) {
          console.error("[vertrag-senden] Umgebungsvariable fehlt");
          return new Response("Server misconfigured", { status: 500 });
        }

        const url = new URL(request.url);
        if (!tokenMatches(url.searchParams.get("token"), expectedToken)) {
          console.warn("[vertrag-senden] Ungültiger Token, Request abgelehnt");
          return new Response("Unauthorized", { status: 401 });
        }

        let body: any = null;
        try {
          body = JSON.parse(await request.text());
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const companyId = String(body?.hs_object_id ?? "");
        if (!/^\d+$/.test(companyId)) {
          console.warn(`[vertrag-senden] Ungültige Unternehmens-ID: ${companyId}`);
          return json(400, { ok: false, problem: "hs_object_id fehlt oder ist keine Zahl" });
        }
        console.log(`[vertrag-senden] Versand angefordert für Unternehmen ${companyId}`);

        // 1) Unternehmen lesen
        const companyRes = await fetch(
          `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}?properties=name,pandadoc_link,vertrag_freigeben`,
          { headers: { Authorization: `Bearer ${hubspotToken}` } },
        );
        const company: any = await companyRes.json().catch(() => null);
        if (!companyRes.ok || !company) {
          console.error(`[vertrag-senden] Unternehmen ${companyId} nicht lesbar (Status ${companyRes.status})`);
          return json(404, { ok: false, problem: "Unternehmen nicht gefunden" });
        }
        const p = company.properties ?? {};

        // 2) Sicherheitsprüfung: nur bei Freigabe durch MGS
        if (p.vertrag_freigeben !== "true") {
          console.warn(`[vertrag-senden] Unternehmen ${companyId}: vertrag_freigeben ist nicht true (${p.vertrag_freigeben})`);
          return json(409, { ok: false, problem: "Vertrag ist nicht freigegeben" });
        }

        // 3) Dokument-ID aus pandadoc_link
        const match = String(p.pandadoc_link ?? "").match(/documents\/([A-Za-z0-9]+)/);
        if (!match) {
          console.warn(`[vertrag-senden] Unternehmen ${companyId}: kein gültiger pandadoc_link`);
          return json(409, { ok: false, problem: "pandadoc_link fehlt oder ist ungültig" });
        }
        const docId = match[1];

        // 4) Status in PandaDoc prüfen
        const pdHeaders = { Authorization: `API-Key ${pandadocKey}`, "Content-Type": "application/json" };
        const statusRes = await fetch(`${PANDADOC_BASE}/documents/${docId}`, { headers: pdHeaders });
        const statusBody: any = await statusRes.json().catch(() => null);
        if (!statusRes.ok || !statusBody?.status) {
          console.error(`[vertrag-senden] Status für ${docId} nicht lesbar (Status ${statusRes.status}): ${JSON.stringify(statusBody)}`);
          return json(502, { ok: false, step: "status", status: statusRes.status, error: statusBody });
        }
        const docStatus: string = statusBody.status;

        // 5) Stumm versenden (nur aus dem Entwurf heraus)
        let sentNow = false;
        if (docStatus === "document.draft") {
          const sendRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/send`, {
            method: "POST",
            headers: pdHeaders,
            body: JSON.stringify({ silent: true }),
          });
          const sendBody: any = await sendRes.json().catch(() => null);
          if (!sendRes.ok) {
            console.error(`[vertrag-senden] Versand ${docId} fehlgeschlagen (Status ${sendRes.status}): ${JSON.stringify(sendBody)}`);
            return json(502, { ok: false, step: "send", status: sendRes.status, error: sendBody });
          }
          sentNow = true;
          console.log(`[vertrag-senden] Dokument ${docId} stumm versendet`);
        } else if (docStatus === "document.sent" || docStatus === "document.viewed") {
          console.log(`[vertrag-senden] Dokument ${docId} war bereits versendet (${docStatus}), nur Link wird geschrieben`);
        } else {
          console.warn(`[vertrag-senden] Dokument ${docId} hat unerwarteten Status ${docStatus}`);
          return json(409, { ok: false, problem: `Dokument hat Status ${docStatus}` });
        }

        // 6) Festen Kundenlink bauen und nach HubSpot schreiben
        const kundenLink = `${PORTAL_BASE}/vertrag/${docId}.${signDocId(docId, linkSecret)}`;
        const patchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${hubspotToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: { pandadoc_link_kunde: kundenLink } }),
        });
        const patchBody: any = await patchRes.json().catch(() => null);
        if (!patchRes.ok) {
          // Fehlerstatus, damit HubSpot wiederholt. Beim erneuten Aufruf wird nicht doppelt versendet.
          console.error(`[vertrag-senden] pandadoc_link_kunde für ${companyId} nicht gesetzt (Status ${patchRes.status}): ${JSON.stringify(patchBody)}`);
          return json(502, { ok: false, step: "hubspot", status: patchRes.status, error: patchBody });
        }

        console.log(`[vertrag-senden] Unternehmen ${companyId}: Kundenlink gesetzt`);
        return json(200, { ok: true, docId, docStatusVorher: docStatus, sentNow, kundenLink });
      },
    },
  },
});