/**
 * PandaDoc Server Functions
 *
 * Ablauf (verifiziert per Sandbox-Tests am 21.07.2026):
 * 1. Fertig ausgefülltes, komplett geflattetes PDF hochladen (parse_form_fields: false)
 * 2. Warten bis document.draft
 * 3. Empfänger-ID aus /details holen
 * 4. Signaturfeld per Koordinaten anlegen (POST /documents/{id}/fields)
 *    WICHTIG: Koordinaten sind KEINE PDF-Punkte, sondern 96-DPI-Pixel von OBEN
 *    (anchor_point: "topleft"). Umrechnung: px = pdfPunkte * 96/72 (= *4/3).
 *    offset_y = (Seitenhöhe_pdf - rect.top_pdf) * 4/3
 * 5. Dokument senden (silent, damit keine PandaDoc-eigene Mail rausgeht)
 * 6. Embedded-Signing-Session erzeugen
 *
 * Requires env vars:
 *   PANDADOC_API_KEY
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// Koordinaten wurden für jedes Formular einzeln im Sandbox verifiziert
// (Neukundenformular: bestätigt am 21.07.2026. Lieferantenstammblatt:
// beide Formulare per Sandbox-Test verifiziert am 21. bzw. 24.07.2026
// visuell bestätigen wie beim Neukundenformular!)
const SIGNATURE_LAYOUT: Record<
  "neukunde" | "lieferant",
  { page: number; offset_x: number; offset_y: number; width: number; height: number }
> = {
  neukunde: { page: 1, offset_x: 499, offset_y: 964, width: 200, height: 53 },
  lieferant: { page: 1, offset_x: 416, offset_y: 987, width: 243, height: 40 },
};

async function pollUntilDraft(documentId: string, apiKey: string, maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${PANDADOC_BASE}/documents/${documentId}`, {
      headers: { Authorization: `API-Key ${apiKey}` },
    });
    const data = await res.json();
    if (data.status === "document.draft") return;
    if (data.status === "document.error") {
      throw new Error(`PandaDoc-Verarbeitung fehlgeschlagen: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("PandaDoc-Dokument hat document.draft nicht rechtzeitig erreicht");
}

export const createSigningSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      packageId: z.enum(["neukunde", "lieferant"]),
      pdfBase64: z.string(), // fertig geflattetes PDF, Base64-kodiert
      recipientEmail: z.string().email(),
      recipientFirstName: z.string(),
      recipientLastName: z.string(),
      documentName: z.string(),
      customerId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.PANDADOC_API_KEY;
    if (!apiKey) {
      throw new Error("PANDADOC_API_KEY ist nicht gesetzt");
    }

    // 1. Dokument aus PDF-Datei erstellen
    const pdfBuffer = Buffer.from(data.pdfBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([pdfBuffer], { type: "application/pdf" }), "formular.pdf");
    form.append(
      "data",
      JSON.stringify({
        name: data.documentName,
        parse_form_fields: false,
        recipients: [
          {
            email: data.recipientEmail,
            first_name: data.recipientFirstName,
            last_name: data.recipientLastName,
            role: "client",
          },
        ],
      }),
    );

    const createRes = await fetch(`${PANDADOC_BASE}/documents`, {
      method: "POST",
      headers: { Authorization: `API-Key ${apiKey}` },
      body: form,
    });
    if (!createRes.ok) {
      throw new Error(`PandaDoc create fehlgeschlagen: ${createRes.status} ${await createRes.text()}`);
    }
    const created = await createRes.json();
    const documentId: string = created.id;

    // 2. Warten bis document.draft
    await pollUntilDraft(documentId, apiKey);

    // 3. Empfänger-ID holen
    const detailsRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/details`, {
      headers: { Authorization: `API-Key ${apiKey}` },
    });
    const details = await detailsRes.json();
    const recipientId: string | undefined = details.recipients?.[0]?.id;
    if (!recipientId) {
      throw new Error("Keine Empfänger-ID in PandaDoc-Dokumentdetails gefunden");
    }

    // 4. Signaturfeld an verifizierter Position anlegen
    const layout = SIGNATURE_LAYOUT[data.packageId];
    const fieldsRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/fields`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [
          {
            type: "signature",
            name: "Unterschrift Kunde",
            assigned_to: recipientId,
            layout: {
              page: layout.page,
              position: {
                offset_x: String(layout.offset_x),
                offset_y: String(layout.offset_y),
                anchor_point: "topleft",
              },
              style: { width: layout.width, height: layout.height },
            },
          },
        ],
      }),
    });
    if (!fieldsRes.ok) {
      throw new Error(`PandaDoc Feld-Erstellung fehlgeschlagen: ${fieldsRes.status} ${await fieldsRes.text()}`);
    }

    // 5. Dokument senden (silent = keine PandaDoc-eigene E-Mail)
    const sendRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/send`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ silent: true }),
    });
    if (!sendRes.ok) {
      throw new Error(`PandaDoc send fehlgeschlagen: ${sendRes.status} ${await sendRes.text()}`);
    }

    // 6. Embedded-Signing-Session erzeugen
    const sessionRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/session`, {
      method: "POST",
      headers: {
        Authorization: `API-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient: data.recipientEmail, lifetime: 3600 }),
    });
    if (!sessionRes.ok) {
      throw new Error(`PandaDoc session fehlgeschlagen: ${sessionRes.status} ${await sessionRes.text()}`);
    }
    const session = await sessionRes.json();
    
    // documentId in Supabase hinterlegen, damit der Webhook den Kunden später zuordnen kann
    const { error: persistError } = await supabaseAdmin
      .from("customers")
      .update({ pandadoc_document_id: documentId })
      .eq("id", data.customerId);
    if (persistError) {
      throw new Error(`pandadoc_document_id konnte nicht gespeichert werden: ${persistError.message}`);
    }
    
    return {
      documentId,
      signingUrl: `https://app.pandadoc.com/s/${session.id}`,
    };
  });