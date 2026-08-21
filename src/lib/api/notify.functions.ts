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

/**
 * Sicherheitsnetz fürs Testen: Wenn TEST_EMAIL_OVERRIDE gesetzt ist, geht JEDE
 * Mail (Tanja, Kundenbetreuer, Kunde) an diese eine Adresse statt an den
 * echten Empfänger – verhindert, dass Testkunden echte Kolleg:innen anmailen.
 * Der eigentlich vorgesehene Empfänger bleibt im Betreff sichtbar.
 */
function resolveRecipient(realEmail: string, subject: string): { to: string; subject: string } {
  const override = process.env.TEST_EMAIL_OVERRIDE;
  if (override) {
    return { to: override, subject: `[TEST → ${realEmail}] ${subject}` };
  }
  return { to: realEmail, subject };
}

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
    const { to, subject } = resolveRecipient(tanjaEmail, `Neue Prüfung erforderlich: ${data.companyName} (${memberLabel})`);
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to,
      subject,
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
// Tanja benachrichtigen: Neukundenformular wurde nach Freigabe automatisch
// erstellt und liegt zur Ablage bereit (Punkt 5)
// ---------------------------------------------------------------------------
export const notifyNeukundenformularReady = createServerFn({ method: "POST" })
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
    if (!apiKey || !tanjaEmail) {
      return { sent: false, demo: true };
    }
    const resend = new Resend(apiKey);
    const memberLabel = data.memberType === "lieferant" ? "Lieferant" : "Händler";
    const adminUrl = `https://onboarding.unitex.de/admin?customer=${data.customerId}`;
    const { to, subject } = resolveRecipient(tanjaEmail, `Neukundenformular bereit zur Ablage: ${data.companyName} (${memberLabel})`);
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to,
      subject,
      html: `
        <p>Hallo Tanja,</p>
        <p><strong>${data.companyName}</strong> (${memberLabel}) wurde freigegeben. Das Neukundenformular wurde automatisch erstellt und liegt zur Ablage bereit.</p>
        <p><a href="${adminUrl}">Im Admin-Portal ansehen</a></p>
      `,
    });
    if (error) {
      console.error("[notifyNeukundenformularReady] Resend error:", error);
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
    const { to, subject } = resolveRecipient(data.customerEmail, `Onboarding: Bitte korrigieren Sie einige Angaben`);
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to,
      subject,
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

// ---------------------------------------------------------------------------
// Kundenbetreuer benachrichtigen: GWG-Bogen wurde nach Freigabe automatisch
// erstellt, ist aber noch unvollständig (PEP-Status, Beherrschungsmöglichkeit
// etc.) – bitte prüfen, ggf. ergänzen und an Tanja zur Ablage weiterleiten
// (Punkt 6). Empfänger ist NICHT Tanja, sondern der laut getResponsibleAdmin()
// zuständige Kundenbetreuer.
// ---------------------------------------------------------------------------
export const notifyGwgBogenReady = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      betreuerEmail: z.string().email(),
      betreuerName: z.string(),
      companyName: z.string(),
      memberType: z.enum(["händler", "lieferant"]),
      customerId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { sent: false, demo: true };
    }
    const resend = new Resend(apiKey);
    const memberLabel = data.memberType === "lieferant" ? "Lieferant" : "Händler";
    const adminUrl = `https://onboarding.unitex.de/admin?customer=${data.customerId}`;
    const { to, subject } = resolveRecipient(data.betreuerEmail, `GWG-Bogen zur Prüfung: ${data.companyName} (${memberLabel})`);
    const { error } = await resend.emails.send({
      from: ABSENDER,
      to,
      subject,
      html: `
        <p>Hallo ${data.betreuerName},</p>
        <p><strong>${data.companyName}</strong> (${memberLabel}) wurde freigegeben. Der GWG-Bogen wurde automatisch mit den vorhandenen Daten vorausgefüllt, ist aber nicht vollständig – u.a. PEP-Status, wirtschaftliche Abhängigkeit im Detail und der Bestätigungsblock fehlen noch.</p>
        <p>Bitte prüfe den GWG-Bogen, ergänze die fehlenden Angaben und leite ihn anschließend an Tanja zur Ablage weiter.</p>
        <p><a href="${adminUrl}">Im Admin-Portal ansehen</a></p>
      `,
    });
    if (error) {
      console.error("[notifyGwgBogenReady] Resend error:", error);
      return { sent: false, demo: false, error: error.message };
    }
    return { sent: true, demo: false };
  });