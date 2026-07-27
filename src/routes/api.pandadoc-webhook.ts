import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { notifyReviewSubmitted } from "@/lib/api/notify.functions";
import { supabaseAdmin } from "@/lib/supabase-admin";
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

function verifySignature(rawBody: string, signature: string | null, sharedKey: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", sharedKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/pandadoc-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sharedKey = process.env.PANDADOC_WEBHOOK_SHARED_KEY;
        if (!sharedKey) {
          console.error("[pandadoc-webhook] PANDADOC_WEBHOOK_SHARED_KEY fehlt");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const url = new URL(request.url);
        const signature = url.searchParams.get("signature");

        if (!verifySignature(rawBody, signature, sharedKey)) {
          console.warn("[pandadoc-webhook] Ungültige Signatur, Request abgelehnt");
          return new Response("Invalid signature", { status: 401 });
        }

        const events = JSON.parse(rawBody) as Array<{
          event: string;
          data?: { id?: string; status?: string };
        }>;

        for (const evt of events) {
          if (evt.event !== "document_state_changed" || evt.data?.status !== "document.completed") {
            continue;
          }
          const documentId = evt.data.id;
          if (!documentId) continue;

          const { data: customer, error: findError } = await supabaseAdmin
            .from("customers")
            .select("id, company, member_type")
            .eq("pandadoc_document_id", documentId)
            .maybeSingle();

          if (findError || !customer) {
            console.error(`[pandadoc-webhook] Kein Kunde zu PandaDoc-Dokument ${documentId} gefunden`, findError);
            continue;
          }

          const now = new Date().toISOString();
          const { error: updateError } = await supabaseAdmin
            .from("customers")
            .update({
              status: "Zur Prüfung eingereicht",
              submitted_at: now,
              reviewed_at: null,
              reviewed_by: null,
              review_note: null,
            })
            .eq("id", customer.id);

          if (updateError) {
            console.error(`[pandadoc-webhook] Status-Update fehlgeschlagen für ${customer.id}`, updateError);
          }
          // Signiertes, digital versiegeltes PDF von PandaDoc laden und in Supabase Storage ablegen
          // WICHTIG: /download-protected funktioniert NUR mit Production-Key, nicht im Sandbox.
          try {
            const apiKey = process.env.PANDADOC_API_KEY;
            let pdfRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/download-protected`, {
              headers: { Authorization: `API-Key ${apiKey}` },
            });
            if (!pdfRes.ok) {
              // Fallback: /download-protected funktioniert nur mit Production-Key (401 im Sandbox).
              // /download liefert kein digital versiegeltes PDF, ist aber rechtlich ausreichend
              // (keins unserer Dokumente erfordert QES) und funktioniert in beiden Modi.
              console.warn(`[pandadoc-webhook] download-protected fehlgeschlagen (${pdfRes.status}), Fallback auf /download`);
              pdfRes = await fetch(`${PANDADOC_BASE}/documents/${documentId}/download`, {
                headers: { Authorization: `API-Key ${apiKey}` },
              });
            }
            if (!pdfRes.ok) {
              throw new Error(`PandaDoc PDF-Download fehlgeschlagen (beide Endpunkte): ${pdfRes.status}`);
            }
            const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
            const storagePath = `${customer.id}/signiert-${documentId}.pdf`;
            const { error: storageError } = await supabaseAdmin.storage
              .from("documents")
              .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
            if (storageError) {
              throw new Error(`Supabase Storage Upload fehlgeschlagen: ${storageError.message}`);
            }
            await supabaseAdmin
              .from("customers")
              .update({ signed_document_path: storagePath })
              .eq("id", customer.id);
          } catch (downloadError) {
            // Nicht blockierend: Status-Update und Benachrichtigung sollen trotzdem durchlaufen
            console.error(`[pandadoc-webhook] Signiertes PDF konnte nicht gespeichert werden für ${customer.id}`, downloadError);
          }
          
          try {
            await notifyReviewSubmitted({
              data: {
                companyName: customer.company ?? "",
                memberType: customer.member_type,
                customerId: customer.id,
              },
            });
          } catch (notifyError) {
            console.error(`[pandadoc-webhook] Benachrichtigung an Tanja fehlgeschlagen für ${customer.id}`, notifyError);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});