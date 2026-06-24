import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Info, Lock, Plus, Trash2, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormSection, Field, AutoSaveInput, MaskedInput, inputClass } from "@/components/forms/FormSection";
import { useOnboarding, type LegalForm, getSectionIds } from "@/lib/onboarding-state";
import { ConfettiPopup } from "@/components/ui/ConfettiPopup";

export const Route = createFileRoute("/unternehmen")({
  head: () => ({ meta: [{ title: "Unternehmen | unitex Onboarding" }] }),
  component: UnternehmenPage,
});

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: "eK", label: "e.K. (Einzelkaufmann)" },
  { value: "GbR", label: "GbR" },
  { value: "GmbH", label: "GmbH" },
  { value: "GmbHCoKG", label: "GmbH & Co. KG" },
  { value: "KG", label: "KG" },
  { value: "OHG", label: "OHG" },
];

const SHOWS_GWG: LegalForm[] = ["GmbH", "GmbHCoKG", "KG", "OHG", "GbR"];

const PEP_TOOLTIP =
  "Im Sinne der geldwäscherechtlichen Vorschriften (z. B. § 1 Abs. 11 GwG) bezeichnet eine politisch exponierte Person (PEP) Einzelpersonen, die wichtige öffentliche Ämter ausüben oder ausgeübt haben (z. B. Staatschefs, Regierungsmitglieder, Abgeordnete). Aufgrund gesetzlicher Vorgaben zur Geldwäscheprävention unterliegen Geschäftsbeziehungen mit PEPs erweiterten Sorgfaltspflichten.";
const SONDER_TOOLTIP =
  "Diese Firmen benötigen eine aktive Bestätigung zur Zentralregulierung über unitex.";
const UMSATZ_TOOLTIP =
  "Bitte tragen Sie den Nettoumsatz des letzten abgeschlossenen Geschäftsjahres ein.";

const JOB_TYPES = ["Inhaber", "Geschäftsführer", "Buchhaltung", "Vertrieb", "Marketing", "Sonstige"] as const;
type JobType = typeof JOB_TYPES[number];

interface ContactBlock {
  id: string;
  vorname: string;
  nachname: string;
  handy: string;
  telefon: string;
  email: string;
  jobbezeichnung: JobType | "";
  newsletterHandy: boolean;
  newsletterEmail: boolean;
  kind: "gf" | "buchhaltung" | "extra";
}

function newContact(kind: ContactBlock["kind"]): ContactBlock {
  return {
    id: `c_${Date.now()}_${Math.random()}`,
    vorname: "",
    nachname: "",
    handy: "",
    telefon: "",
    email: "",
    jobbezeichnung: "",
    newsletterHandy: false,
    newsletterEmail: false,
    kind,
  };
}

function selectClass(value: string) {
  return [
    inputClass,
    value ? "border-success/60" : "",
  ].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Pill – Sortimentsschwerpunkte
// ---------------------------------------------------------------------------
function Pill({ label, active, onToggle }: { label: string; active: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!active)}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-success bg-success/10 text-success"
          : "border-border text-secondary hover:border-primary/50 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

const SORTIMENT_OPTIONS = ["DOB", "HAKA", "KIKO", "Schuhe", "Accessoires", "Wäsche"] as const;

function UnternehmenPage() {
  const navigate = useNavigate();
  const { state, update, updateFormData } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";
  const isLieferant = state.memberType === "lieferant";
  const isAdmin = state.role === "admin";

  // ── Grunddaten ──────────────────────────────────────────────────────────────
  const [firmenname, setFirmenname] = useState(state.companyName);
  const [strasse, setStrasse] = useState(state.savedFormData?.strasse ?? "");
  const [plz, setPlz] = useState(state.savedFormData?.plz ?? "");
  const [ort, setOrt] = useState(state.savedFormData?.ort ?? "");
  const [land, setLand] = useState(state.savedFormData?.land ?? "DE");

  // ── Kontakt ─────────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<ContactBlock[]>(() => {
    const saved = state.savedFormData?.contacts;
    if (saved && saved.length > 0) {
      return saved.map((c) => ({
        ...c,
        id: `c_${Date.now()}_${Math.random()}`,
        jobbezeichnung: "" as JobType | "",
        newsletterHandy: false,
        newsletterEmail: false,
      }));
    }
    return [newContact("gf"), newContact("buchhaltung")];
  });

  const updateContact = (id: string, patch: Partial<ContactBlock>) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addExtraContact = () => {
    setContacts((prev) => [...prev, newContact("extra")]);
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // ── GLN & Filialen ──────────────────────────────────────────────────────────
  const [branches, setBranches] = useState(
    state.savedFormData?.branches ?? [{ name: "", street: "", zip: "", city: "", gln: "" }]
  );
  const [hasGln, setHasGln] = useState(state.savedFormData?.hasGln ?? true);

  // ── GWG ─────────────────────────────────────────────────────────────────────
  const [shareholders, setShareholders] = useState([{ name: "", capital: "", voting: "", pep: false }]);
  const [pepTooltip, setPepTooltip] = useState(false);
  const [wirtschaftAbhaengig, setWirtschaftAbhaengig] = useState(false);
  const [wirtschaftAbhaengigText, setWirtschaftAbhaengigText] = useState("");

  // ── Bankdaten ───────────────────────────────────────────────────────────────
  const [bankname, setBankname] = useState(state.savedFormData?.bankname ?? "");
  const [bic, setBic] = useState(state.savedFormData?.bic ?? "");
  const [iban, setIban] = useState(state.savedFormData?.iban ?? "");
  const [steuernummer, setSteuernummer] = useState(state.savedFormData?.steuernummer ?? "");
  const [ustId, setUstId] = useState(state.savedFormData?.ustId ?? "");

  // ── Geschäftsdaten ──────────────────────────────────────────────────────────
  const [umsatz, setUmsatz] = useState("");
  const [mitarbeiter, setMitarbeiter] = useState("");
  const [gruendung, setGruendung] = useState("");
  const [marken, setMarken] = useState("");
  const [zrVolumen, setZrVolumen] = useState("");
  const [bilanzsumme, setBilanzsumme] = useState("");
  const [wkvDeckungsbeitrag, setWkvDeckungsbeitrag] = useState("");
  const [umsatzTooltip, setUmsatzTooltip] = useState(false);
  const [sortiment, setSortiment] = useState<string[]>(state.savedFormData?.sortiment ?? []);

  // ── Lieferant Stammblatt ─────────────────────────────────────────────────────
  const [liefSortiment, setLiefSortiment] = useState<string[]>(
    Array.isArray(state.savedFormData?.liefSortiment)
      ? (state.savedFormData.liefSortiment as unknown as string[])
      : []
  );
  const [liefMarken, setLiefMarken] = useState(state.savedFormData?.liefMarken ?? "");

  // ── Etappe 1 Confetti ────────────────────────────────────────────────────────
  const [showEtappe1Confetti, setShowEtappe1Confetti] = useState(false);

  // Check if all required sections completed after saving one section
  const checkEtappe1Done = (justSavedId: string) => {
    if (isAdmin) return;
    const sectionIds = getSectionIds(state.memberType);
    const newCompleted = { ...state.completedSections, [justSavedId]: true };
    const allDone = sectionIds.every((id) => newCompleted[id]);
    if (allDone) setShowEtappe1Confetti(true);
  };

  // Auto-fill first branch from Grunddaten
  const syncAddressToBranch = () => {
    setBranches((prev) => {
      const next = [...prev];
      next[0] = { ...next[0], street: strasse, zip: plz, city: ort, name: firmenname || next[0].name };
      return next;
    });
  };

  // ── Save handlers ───────────────────────────────────────────────────────────
  const handleSaveGrunddaten = () => {
    // BUG 2 fix: also persist country to state for PLZ-routing
    update({ companyName: firmenname, postalCode: plz, country: land });
    updateFormData({ strasse, plz, ort, land });
    syncAddressToBranch();
    checkEtappe1Done("grunddaten");
  };

  const handleSaveKontakt = () => {
    updateFormData({
      contacts: contacts.map((c) => ({
        kind: c.kind,
        vorname: c.vorname,
        nachname: c.nachname,
        handy: c.handy,
        telefon: c.telefon,
        email: c.email,
      })),
    });
    checkEtappe1Done("kontakt");
  };

  const handleSaveBankdaten = () => {
    updateFormData({ bankname, bic, iban, steuernummer, ustId });
    checkEtappe1Done("bankdaten");
  };

  const handleSaveGln = () => {
    updateFormData({ branches, hasGln });
    checkEtappe1Done("gln_filialen");
  };

  const handleSaveGeschaeftsdaten = () => {
    updateFormData({ sortiment });
    checkEtappe1Done("geschaeftsdaten");
  };

  const handleSaveGwg = () => {
    checkEtappe1Done("gwg_daten");
  };

  const handleSaveLieferantStamm = () => {
    // BUG 4: save array-based sortiment
    updateFormData({ liefSortiment: liefSortiment as unknown as string, liefMarken });
    checkEtappe1Done("lieferant_stamm");
  };

  // ── Validate helpers ────────────────────────────────────────────────────────
  const validateGeschaeftsdaten = (): string | null => {
    // Sortiment pills aren't standard inputs; require at least one selection
    if (sortiment.length === 0) return "Bitte wähle mindestens einen Sortimentsschwerpunkt aus.";
    return null;
  };

  const validateLieferantStamm = (): string | null => {
    if (liefSortiment.length === 0) return "Bitte wähle mindestens einen Sortimentsschwerpunkt aus.";
    return null;
  };

  // Keep branches[0] in sync with savedFormData when strasse/plz/ort changes
  useEffect(() => {
    const saved = state.savedFormData?.branches;
    if (saved) setBranches(saved);
  }, []);

  return (
    <AppShell
      title="Unternehmen"
      subtitle={
        isLieferant
          ? "Stammdaten, Bankdaten & Lieferanten-Stammblatt — jederzeit zwischenspeicherbar."
          : "Stammdaten, Bankdaten, GLN & Filialen — jederzeit zwischenspeicherbar."
      }
    >
      {showEtappe1Confetti && (
        <ConfettiPopup
          title="Super, Schritt 1 abgeschlossen!"
          message="Alle Unternehmensdaten wurden gespeichert. Jetzt geht es weiter mit den Dokumenten."
          buttonLabel="Weiter zu Dokumenten"
          onClose={() => {
            setShowEtappe1Confetti(false);
            navigate({ to: "/upload-center" });
          }}
        />
      )}

      <div className="space-y-6 max-w-4xl">
        {/* ── 1 · Grunddaten ─────────────────────────────────────────────────── */}
        <FormSection
          id="grunddaten"
          letter="1"
          title="Grunddaten"
          description="Geben Sie hier den offiziellen Sitz Ihres Unternehmens an."
          onSave={handleSaveGrunddaten}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Firmenname">
              <AutoSaveInput
                className={inputClass}
                value={firmenname}
                onChange={(e) => setFirmenname(e.target.value)}
                required
              />
            </Field>
            <Field label="Rechtsform">
              {state.legalFormLockedByAdmin ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-popover/50 px-3 py-2.5">
                  <Lock className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm text-foreground">
                    {LEGAL_FORMS.find((f) => f.value === legalForm)?.label ?? legalForm}
                  </span>
                </div>
              ) : (
                <select className={selectClass(legalForm)} value={legalForm}
                  onChange={(e) => update({ legalForm: e.target.value as LegalForm })}>
                  {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Straße & Hausnummer">
              <AutoSaveInput className={inputClass} placeholder="Musterstraße 12"
                value={strasse} onChange={(e) => setStrasse(e.target.value)} required />
            </Field>
            <Field label="PLZ / Ort / Land">
              <div className="grid grid-cols-[100px_1fr_60px] gap-2">
                <AutoSaveInput className={inputClass} placeholder="12345"
                  value={plz} onChange={(e) => setPlz(e.target.value)} required />
                <AutoSaveInput className={inputClass} placeholder="Musterstadt"
                  value={ort} onChange={(e) => setOrt(e.target.value)} required />
                <AutoSaveInput className={inputClass} placeholder="DE"
                  value={land} onChange={(e) => setLand(e.target.value)} required />
              </div>
            </Field>
          </div>
        </FormSection>

        {/* ── 2 · Kontaktinformationen ────────────────────────────────────────── */}
        <FormSection
          id="kontakt"
          letter="2"
          title="Kontaktinformationen"
          description="Ansprechpartner für die Geschäftsführung und Ihre Buchhaltung."
          onSave={handleSaveKontakt}
        >
          {contacts.map((c) => {
            const isGf = c.kind === "gf";
            const isBu = c.kind === "buchhaltung";
            const isExtra = c.kind === "extra";
            const blockTitle = isGf
              ? "Angaben Geschäftsführer"
              : isBu
              ? "Angaben Buchhaltung"
              : "Weiterer Kontakt";

            return (
              <div key={c.id} className={[
                "rounded-lg border p-4 space-y-4",
                isGf ? "border-border" : "border-border bg-popover/20",
              ].join(" ")}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{blockTitle}</p>
                  {isExtra && (
                    <button type="button" onClick={() => removeContact(c.id)}
                      className="rounded p-1 text-muted hover:text-destructive" aria-label="Entfernen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Vorname">
                    <AutoSaveInput className={inputClass} value={c.vorname}
                      onChange={(e) => updateContact(c.id, { vorname: e.target.value })} required />
                  </Field>
                  <Field label="Nachname">
                    <AutoSaveInput className={inputClass} value={c.nachname}
                      onChange={(e) => updateContact(c.id, { nachname: e.target.value })} required />
                  </Field>
                </div>

                {isExtra && (
                  <Field label="Jobbezeichnung">
                    <select className={selectClass(c.jobbezeichnung)} value={c.jobbezeichnung}
                      onChange={(e) => updateContact(c.id, { jobbezeichnung: e.target.value as JobType })}>
                      <option value="">— bitte wählen —</option>
                      {JOB_TYPES.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </Field>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Field label="Handynummer" required={false}>
                      <MaskedInput mask="mobile" type="tel" className={inputClass} placeholder="+49 172 12345678"
                        value={c.handy} onChange={(e) => updateContact(c.id, { handy: e.target.value })} />
                    </Field>
                    {c.handy && (
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-secondary pl-0.5">
                        <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-primary"
                          checked={c.newsletterHandy}
                          onChange={(e) => updateContact(c.id, { newsletterHandy: e.target.checked })} />
                        <span>Einwilligung zum Newsletter per SMS</span>
                      </label>
                    )}
                  </div>
                  <Field label="Telefonnummer" required={false}>
                    <MaskedInput mask="phone" type="tel" className={inputClass} placeholder="0731 56789 (12)"
                      value={c.telefon} onChange={(e) => updateContact(c.id, { telefon: e.target.value })} />
                  </Field>
                </div>

                <div className="space-y-2">
                  <Field label="E-Mail-Adresse">
                    <AutoSaveInput type="email" className={inputClass} placeholder="name@firma.de"
                      value={c.email} onChange={(e) => updateContact(c.id, { email: e.target.value })} required />
                  </Field>
                  {c.email && (
                    <label className="flex items-start gap-2 cursor-pointer text-xs text-secondary pl-0.5">
                      <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-primary"
                        checked={c.newsletterEmail}
                        onChange={(e) => updateContact(c.id, { newsletterEmail: e.target.checked })} />
                      <span>Einwilligung zum Newsletter per E-Mail</span>
                    </label>
                  )}
                  <p className="text-[11px] text-muted mt-1">
                    <br /> Mit dem Setzen des Newsletter-Häkchens erteilen Sie die Einwilligung zur Kontaktaufnahme zu Neuigkeiten, Aktionen und Informationen von unitex per E-Mail bzw. SMS. Diese Einwilligung kann jederzeit widerrufen werden.
                  </p>
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addExtraContact}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2">
            <Plus className="h-4 w-4" /> Weiteren Kontakt hinzufügen
          </button>
        </FormSection>

        {/* ── 3 · Bankdaten ──────────────────────────────────────────────────── */}
        <FormSection
          id="bankdaten"
          letter="3"
          title="Konto- und Steuerinformationen"
          description=""
          onSave={handleSaveBankdaten}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Bankname">
              <AutoSaveInput className={inputClass} value={bankname}
                onChange={(e) => setBankname(e.target.value)} required />
            </Field>
            <Field label="BIC">
              <AutoSaveInput className={inputClass} placeholder="GENODEM1XXX"
                value={bic} onChange={(e) => setBic(e.target.value)} required />
            </Field>
            <Field label="IBAN" className="md:col-span-2">
              <MaskedInput mask="iban" className={inputClass} placeholder="DE89 3704 0044 0532 0130 00"
                value={iban} onChange={(e) => setIban(e.target.value)} required />
            </Field>
            <Field label="Steuernummer">
              <AutoSaveInput className={inputClass} value={steuernummer}
                onChange={(e) => setSteuernummer(e.target.value)} required />
            </Field>
            <Field label="USt-IdNr." required={false}>
              <AutoSaveInput className={inputClass} placeholder="DE123456789"
                value={ustId} onChange={(e) => setUstId(e.target.value)} />
            </Field>
          </div>
        </FormSection>

        {/* ── Lieferant: Stammblatt statt GLN/Geschäft/GWG ──────────────────── */}
        {isLieferant ? (
          <FormSection
            id="lieferant_stamm"
            letter="4"
            title="Lieferanten-Stammblatt"
            description="Sortiment, Marken und Ansprechpartner."
            onSave={handleSaveLieferantStamm}
            validate={validateLieferantStamm}
          >
            <div className="space-y-4">
              {/* BUG 4: Sortiment als Pills */}
              <Field label="Sortimentsschwerpunkte">
                <div className="flex flex-wrap gap-2">
                  {SORTIMENT_OPTIONS.map((opt) => (
                    <Pill
                      key={opt}
                      label={opt}
                      active={liefSortiment.includes(opt)}
                      onToggle={(on) =>
                        setLiefSortiment((prev) =>
                          on ? [...prev, opt] : prev.filter((s) => s !== opt)
                        )
                      }
                    />
                  ))}
                </div>
                {liefSortiment.length === 0 && (
                  <p className="text-xs text-muted mt-1">Bitte mindestens einen Schwerpunkt auswählen.</p>
                )}
              </Field>

              <Field label="Wichtigste Marken / Eigenmarken">
                <AutoSaveInput className={inputClass} placeholder="Komma-getrennt, z.B. Eigene Brand, Mustermarke"
                  value={liefMarken} onChange={(e) => setLiefMarken(e.target.value)} required />
              </Field>
            </div>
          </FormSection>
        ) : (
          <>
            {/* ── 4 · GLN & Filialen ─────────────────────────────────────────── */}
            <FormSection
              id="gln_filialen"
              letter="4"
              title="GLN & Filialen"
              description="Global Location Number und Filialstruktur."
              onSave={handleSaveGln}
            >
              <div className="rounded-lg bg-popover p-4">
                <p className="text-sm font-medium text-foreground mb-3">Haben Sie bereits eine GLN-Nummer?</p>
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" onClick={() => setHasGln(v)}
                      className={[
                        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                        hasGln === v
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-secondary hover:text-foreground",
                      ].join(" ")}
                    >
                      {v ? "Ja" : "Nein"}
                    </button>
                  ))}
                </div>
                {!hasGln && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
                    <Info className="h-4 w-4 mt-0.5" />
                    Wir beantragen Ihre GLN-Nummer automatisch für Sie.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Filialen</p>
                  <button type="button"
                    onClick={() => setBranches([...branches, { name: "", street: "", zip: "", city: "", gln: "" }])}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Filiale hinzufügen
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-popover text-xs uppercase tracking-wide text-secondary">
                      <tr>
                        <th className="text-left p-2 font-medium">Name *</th>
                        <th className="text-left p-2 font-medium">Straße *</th>
                        <th className="text-left p-2 font-medium w-20">PLZ *</th>
                        <th className="text-left p-2 font-medium">Ort *</th>
                        <th className="text-left p-2 font-medium">GLN</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b, i) => (
                        <tr key={i} className="border-t border-border">
                          {(["name", "street", "zip", "city", "gln"] as const).map((k) => (
                            <td key={k} className="p-1.5">
                              <input
                                value={b[k]}
                                onChange={(e) => {
                                  const next = [...branches];
                                  next[i] = { ...next[i], [k]: e.target.value };
                                  setBranches(next);
                                }}
                                className={[
                                  "w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                                  b[k] ? "border border-success/60" : "border border-transparent",
                                ].join(" ")}
                                required={k !== "gln"}
                              />
                            </td>
                          ))}
                          <td className="p-1.5">
                            <button type="button"
                              onClick={() => setBranches(branches.filter((_, j) => j !== i))}
                              className="rounded p-1 text-muted hover:text-destructive" aria-label="Entfernen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted">
                  Ihre Hauptadresse (aus Schritt 1) haben wir bereits als erste Filiale für Sie angelegt.
                </p>
              </div>
            </FormSection>

            {/* ── 5 · Geschäftsdaten ─────────────────────────────────────────── */}
            <FormSection
              id="geschaeftsdaten"
              letter="5"
              title="Geschäftsdaten"
              description="Umsatz, Mitarbeiter, Sortimentsschwerpunkte und ZR-Kennzahlen."
              onSave={handleSaveGeschaeftsdaten}
              validate={validateGeschaeftsdaten}
            >
              {/* ZR-Startdatum (vom Admin gesetzt) */}
              {state.zrStartDate && (
                <div className="rounded-lg bg-popover/60 border border-border px-4 py-3 flex items-center gap-3">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <div className="text-sm text-secondary">
                    <span className="font-medium text-foreground">ZR-Startdatum:</span>{" "}
                    <span className="font-semibold text-primary">
                      {new Date(state.zrStartDate).toLocaleDateString("de-DE", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                {/* Jahresumsatz mit Tooltip */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-secondary">
                    <span>
                      Jahresumsatz (€) <span className="text-primary">*</span>
                    </span>
                    <div className="relative font-normal normal-case tracking-normal">
                      <button type="button"
                        className="text-muted hover:text-primary transition-colors"
                        onMouseEnter={() => setUmsatzTooltip(true)}
                        onMouseLeave={() => setUmsatzTooltip(false)}
                        onClick={() => setUmsatzTooltip((v) => !v)}
                        aria-label="Jahresumsatz erklären"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                      {umsatzTooltip && (
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-64 rounded-xl border border-border bg-card p-3 text-xs text-secondary shadow-xl leading-relaxed">
                          {UMSATZ_TOOLTIP}
                        </div>
                      )}
                    </div>
                  </div>
                  <AutoSaveInput className={inputClass} placeholder="z.B. 800.000"
                    value={umsatz} onChange={(e) => setUmsatz(e.target.value)} required />
                </div>

                <Field label="Mitarbeiterzahl">
                  <AutoSaveInput type="number" className={inputClass}
                    placeholder="z.B. 50"
                    value={mitarbeiter} onChange={(e) => setMitarbeiter(e.target.value)} required />
                </Field>
                <Field label="Gründungsdatum">
                  <AutoSaveInput type="date" className={inputClass}
                    value={gruendung} onChange={(e) => setGruendung(e.target.value)} required />
                </Field>

                <Field label="ZR-Volumen (€)" required={false}>
                  <AutoSaveInput type="number" className={inputClass} placeholder="z.B. 350.000"
                    value={zrVolumen} onChange={(e) => setZrVolumen(e.target.value)} />
                </Field>

                <Field label="Bilanzsumme (€)" required={false}>
                  <AutoSaveInput type="number" className={inputClass} placeholder="z.B. 860.000"
                    value={bilanzsumme} onChange={(e) => setBilanzsumme(e.target.value)} />
                </Field>

                <Field label="WKV Deckungsbeitrag (€)" required={false}>
                  <AutoSaveInput type="number" className={inputClass} placeholder="z.B. 800.000"
                    value={wkvDeckungsbeitrag} onChange={(e) => setWkvDeckungsbeitrag(e.target.value)} />
                </Field>
              </div>

              <Field label="Sortimentsschwerpunkte">
                <div className="flex flex-wrap gap-2">
                  {SORTIMENT_OPTIONS.map((c) => (
                    <Pill key={c} label={c}
                      active={sortiment.includes(c)}
                      onToggle={(on) => setSortiment((prev) => on ? [...prev, c] : prev.filter((s) => s !== c))}
                    />
                  ))}
                </div>
                {sortiment.length === 0 && (
                  <p className="text-xs text-muted mt-1">Bitte mindestens einen Schwerpunkt auswählen.</p>
                )}
              </Field>

              <Field label="Wichtige Marken" required={false}>
                <AutoSaveInput className={inputClass} placeholder="z.B. Hugo Boss, Gerry Weber"
                  value={marken} onChange={(e) => setMarken(e.target.value)} />
              </Field>
            </FormSection>

            {/* ── 6 · GWG ────────────────────────────────────────────────────── */}
            {SHOWS_GWG.includes(legalForm) && (
              <FormSection
                id="gwg_daten"
                letter="6"
                title="GWG-Daten"
                description="Gesetzliche Pflichtangaben nach dem Geldwäschegesetz (GwG)."
                onSave={handleSaveGwg}
              >
                {/* Wirtschaftliche Abhängigkeit */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={wirtschaftAbhaengig}
                      onChange={(e) => setWirtschaftAbhaengig(e.target.checked)}
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      Besteht eine wirtschaftliche Abhängigkeit zu einem einzelnen Lieferanten (mehr als 50% des Gesamtumsatzes)?
                    </span>
                  </label>
                  {wirtschaftAbhaengig && (
                    <div className="ml-7 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Field label="Bitte erläutern Sie die Abhängigkeit">
                        <textarea
                          className={[inputClass, "resize-none h-24"].join(" ")}
                          value={wirtschaftAbhaengigText}
                          onChange={(e) => setWirtschaftAbhaengigText(e.target.value)}
                          placeholder="Bitte beschreiben Sie die wirtschaftliche Abhängigkeit…"
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Gesellschafter-Bereich */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Gesellschafter</p>
                    <button
                      type="button"
                      disabled={shareholders.length >= 6}
                      onClick={() => setShareholders([...shareholders, { name: "", capital: "", voting: "", pep: false }])}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" /> Hinzufügen
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-popover text-xs uppercase tracking-wide text-secondary">
                        <tr>
                          <th className="text-left p-2 font-medium whitespace-nowrap">Name *</th>
                          <th className="text-left p-2 font-medium w-28 whitespace-nowrap">Kapital % *</th>
                          <th className="text-left p-2 font-medium w-28 whitespace-nowrap">Stimmrecht % *</th>
                          <th className="text-left p-2 font-medium w-24 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 normal-case tracking-normal">
                              <span className="uppercase tracking-wide font-medium">PEP ¹</span>
                            </div>
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {shareholders.map((s, i) => (
                          <tr key={i} className="border-t border-border">
                            {(["name", "capital", "voting"] as const).map((k) => (
                              <td key={k} className="p-1.5">
                                <input
                                  value={s[k]}
                                  onChange={(e) => {
                                    const n = [...shareholders];
                                    n[i] = { ...n[i], [k]: e.target.value };
                                    setShareholders(n);
                                  }}
                                  className={[
                                    "w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                                    s[k] ? "border border-success/60" : "border border-transparent",
                                  ].join(" ")}
                                  placeholder={k !== "name" ? "50" : ""}
                                  required
                                />
                              </td>
                            ))}
                            <td className="p-1.5 pl-4">
                              <input
                                type="checkbox"
                                checked={s.pep}
                                onChange={(e) => {
                                  const n = [...shareholders];
                                  n[i] = { ...n[i], pep: e.target.checked };
                                  setShareholders(n);
                                }}
                                className="h-4 w-4 accent-primary"
                                title="Politisch exponierte Person"
                              />
                            </td>
                            <td className="p-1.5">
                              <button
                                type="button"
                                onClick={() => setShareholders(shareholders.filter((_, j) => j !== i))}
                                className="rounded p-1 text-muted hover:text-destructive"
                                aria-label="Entfernen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-muted">
                    ¹ PEP:&nbsp;
                    <div className="relative inline-block">
                      <button
                        type="button"
                        className="text-muted hover:text-primary transition-colors flex items-center"
                        onMouseEnter={() => setPepTooltip(true)}
                        onMouseLeave={() => setPepTooltip(false)}
                        onClick={() => setPepTooltip((v) => !v)}
                        aria-label="PEP erklären"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                      {pepTooltip && (
                        <div className="absolute left-0 bottom-6 z-30 w-120 rounded-xl border border-border bg-card p-4 text-xs text-secondary shadow-xl leading-relaxed normal-case tracking-normal">
                          <p className="font-semibold text-foreground mb-1">PEP – Politisch exponierte Person</p>
                          {PEP_TOOLTIP}
                        </div>
                      )}
                    </div>
                  </p>
                </div>
              </FormSection>
            )}
          </>
        )}
        <p className="text-[11px] text-accent">
          Mit * markierte Felder sind Pflichtangaben.
        </p>
      </div>
    </AppShell>
  );
}
