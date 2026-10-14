import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";
const SESSION_LIFETIME_SECONDS = 86400; // 24 Stunden pro Klick

// MUSS identisch zu signDocId in api.hubspot-vertrag-senden.ts sein
function signDocId(docId: string, secret: string): string {
  return createHmac("sha256", secret).update(docId).digest("base64url");
}

function signatureMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function page(status: number, title: string, text: string): Response {
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.5rem;color:#1a1a1a;line-height:1.5}h1{font-size:1.25rem}</style></head>
<body><h1>${title}</h1><p>${text}</p></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/vertrag/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const linkSecret = process.env.VERTRAG_LINK_SECRET;
        const pandadocKey = process.env.PANDADOC_API_KEY;
        if (!linkSecret || !pandadocKey) {
          console.error("[vertrag-kunde] Umgebungsvariable fehlt");
          return page(500, "Technischer Fehler", "Bitte wenden Sie sich an Ihren unitex-Ansprechpartner.");
        }

        // Token = <docId>.<signatur>
        const token = String(params.token ?? "");
        const dot = token.indexOf(".");
        const docId = dot > 0 ? token.slice(0, dot) : "";
        const signature = dot > 0 ? token.slice(dot + 1) : "";
        if (
          !/^[A-Za-z0-9]+$/.test(docId) ||
          !signature ||
          !signatureMatches(signature, signDocId(docId, linkSecret))
        ) {
          console.warn("[vertrag-kunde] Ungueltiger Link aufgerufen");
          return page(404, "Link ung&uuml;ltig", "Dieser Link ist nicht (mehr) g&uuml;ltig. Bitte wenden Sie sich an Ihren unitex-Ansprechpartner.");
        }

        // Dokument-Details (Status + Empfaenger) holen
        const headers = { Authorization: `API-Key ${pandadocKey}`, "Content-Type": "application/json" };
        const detailsRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/details`, { headers });
        const details: any = await detailsRes.json().catch(() => null);
        if (!detailsRes.ok || !details?.status) {
          console.error(`[vertrag-kunde] Details fuer ${docId} nicht lesbar (Status ${detailsRes.status}): ${JSON.stringify(details)}`);
          return page(502, "Vertrag derzeit nicht abrufbar", "Bitte versuchen Sie es in einigen Minuten erneut.");
        }

        const status: string = details.status;
        if (status === "document.completed") {
          return page(200, "Bereits unterschrieben", "Dieser Vertrag wurde bereits unterschrieben. Vielen Dank!");
        }
        if (status !== "document.sent" && status !== "document.viewed") {
          console.warn(`[vertrag-kunde] Dokument ${docId} hat Status ${status}, noch nicht bereit`);
          return page(409, "Vertrag noch nicht bereit", "Dieser Vertrag steht noch nicht zur Unterschrift bereit. Bitte wenden Sie sich an Ihren unitex-Ansprechpartner.");
        }

        // Kunden-Empfaenger finden (Rolle "Client", sonst erste Adresse ausserhalb unitex.de)
        const recipients: any[] = Array.isArray(details.recipients) ? details.recipients : [];
        const client =
          recipients.find((r) => r?.role === "Client" && r?.email) ??
          recipients.find((r) => r?.email && !String(r.email).toLowerCase().endsWith("@unitex.de"));
        if (!client) {
          console.error(`[vertrag-kunde] Dokument ${docId}: kein Kunden-Empfaenger gefunden`);
          return page(502, "Vertrag derzeit nicht abrufbar", "Bitte wenden Sie sich an Ihren unitex-Ansprechpartner.");
        }

        // Frische Session erzeugen und weiterleiten
        const sessionRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/session`, {
          method: "POST",
          headers,
          body: JSON.stringify({ recipient: client.email, lifetime: SESSION_LIFETIME_SECONDS }),
        });
        const session: any = await sessionRes.json().catch(() => null);
        if (!sessionRes.ok || !session?.id) {
          console.error(`[vertrag-kunde] Session fuer ${docId} fehlgeschlagen (Status ${sessionRes.status}): ${JSON.stringify(session)}`);
          return page(502, "Vertrag derzeit nicht abrufbar", "Bitte versuchen Sie es in einigen Minuten erneut.");
        }

        console.log(`[vertrag-kunde] Weiterleitung fuer Dokument ${docId}`);
        return new Response(null, {
          status: 302,
          headers: { Location: `https://app.pandadoc.com/s/${session.id}`, "Cache-Control": "no-store" },
        });
      },
    },
  },
});