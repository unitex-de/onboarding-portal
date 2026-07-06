import * as XLSX from "xlsx";
import type { CustomerAccount, SavedFormData } from "./onboarding-state";

const MAX_BRANCHES = 5;

/** Liest ein Feld, das laut Typ `string` ist, in der Praxis aber auch als Array
 * gespeichert sein kann (siehe liefSortiment / sortiment Altlasten). */
function joinStringOrArray(value: unknown, separator = ", "): string {
  if (Array.isArray(value)) return value.join(separator);
  if (typeof value === "string") return value;
  return "";
}

type Contact = NonNullable<SavedFormData["contacts"]>[number];

function getContact(contacts: Contact[] | undefined, kind: "gf" | "buchhaltung") {
  return (contacts ?? []).find((c) => c.kind === kind);
}

/** Flacht einen einzelnen Kunden-Account in eine Zeile für den Excel-Export. */
export function flattenCustomerToRow(acc: CustomerAccount): Record<string, string> {
  const fd = acc.savedFormData ?? {};
  const gf = getContact(fd.contacts, "gf");
  const buchhaltung = getContact(fd.contacts, "buchhaltung");

  const row: Record<string, string> = {
    Kundennummer: acc.id,
    Firma: acc.companyName,
    Formulartyp: acc.memberType,
    Erstellt_am: acc.createdAt ? new Date(acc.createdAt).toLocaleDateString("de-DE") : "",
    Status: acc.status ?? "",
    Straße: fd.strasse ?? "",
    Land: fd.land ?? "",
    PLZ: fd.plz ?? "",
    Ort: fd.ort ?? "",
    USt_ID: fd.ustId ?? "",
    Steuernummer: fd.steuernummer ?? "",
    Bankname: fd.bankname ?? "",
    IBAN: fd.iban ?? "",
    BIC: fd.bic ?? "",
    Email_Firma: fd.emailFirma ?? "",

    Kontakt_GF_Vorname: gf?.vorname ?? "",
    Kontakt_GF_Nachname: gf?.nachname ?? "",
    Kontakt_GF_Email: gf?.email ?? "",
    Kontakt_GF_Telefon: gf?.telefon ?? "",
    Kontakt_GF_Handy: gf?.handy ?? "",
    Kontakt_Buchhaltung_Vorname: buchhaltung?.vorname ?? "",
    Kontakt_Buchhaltung_Nachname: buchhaltung?.nachname ?? "",
    Kontakt_Buchhaltung_Email: buchhaltung?.email ?? "",
    Kontakt_Buchhaltung_Telefon: buchhaltung?.telefon ?? "",
    Kontakt_Buchhaltung_Handy: buchhaltung?.handy ?? "",

    Umsatz: fd.umsatz ?? "",
    Mitarbeiter: fd.mitarbeiter ?? "",
    Gruendung: fd.gruendung ?? "",
    Marken: fd.marken ?? "",
    ZR_Volumen: fd.zrVolumen ?? "",
    Bilanzsumme: fd.bilanzsumme ?? "",
    WKV_Deckungsbeitrag: fd.wkvDeckungsbeitrag ?? "",
    Wirtschaftlich_Abhaengig: fd.wirtschaftAbhaengig === true ? "Ja" : fd.wirtschaftAbhaengig === false ? "Nein" : "",
    Wirtschaftlich_Abhaengig_Text: fd.wirtschaftAbhaengigText ?? "",
    Separate_Abrechnung: fd.separateAbrechnung === true ? "Ja" : fd.separateAbrechnung === false ? "Nein" : "",
    Postadresse_Abweichend: fd.postadressen === true ? "Ja" : fd.postadressen === false ? "Nein" : "",
    Postadresse_Name: fd.postadrResult?.name ?? "",
    Postadresse_Straße: fd.postadrResult?.street ?? "",
    Postadresse_PLZ: fd.postadrResult?.zip ?? "",
    Postadresse_Ort: fd.postadrResult?.city ?? "",
    Postadresse_GLN: fd.postadrResult?.gln ?? "",
    Einzugsermaechtigung_Einzeln: fd.einzugseinzel === true ? "Ja" : fd.einzugseinzel === false ? "Nein" : "",

    Gesellschafter: (fd.shareholders ?? [])
      .map((s) => `${s.name} (Kapital: ${s.capital}, Stimmrecht: ${s.voting}${s.pep ? ", PEP" : ""})`)
      .join(" | "),
  };

  if (acc.memberType === "händler") {
    row["Hat_GLN"] = fd.hasGln === true ? "Ja" : fd.hasGln === false ? "Nein" : "";
    row["Sortiment"] = joinStringOrArray(fd.sortiment);

    const branches = fd.branches ?? [];
    for (let i = 0; i < MAX_BRANCHES; i++) {
      const b = branches[i];
      const n = i + 1;
      row[`Filiale${n}_Name`] = b?.name ?? "";
      row[`Filiale${n}_GLN`] = b?.gln ?? "";
      row[`Filiale${n}_Straße`] = b?.street ?? "";
      row[`Filiale${n}_PLZ`] = b?.zip ?? "";
      row[`Filiale${n}_Ort`] = b?.city ?? "";
    }
  }

  if (acc.memberType === "lieferant") {
    row["Lieferanten_Marken"] = fd.liefMarken ?? "";
    row["Lieferanten_Sortiment"] = joinStringOrArray(fd.liefSortiment);
  }

  return row;
}

/** Exportiert eine Liste von Kunden-Accounts als Excel-Datei mit separaten
 * Sheets für Händler und Lieferanten (unterschiedliche Spalten). */
export function exportCustomersToExcel(customers: CustomerAccount[], filename = "unitex-export.xlsx") {
  const haendler = customers.filter((c) => c.memberType === "händler").map(flattenCustomerToRow);
  const lieferanten = customers.filter((c) => c.memberType === "lieferant").map(flattenCustomerToRow);

  const wb = XLSX.utils.book_new();

  if (haendler.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(haendler), "Händler");
  }
  if (lieferanten.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lieferanten), "Lieferanten");
  }
  if (haendler.length === 0 && lieferanten.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), "Keine Daten");
  }

  XLSX.writeFile(wb, filename);
}