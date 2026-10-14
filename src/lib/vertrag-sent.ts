import { createHmac } from "node:crypto";

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";
const PORTAL_BASE = "https://onboarding.unitex.de";

// MUSS identisch zu signDocId in vertrag.$token.ts und api.hubspot-vertrag-senden.ts sein
function signDocId(docId: string, secret: string): string {
  return createHmac("sha256", secret).update(docId).digest("base64url");
}

// Wird aufgerufen, wenn ein PandaDoc-Dokument auf "Gesendet" springt.
// Schreibt den festen Kundenlink nach HubSpot, aber nur bei Vertragsdokumenten
// und nur, wenn die MGS den Vertrag freigegeben hat.
export async function handleContractSent(docId: string): Promise<void> {
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const pandadocKey = process.env.PANDADOC_API_KEY;
  const linkSecret = process.env.VERTRAG_LINK_SECRET;
  if (!hubspotToken || !pandadocKey || !linkSecret) {
    console.error("[vertrag-sent] Umgebungsvariable fehlt");
    return;
  }

  // 1) Metadaten lesen: gehoert das Dokument zu einem Vertrag (hubspot_company_id)?
  const detailsRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/details`, {
    headers: { Authorization: `API-Key ${pandadocKey}` },
  });
  const details: any = await detailsRes.json().catch(() => null);
  if (!detailsRes.ok || !details) {
    console.error(`[vertrag-sent] Details fuer ${docId} nicht lesbar (Status ${detailsRes.status}): ${JSON.stringify(details)}`);
    return;
  }
  const companyId = String(details.metadata?.hubspot_company_id ?? "");
  if (!/^\d+$/.test(companyId)) {
    console.log(`[vertrag-sent] Dokument ${docId} ist kein Vertragsdokument, uebersprungen`);
    return;
  }

  // PandaDoc-Erinnerungen abschalten (die Erinnerung laeuft ueber HubSpot).
  // Bewusst vor der Freigabe-Pruefung, damit sie bei jedem Vertragsdokument abgeschaltet werden.
  try {
    const reminderRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/auto-reminders`, {
      method: "PATCH",
      headers: { Authorization: `API-Key ${pandadocKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    if (!reminderRes.ok) {
      const reminderBody = await reminderRes.text().catch(() => "");
      console.error(`[vertrag-sent] Erinnerungen fuer ${docId} nicht abgeschaltet (Status ${reminderRes.status}): ${reminderBody}`);
    } else {
      console.log(`[vertrag-sent] Dokument ${docId}: PandaDoc-Erinnerungen abgeschaltet`);
    }
  } catch (err) {
    console.error(`[vertrag-sent] Erinnerungs-Aufruf fuer ${docId} fehlgeschlagen`, err);
  }

  // 2) Unternehmen lesen (das Senden durch die MGS gilt als Freigabe)
  const companyRes = await fetch(
    `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}?properties=name,vertrag_freigeben,pandadoc_link_kunde`,
    { headers: { Authorization: `Bearer ${hubspotToken}` } },
  );
  const company: any = await companyRes.json().catch(() => null);
  if (!companyRes.ok || !company) {
    throw new Error(`Unternehmen ${companyId} nicht lesbar (Status ${companyRes.status})`);
  }
  const p = company.properties ?? {};

  // 3) Kundenlink bauen, nicht doppelt schreiben
  const kundenLink = `${PORTAL_BASE}/vertrag/${docId}.${signDocId(docId, linkSecret)}`;
  if (p.pandadoc_link_kunde === kundenLink) {
    console.log(`[vertrag-sent] Unternehmen ${companyId}: Kundenlink war schon gesetzt`);
    return;
  }

  // 4) Nach HubSpot schreiben (loest spaeter den Mail-Workflow aus)
  const patchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${hubspotToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { pandadoc_link_kunde: kundenLink } }),
  });
  if (!patchRes.ok) {
    const patchBody = await patchRes.text().catch(() => "");
    throw new Error(`pandadoc_link_kunde fuer ${companyId} nicht gesetzt (Status ${patchRes.status}): ${patchBody}`);
  }
  console.log(`[vertrag-sent] Unternehmen ${companyId}: Kundenlink gesetzt`);
}