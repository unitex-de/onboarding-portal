/**
 * PandaDoc Server Functions
 *
 * Requires env vars:
 *   PANDADOC_API_KEY        – API key from PandaDoc workspace
 *   PANDADOC_TEMPLATE_SEPA  – Template ID for SEPA-Mandat
 *   PANDADOC_TEMPLATE_ANSCHLUSS – Template ID for Mitgliedsvertrag
 *   PANDADOC_TEMPLATE_SONDER    – Template ID for Sonderformular
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

const TEMPLATE_IDS: Record<string, string | undefined> = {
  sepa:      process.env.PANDADOC_TEMPLATE_SEPA,
  anschluss: process.env.PANDADOC_TEMPLATE_ANSCHLUSS,
  sonder:    process.env.PANDADOC_TEMPLATE_SONDER,
};

// ---------------------------------------------------------------------------
// Create Document + return signing URL
// ---------------------------------------------------------------------------
export const createSigningSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.enum(["sepa", "anschluss", "sonder"]),
      tokens: z.array(z.object({ label: z.string(), value: z.string() })),
      recipientEmail: z.string().email(),
      recipientName: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.PANDADOC_API_KEY;
    const templateId = TEMPLATE_IDS[data.packageId];

    // Demo mode – no real keys configured yet
    if (!apiKey || !templateId) {
      return { signingUrl: null, documentId: null, demo: true };
    }

    // 1. Create document from template
    const createPayload = {
      name: `unitex Onboarding – ${data.packageId} – ${data.recipientName}`,
      template_uuid: templateId,
      recipients: [
        {
          email: data.recipientEmail,
          first_name: data.recipientName.split(" ")[0] ?? data.recipientName,
          last_name: data.recipientName.split(" ").slice(1).join(" ") || "",
          role: "signer",
        },
      ],
      tokens: data.tokens.map((t) => ({ name: t.label, value: t.value })),
      fields: {},
      metadata: { packageId: data.packageId },
    };

    const createRes = await fetch(`${PANDADOC_BASE}/documents`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`PandaDoc create failed: ${createRes.status} ${err}`);
    }

    const doc = await createRes.json();
    const documentId: string = doc.id;

    // 2. Wait briefly then create embedded signing session
    // (PandaDoc requires document to be in "document.draft" or "document.sent" state)
    await new Promise((r) => setTimeout(r, 1500));

    // Send document to move it to "document.sent"
    await fetch(`${PANDADOC_BASE}/documents/${documentId}/send`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "", silent: true }),
    });

    // 3. Create signing session
    const sessionRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/session`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: data.recipientEmail,
        lifetime: 3600, // 1 hour
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      throw new Error(`PandaDoc session failed: ${sessionRes.status} ${err}`);
    }

    const session = await sessionRes.json();

    return {
      documentId,
      signingUrl: `https://app.pandadoc.com/s/${session.id}`,
      demo: false,
    };
  });

// ---------------------------------------------------------------------------
// Webhook handler – called by PandaDoc when document is completed
// Register this URL in PandaDoc workspace settings:
//   https://yourapp.com/api/pandadoc/webhook
// ---------------------------------------------------------------------------
export const handlePandadocWebhook = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      event: z.string(),
      data: z.object({
        id: z.string(),
        metadata: z.object({ packageId: z.string().optional() }).optional(),
        status: z.string().optional(),
      }),
    }),
  )
  .handler(async ({ data: body }) => {
    // document_state_changed → "document.completed"
    if (body.event === "document_state_changed" && body.data.status === "document.completed") {
      const packageId = body.data.metadata?.packageId;
      // TODO: update Supabase record, trigger HubSpot via Zapier, download PDF
      console.log(`[PandaDoc webhook] document ${body.data.id} completed. Package: ${packageId}`);
    }
    return { received: true };
  });
