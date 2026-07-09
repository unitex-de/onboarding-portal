/**
 * Notification Server Functions
 *
 * Requires env vars:
 *   RESEND_API_KEY  – API key from Resend (Sending access reicht)
 *   TANJA_EMAIL     – Zieladresse für Prüf-Benachrichtigungen (z.B. t.lemke@unitex.de)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";

const ABSENDER = "unitex Onboarding <onboarding@unitex.de>";

// ---------------------------------------------------------------------------
// Tanja benachrichtigen: Kunde hat Onboarding zur Prüfung eingereicht
// ---------------------------------------------------------------------------
export const notifyReviewSubmitted = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      companyName: z.string(),
      memberType: z.enum(["händler", "lieferant"]),
      customerId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const tanjaEmail = process.env.TANJA_EMAIL;
    console.log("[DEBUG notify handler] apiKey present:", !!apiKey, "| tanjaEmail:", tanjaEmail);
    // Demo-Modus – keine echten Keys konfiguriert
    if (!apiKey || !tanjaEmail) {
      return { sent: false, demo: true };
    }
    const resend = new Resend(apiKey);
    const memberLabel = data.memberType === "lieferant" ? "Lieferant" : "Händler";
    const reviewUrl = `https://onboarding.unitex.de/admin?customer=${data.customerId}`;
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to: tanjaEmail,
      subject: `Neue Prüfung erforderlich: ${data.companyName} (${memberLabel})`,
      html: `
        <p>Hallo Tanja,</p>
        <p><strong>${data.companyName}</strong> (${memberLabel}) hat das Onboarding vollständig ausgefüllt und zur Prüfung eingereicht.</p>
        <p><a href="${reviewUrl}">Zur Prüfung im Admin-Portal</a></p>
      `,
    });
    if (error) {
      console.error("[notifyReviewSubmitted] Resend error:", error);
      return { sent: false, demo: false, error: error.message };
    }
    return { sent: true, demo: false };
  });