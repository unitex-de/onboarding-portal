import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

// ---------------------------------------------------------------------------
// Kunde nach Freigabe zu HubSpot syncen (erstmal minimal: Firma + E-Mail)
// ---------------------------------------------------------------------------
export const syncCustomerToHubspot = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string(),
      companyName: z.string(),
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;

    // Demo-Modus – kein Token konfiguriert
    if (!token) {
      return { synced: false, demo: true };
    }

    try {
      const response = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              email: data.email,
              company: data.companyName,
            },
          }),
        },
      );

      const body = await response.json();

      // 409 = Kontakt mit dieser E-Mail existiert schon.
      // Fuer den ersten Test reicht es, das zu erkennen und zu melden -
      // ein echtes Update-Handling (idProperty=email) bauen wir ein,
      // sobald das vollstaendige Feld-Mapping steht.
      if (response.status === 409) {
        console.warn(
          "[syncCustomerToHubspot] Kontakt existiert bereits:",
          data.email,
        );
        return { synced: false, alreadyExists: true, demo: false };
      }

      if (!response.ok) {
        console.error("[syncCustomerToHubspot] HubSpot API error:", body);
        return {
          synced: false,
          demo: false,
          error: body?.message ?? "Unbekannter HubSpot-Fehler",
        };
      }

      return { synced: true, demo: false, hubspotContactId: body.id };
    } catch (e) {
      console.error("[syncCustomerToHubspot] Request fehlgeschlagen:", e);
      return {
        synced: false,
        demo: false,
        error: e instanceof Error ? e.message : "Unbekannter Fehler",
      };
    }
  });