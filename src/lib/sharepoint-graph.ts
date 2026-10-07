// NUR serverseitig verwenden (Server Functions, API-Routen).
// Enthält den Zugriff mit dem Azure-Secret, daher niemals aus Client-Code importieren.

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Ablage ist nur aktiv, wenn alle nötigen Variablen gesetzt sind. */
export function isSharepointConfigured(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.SHAREPOINT_SITE_URL,
  );
}

// Das Token ist ca. eine Stunde gültig. Wir merken es uns, damit nicht
// bei jeder Anfrage ein neues geholt wird.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID as string,
        client_secret: process.env.AZURE_CLIENT_SECRET as string,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(`Graph-Anmeldung fehlgeschlagen (${res.status}): ${body?.error ?? "unbekannt"}`);
  }
  cachedToken = {
    value: body.access_token as string,
    expiresAt: Date.now() + Number(body.expires_in) * 1000,
  };
  return cachedToken.value;
}

/** Anfrage an Graph mit Token. `path` beginnt mit "/", z. B. "/sites/...". */
export async function graphFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getGraphToken();
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

/** Wie graphFetch, liefert aber das JSON und wirft bei Fehlern eine lesbare Meldung. */
export async function graphJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await graphFetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Graph ${res.status} ${body?.error?.code ?? "unbekannt"}: ${body?.error?.message ?? ""}`);
  }
  return body as T;
}

/**
 * Zerlegt SHAREPOINT_SITE_URL in Hostname und Site-Pfad.
 * Funktioniert auch, wenn eine längere URL eingetragen wurde, z. B.
 * https://unitex.sharepoint.com/sites/Buha/Shared%20Documents/Forms/AllItems.aspx
 * -> hostname "unitex.sharepoint.com", sitePath "/sites/Buha"
 */
function parseSiteUrl(): { hostname: string; sitePath: string } {
  const url = new URL(process.env.SHAREPOINT_SITE_URL as string);
  const parts = url.pathname.split("/").filter(Boolean);
  const isSubsite = parts[0] === "sites" || parts[0] === "teams";
  return {
    hostname: url.hostname,
    sitePath: isSubsite ? `/${parts[0]}/${parts[1]}` : "",
  };
}

export type SharepointTarget = { siteId: string; driveId: string };
let cachedTarget: SharepointTarget | null = null;

/** Findet Site-ID und Drive-ID (Dokumentbibliothek) für die Ablage. */
export async function resolveTarget(): Promise<SharepointTarget> {
  if (cachedTarget) return cachedTarget;

  const { hostname, sitePath } = parseSiteUrl();
  const site = await graphJson<{ id: string }>(
    sitePath ? `/sites/${hostname}:${sitePath}` : `/sites/${hostname}`,
  );

  const libraryName = process.env.SHAREPOINT_LIBRARY_NAME;
  let driveId: string;
  if (libraryName) {
    const drives = await graphJson<{ value: { id: string; name: string }[] }>(
      `/sites/${site.id}/drives`,
    );
    const match = drives.value.find((d) => d.name === libraryName);
    if (!match) {
      throw new Error(
        `Bibliothek "${libraryName}" nicht gefunden. Vorhanden: ${drives.value.map((d) => d.name).join(", ")}`,
      );
    }
    driveId = match.id;
  } else {
    const drive = await graphJson<{ id: string }>(`/sites/${site.id}/drive`);
    driveId = drive.id;
  }

  cachedTarget = { siteId: site.id, driveId };
  return cachedTarget;
}

/** Macht aus einem Firmen- oder Dateinamen einen in SharePoint erlaubten Namen. */
export function safeName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|#%]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 100);
  return cleaned || "unbenannt";
}

/** Jedes Pfadstück einzeln kodieren, damit Leerzeichen und Umlaute in der URL funktionieren. */
function encodePath(path: string): string {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

// TypeScript ist bei Byte-Arrays als fetch-Body manchmal streng, daher dieser kleine Helfer.
function toBody(bytes: Uint8Array): BodyInit {
  return bytes as unknown as BodyInit;
}

/** Legt jeden Ordner des Pfads an, falls er noch nicht existiert. Pfad z. B. "Onboarding/Händler/Musterfirma". */
export async function ensureFolder(folderPath: string): Promise<void> {
  const { driveId } = await resolveTarget();
  let parent = "";
  for (const name of folderPath.split("/").filter(Boolean)) {
    const current = parent ? `${parent}/${name}` : name;

    const check = await graphFetch(`/drives/${driveId}/root:/${encodePath(current)}`);
    if (check.ok) {
      parent = current;
      continue;
    }
    if (check.status !== 404) {
      const body = await check.json().catch(() => null);
      throw new Error(`Ordner "${current}" prüfen fehlgeschlagen (${check.status}): ${body?.error?.code ?? "unbekannt"}`);
    }

    const createUrl = parent
      ? `/drives/${driveId}/root:/${encodePath(parent)}:/children`
      : `/drives/${driveId}/root/children`;
    const created = await graphFetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, folder: {} }),
    });
    if (!created.ok) {
      const body = await created.json().catch(() => null);
      throw new Error(`Ordner "${current}" anlegen fehlgeschlagen (${created.status}): ${body?.error?.code ?? "unbekannt"}`);
    }
    parent = current;
  }
}

const SMALL_LIMIT = 3.5 * 1024 * 1024; // einfacher Upload geht bis 4 MB
const CHUNK_SIZE = 320 * 1024 * 16; // 5 MiB, muss ein Vielfaches von 320 KiB sein

export type UploadedItem = { id: string; size: number; webUrl: string };

/** Lädt eine Datei in den Ordner hoch (der Ordner muss vorher mit ensureFolder angelegt sein). */
export async function uploadFile(
  folderPath: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<UploadedItem> {
  const { driveId } = await resolveTarget();
  const itemPath = encodePath(`${folderPath}/${fileName}`);

  // Kleine Dateien: ein einziger Aufruf
  if (bytes.byteLength <= SMALL_LIMIT) {
    return graphJson<UploadedItem>(
      `/drives/${driveId}/root:/${itemPath}:/content?@microsoft.graph.conflictBehavior=replace`,
      { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: toBody(bytes) },
    );
  }

  // Große Dateien: Upload-Session, Datei in Stücken hochladen
  const session = await graphJson<{ uploadUrl: string }>(
    `/drives/${driveId}/root:/${itemPath}:/createUploadSession`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } }),
    },
  );

  const total = bytes.byteLength;
  let result: UploadedItem | null = null;
  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total) - 1;
    // Wichtig: kein Authorization-Header, die Upload-URL ist schon autorisiert.
    const res = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end}/${total}` },
      body: toBody(bytes.subarray(start, end + 1)),
    });
    if (!res.ok) {
      throw new Error(`Upload von "${fileName}" fehlgeschlagen (${res.status}) bei Byte ${start}`);
    }
    if (end === total - 1) result = (await res.json()) as UploadedItem;
  }
  if (!result) throw new Error(`Upload von "${fileName}" wurde nicht abgeschlossen`);
  return result;
}