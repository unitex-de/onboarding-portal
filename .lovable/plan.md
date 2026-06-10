## Befund

- `bun run build` läuft sauber durch (Exit 0, alle Routen kompiliert).
- Console-Logs zeigen nur harmlose React-DOM-Warnings (`charset`, `crossorigin`-Casing) – kein Runtime-Fehler.
- Die Preview-URL `id-preview--…lovable.app` funktioniert nur für eingeloggte Lovable-Nutzer mit Projektzugriff. Wer ohne Login (z. B. via GitHub-Link weitergegeben) draufgeht, sieht „Preview has not been built yet".
- Das Projekt ist laut Projekt-URLs **noch nicht published** (Published URL: „not published").

## Ursache

Die Meldung kommt nicht von einem Build-Fehler, sondern davon, dass der Link an jemanden ohne Lovable-Login / ohne Projektzugriff geschickt wurde und es noch keine öffentliche Published-Version gibt.

## Vorgeschlagenes Vorgehen

1. **Website-Metadaten Preflight** – Title, Meta-Description, OG- und Twitter-Tags in `src/routes/__root.tsx` prüfen und auf „unitex B2B Onboarding Portal" + passende Beschreibung setzen, falls noch generische Defaults drinstehen.
2. **Publish auslösen** via `preview_ui--publish` → erzeugt eine stabile `…lovable.app` URL, die ohne Login erreichbar ist (Public-Visibility vorausgesetzt – ggf. via `publish_settings--update_visibility` auf `public` stellen).
3. **User über Optionen informieren**:
   - Permanent öffentlich: Publish (Schritt 2).
   - Temporär (7 Tage, kein Login): „Share → Share preview" im Lovable-UI klicken – das macht der User selbst, da es kein Tool dafür gibt.
4. **Kein Code-Change am App-Code** – die App selbst ist fehlerfrei.

## Was NICHT gemacht wird

- Keine Änderungen an Routen, Layout, Onboarding-Flow.
- Keine erneuten lokalen Build-Runs ohne Anlass.
- Keine Dev-Server-Restarts (Build ist grün).