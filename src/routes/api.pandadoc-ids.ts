import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

// TEMPORAER: liest IDs aus PandaDoc, nach Gebrauch wieder loeschen.
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";
const TEMPLATE_ID = "dmTxoEw7cxUFoMKhEJFMk9";

function tokenMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/pandadoc-ids")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const expectedToken = process.env.HUBSPOT_WEBHOOK_TOKEN;
        const apiKey = process.env.PANDADOC_API_KEY;
        if (!expectedToken || !apiKey) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const url = new URL(request.url);
        if (!tokenMatches(url.searchParams.get("token"), expectedToken)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const headers = { Authorization: `API-Key ${apiKey}` };

        const tRes = await fetch(`${PANDADOC_BASE}/templates/${TEMPLATE_ID}/details`, { headers });
        if (!tRes.ok) {
          return json(502, { step: "template", status: tRes.status, body: await tRes.text() });
        }
        const t: any = await tRes.json();

        const lRes = await fetch(
          `${PANDADOC_BASE}/content-library-items?q=${encodeURIComponent("H_ZR-Vertrag")}&count=100`,
          { headers },
        );
        if (!lRes.ok) {
          return json(502, { step: "library", status: lRes.status, body: await lRes.text() });
        }
        const list: any = await lRes.json();
        const rows: any[] = list?.results ?? list?.items ?? [];

        return json(200, {
          templateName: t.name,
          roles: t.roles,
          tokens: t.tokens,
          contentPlaceholders: t.content_placeholders,
          libraryItems: rows.map((r) => ({ id: r.id, name: r.name })),
          libraryResponseKeys: Object.keys(list ?? {}),
        });
      },
    },
  },
});