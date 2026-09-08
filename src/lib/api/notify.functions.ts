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
import { supabaseAdmin } from "@/lib/supabase-admin";

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

// ---------------------------------------------------------------------------
// Tägliche Digest-Mail an Tanja: fasst alle noch nicht gemeldeten Einträge
// aus change_log zusammen (Kunden-/Mitbearbeiter-Änderungen an Formulardaten
// und Dokumenten), gruppiert nach Firma. Wird per Vercel Cron ausgelöst, nicht
// direkt vom Client. Sendet nichts, wenn es keine offenen Einträge gibt.
// ---------------------------------------------------------------------------
const CHANGE_KIND_LABELS: Record<string, string> = {
  section_saved: "Abschnitt gespeichert",
  document_uploaded: "Dokument hochgeladen",
  document_removed: "Dokument entfernt",
};

export const notifyChangeLogDigest = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const tanjaEmail = process.env.TANJA_EMAIL;
  if (!apiKey || !tanjaEmail) {
    return { sent: false, demo: true };
  }

  const { data: rows, error } = await supabaseAdmin
    .from("change_log")
    .select("id, customer_id, actor_email, kind, target, created_at, customers(company)")
    .eq("notified", false)
    .order("customer_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[notifyChangeLogDigest] Laden fehlgeschlagen:", error);
    return { sent: false, demo: false, error: error.message };
  }
  if (!rows || rows.length === 0) {
    return { sent: false, demo: false, skipped: "no_changes" };
  }

  // Gruppieren nach Kunde
  const byCustomer = new Map<string, { company: string; entries: typeof rows }>();
  for (const row of rows) {
    const company = (row as any).customers?.company ?? "Unbekannte Firma";
    const group = byCustomer.get(row.customer_id) ?? { company, entries: [] as typeof rows };
    group.entries.push(row);
    byCustomer.set(row.customer_id, group);
  }

  const sections = Array.from(byCustomer.values()).map((group) => {
    const items = group.entries.map((e) => {
      const time = new Date(e.created_at).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      const label = CHANGE_KIND_LABELS[e.kind] ?? e.kind;
      return `<li>${time} Uhr – ${label}: <code>${e.target}</code> (${e.actor_email})</li>`;
    }).join("");
    return `<p style="margin-bottom:4px;"><strong>${group.company}</strong></p><ul style="margin-top:0;">${items}</ul>`;
  }).join("");

  const resend = new Resend(apiKey);
  const { to, subject } = resolveRecipient(
    tanjaEmail,
    `Tägliche Änderungsübersicht: ${byCustomer.size} Kunde${byCustomer.size === 1 ? "" : "n"} mit Änderungen`,
  );
  const { error: sendError } = await resend.emails.send({
    from: ABSENDER,
    to,
    subject,
    html: `
      <p>Hallo Tanja,</p>
      <p>Folgende Kunden haben seit der letzten Übersicht Angaben im Onboarding-Portal geändert:</p>
      ${sections}
    `,
  });
  if (sendError) {
    console.error("[notifyChangeLogDigest] Resend error:", sendError);
    return { sent: false, demo: false, error: sendError.message };
  }

  const ids = rows.map((r) => r.id);
  const { error: updateError } = await supabaseAdmin
    .from("change_log")
    .update({ notified: true })
    .in("id", ids);
  if (updateError) {
    console.error("[notifyChangeLogDigest] Markieren als notified fehlgeschlagen:", updateError);
  }

  return { sent: true, demo: false, count: rows.length };
});