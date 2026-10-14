const HUBSPOT_API_BASE = "https://api.hubapi.com";
const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// Wird bei "document.completed" aufgerufen.
// Gibt true zurueck, wenn das Dokument ein Vertragsdokument ist (hubspot_company_id in den Metadaten),
// dann wird das Unterschriftsdatum nach HubSpot geschrieben und der alte Onboarding-Weg uebersprungen.
// Gibt false zurueck, wenn es kein Vertragsdokument ist oder die Details nicht lesbar sind.
export async function handleContractCompleted(docId: string): Promise<boolean> {
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const pandadocKey = process.env.PANDADOC_API_KEY;
  if (!hubspotToken || !pandadocKey) {
    console.error("[vertrag-completed] Umgebungsvariable fehlt");
    return false;
  }

  const detailsRes = await fetch(`${PANDADOC_BASE}/documents/${docId}/details`, {
    headers: { Authorization: `API-Key ${pandadocKey}` },
  });
  const details: any = await detailsRes.json().catch(() => null);
  if (!detailsRes.ok || !details) {
    console.error(`[vertrag-completed] Details fuer ${docId} nicht lesbar (Status ${detailsRes.status}): ${JSON.stringify(details)}`);
    return false;
  }

  const companyId = String(details.metadata?.hubspot_company_id ?? "");
  if (!/^\d+$/.test(companyId)) {
    return false; // kein Vertragsdokument
  }

  // Datum der Fertigstellung (Berliner Zeit), sonst heute
  const parsed = details.date_completed ? new Date(details.date_completed) : new Date();
  const completedAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const isoDate = completedAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });

  try {
    const patchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${hubspotToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { vertrag_unterschrieben_am: isoDate } }),
    });
    if (!patchRes.ok) {
      const patchBody = await patchRes.text().catch(() => "");
      console.error(`[vertrag-completed] vertrag_unterschrieben_am fuer ${companyId} nicht gesetzt (Status ${patchRes.status}): ${patchBody}`);
    } else {
      console.log(`[vertrag-completed] Unternehmen ${companyId}: vertrag_unterschrieben_am = ${isoDate}`);
    }
  } catch (err) {
    console.error(`[vertrag-completed] HubSpot-Aufruf fuer ${companyId} fehlgeschlagen`, err);
  }
  return true;
}