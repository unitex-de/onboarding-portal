import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function tokenMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/hubspot-vertrag")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedToken = process.env.HUBSPOT_WEBHOOK_TOKEN;
        if (!expectedToken) {
          console.error("[hubspot-vertrag] HUBSPOT_WEBHOOK_TOKEN fehlt");
          return new Response("Server misconfigured", { status: 500 });
        }

        const url = new URL(request.url);
        if (!tokenMatches(url.searchParams.get("token"), expectedToken)) {
          console.warn("[hubspot-vertrag] Ungültiger Token, Request abgelehnt");
          return new Response("Unauthorized", { status: 401 });
        }

        const rawBody = await request.text();
        console.log("[hubspot-vertrag] Body empfangen:", rawBody);

        let body: any = null;
        try {
          body = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const companyId = String(body?.object?.objectId ?? body?.companyId ?? "");
        if (!companyId) {
          console.warn("[hubspot-vertrag] Keine Unternehmens-ID im Body gefunden");
          return new Response("companyId fehlt", { status: 400 });
        }

        console.log(`[hubspot-vertrag] Vertrag angefordert für Unternehmen ${companyId}`);
        return new Response("ok", { status: 200 });
      },
    },
  },
});