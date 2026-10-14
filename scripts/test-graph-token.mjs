const keys = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"];
const missing = keys.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Fehlende Variablen:", missing.join(", "));
  process.exit(1);
}

const res = await fetch(
  `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  },
);
const body = await res.json();
console.log("HTTP-Status:", res.status);

if (!res.ok) {
  console.error("Fehler:", body.error);
  console.error(body.error_description);
  process.exit(1);
}

// Das Token ist ein JWT. Der mittlere Teil enthält die Berechtigungen ("roles").
const payload = JSON.parse(
  Buffer.from(body.access_token.split(".")[1], "base64url").toString(),
);
console.log("Token erhalten, gültig (Sekunden):", body.expires_in);
console.log("Rollen im Token:", payload.roles ?? "(keine)");