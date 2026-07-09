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

// ---------------------------------------------------------------------------
// Kunde benachrichtigen: Nachbesserung nötig
// ---------------------------------------------------------------------------
export const notifyCustomerRejected = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerEmail: z.string().email(),
      companyName: z.string(),
      note: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { sent: false, demo: true };
    }
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to: data.customerEmail,
      subject: `Onboarding: Bitte korrigieren Sie einige Angaben`,
      html: `
        <p>Hallo,</p>
        <p>vielen Dank für die Einreichung Ihrer Onboarding-Unterlagen für <strong>${data.companyName}</strong>.</p>
        <p>Bei der Prüfung ist uns aufgefallen, dass noch etwas korrigiert werden muss:</p>
        <p style="padding:12px; background:#f5f5f5; border-radius:6px;">${data.note}</p>
        <p>Bitte loggen Sie sich im Portal ein, um die Korrektur vorzunehmen und erneut einzureichen.</p>
      `,
    });
    if (error) {
      console.error("[notifyCustomerRejected] Resend error:", error);
      return { sent: false, demo: false, error: error.message };
    }
    return { sent: true, demo: false };
  });