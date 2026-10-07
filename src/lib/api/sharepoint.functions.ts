/**
 * SharePoint-Ablage
 *
 * Kopiert die Dokumente eines freigegebenen Kunden aus Supabase Storage nach SharePoint
 * und prüft pro Datei, ob sie vollständig angekommen ist.
 * Diese Version LÖSCHT NICHTS in Supabase.
 *
 * Requires env vars:
 *   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SHAREPOINT_SITE_URL
 * Optional:
 *   SHAREPOINT_LIBRARY_NAME  – Name der Dokumentbibliothek (sonst Standardbibliothek)
 *   SHAREPOINT_BASE_FOLDER   – Oberordner in der Bibliothek (Standard: "Onboarding")
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureFolder, isSharepointConfigured, safeName, uploadFile } from "@/lib/sharepoint-graph";

const BUCKET = "documents";

type FileJob = {
  storageKey: string; // Pfad in Supabase Storage
  targetName: string; // Dateiname in SharePoint
  documentRowId?: string; // nur bei Checkliste-Dokumenten (Zeile in public.documents)
};

export const archiveCustomerToSharepoint = createServerFn({ method: "POST" })
  .inputValidator(z.object({ customerId: z.string() }))
  .handler(async ({ data }) => {
    if (!isSharepointConfigured()) {
      return { skipped: true as const, reason: "SharePoint ist nicht konfiguriert" };
    }

    // 1. Kunde laden und prüfen, ob er wirklich freigegeben ist
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, company, member_type, status, neukundenformular_path, gwg_bogen_path, signed_document_path")
      .eq("id", data.customerId)
      .maybeSingle();
    if (customerError) throw new Error(`Kunde laden fehlgeschlagen: ${customerError.message}`);
    if (!customer) return { skipped: true as const, reason: "Kunde nicht gefunden" };
    if (customer.status !== "Freigegeben") {
      return { skipped: true as const, reason: "Kunde ist nicht freigegeben" };
    }

    const isLieferant = customer.member_type === "lieferant";

    // 2. Alle Dateien einsammeln
    const jobs: FileJob[] = [];

    const { data: docRows, error: docsError } = await supabaseAdmin
      .from("documents")
      .select("id, storage_key")
      .eq("customer_id", customer.id);
    if (docsError) throw new Error(`Dokumente laden fehlgeschlagen: ${docsError.message}`);

    for (const row of docRows ?? []) {
      if (!row.storage_key) continue;
      // storage_key hat die Form {customerId}/{docId}-{dateiname}; wir nehmen den Teil nach dem "/"
      jobs.push({
        storageKey: row.storage_key,
        targetName: safeName(row.storage_key.split("/").pop() ?? row.storage_key),
        documentRowId: row.id,
      });
    }
    if (customer.neukundenformular_path) {
      jobs.push({
        storageKey: customer.neukundenformular_path,
        targetName: isLieferant ? "Lieferantenstammblatt.pdf" : "Neukundenformular.pdf",
      });
    }
    if (customer.gwg_bogen_path) {
      jobs.push({ storageKey: customer.gwg_bogen_path, targetName: "GWG-Bogen.pdf" });
    }
    if (customer.signed_document_path) {
      jobs.push({ storageKey: customer.signed_document_path, targetName: "Vertrag_signiert.pdf" });
    }

    if (jobs.length === 0) return { skipped: true as const, reason: "Keine Dateien vorhanden" };

    // 3. Zielordner anlegen: Onboarding/Händler|Lieferanten/Firmenname_ersteAchtZeichenDerID
    const baseFolder = (process.env.SHAREPOINT_BASE_FOLDER ?? "Onboarding").replace(/^\/+|\/+$/g, "");
    const folderPath =
      `${baseFolder}/${isLieferant ? "Lieferanten" : "Händler"}/` +
      `${safeName(customer.company ?? "Kunde")}_${customer.id.slice(0, 8)}`;
    await ensureFolder(folderPath);

    // 4. Datei für Datei: herunterladen, hochladen, Größe prüfen, Verweis speichern
    const now = new Date().toISOString();
    const failed: { file: string; error: string }[] = [];
    let uploaded = 0;
    let firstWebUrl: string | null = null;

    for (const job of jobs) {
      try {
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from(BUCKET)
          .download(job.storageKey);
        if (downloadError || !blob) {
          throw new Error(`Download aus Supabase fehlgeschlagen: ${downloadError?.message ?? "keine Daten"}`);
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());

        const item = await uploadFile(folderPath, job.targetName, bytes);
        if (item.size !== bytes.byteLength) {
          throw new Error(`Größe stimmt nicht (gesendet ${bytes.byteLength}, in SharePoint ${item.size})`);
        }

        if (job.documentRowId) {
          const { error: updateError } = await supabaseAdmin
            .from("documents")
            .update({ sharepoint_url: item.webUrl, archived_at: now })
            .eq("id", job.documentRowId);
          if (updateError) throw new Error(`Verweis speichern fehlgeschlagen: ${updateError.message}`);
        }

        uploaded++;
        if (!firstWebUrl) firstWebUrl = item.webUrl;
      } catch (e) {
        failed.push({ file: job.targetName, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // 5. Kunde als archiviert markieren, aber nur, wenn ALLE Dateien durch sind
    const allDone = failed.length === 0;
    let folderUrl: string | null = null;
    if (allDone && firstWebUrl) {
      folderUrl = firstWebUrl.substring(0, firstWebUrl.lastIndexOf("/"));
      const { error: archiveError } = await supabaseAdmin
        .from("customers")
        .update({ sharepoint_folder_url: folderUrl, archived_at: now })
        .eq("id", customer.id);
      if (archiveError) {
        failed.push({ file: "(Kunde markieren)", error: archiveError.message });
      }
    }
    if (failed.length > 0) {
      console.error("[archiveCustomerToSharepoint] Fehler:", failed);
    }

    return {
      skipped: false as const,
      archived: failed.length === 0,
      uploaded,
      failed,
      folderUrl,
    };
  });