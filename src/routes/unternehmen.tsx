import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Info, Lock, Plus, Trash2, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormSection, Field, inputClass } from "@/components/forms/FormSection";
import { useOnboarding, type LegalForm, getProgressBreakdown } from "@/lib/onboarding-state";

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

const PEP_TOOLTIP = "Im Sinne der geldwäscherechtlichen Vorschriften (z. B. § 1 Abs. 11 GwG) bezeichnet eine politisch exponierte Person (PEP) Einzelpersonen, die wichtige öffentliche Ämter ausüben oder ausgeübt haben (z. B. Staatschefs, Regierungsmitglieder, Abgeordnete). Aufgrund gesetzlicher Vorgaben zur Geldwäscheprävention und eines potenziell erhöhten Risikos für Korruption unterliegen Geschäftsbeziehungen mit PEPs erweiterten Sorgfaltspflichten.";
const SONDER_TOOLTIP = "Diese Firmen benötigen eine aktive Bestätigung um gesondert über die Zentralregulierung abgewickelt zu werden.";

function UnternehmenPage() {
  const navigate = useNavigate();
  const { state, update, completeSection } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";
  const isLieferant = state.memberType === "lieferant";

  // Grunddaten state
  const [firmenname, setFirmenname] = useState(state.companyName);
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("DE");

  // Kontakt state
  const [gfName, setGfName] = useState("");
  const [gfEmail, setGfEmail] = useState("");
  const [gfTel, setGfTel] = useState("");
  const [buchungIdent, setBuchungIdent] = useState(state.buchungIdentischGF ?? true);
  const [buName, setBuName] = useState("");
  const [buEmail, setBuEmail] = useState("");
  const [buTel, setBuTel] = useState("");

  // Sync buchungIdent to global state
  useEffect(() => {
    update({ buchungIdentischGF: buchungIdent });
  }, [buchungIdent]);

  // Shareholders + branches
  const [shareholders, setShareholders] = useState([{ name: "", capital: "", voting: "", pep: false }]);
  const [branches, setBranches] = useState([{ name: "", street: strasse, zip: plz, city: ort, gln: "" }]);
  const [hasGln, setHasGln] = useState(true);
  const [pepTooltip, setPepTooltip] = useState(false);
  const [sonderTooltip, setSonderTooltip] = useState(false);

  // Lieferant Stammblatt state
  const [liefSortiment, setLiefSortiment] = useState("");
  const [liefMarken, setLiefMarken] = useState("");
  const [liefAnsprechpartner, setLiefAnsprechpartner] = useState("");

  // Auto-fill first branch address from Grunddaten
  const syncAddressToBranch = () => {
    setBranches((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[0] = { ...next[0], street: strasse, zip: plz, city: ort, name: firmenname || next[0].name };
      return next;
    });
  };

  // Track section progress for auto-navigation
  const { uploads } = getProgressBreakdown(state);

  const saveSection = (id: string, extraUpdate?: Partial<typeof state>) => {
    completeSection(id);
    if (extraUpdate) update(extraUpdate);
  };

  const handleSaveGrunddaten = () => {
    update({ companyName: firmenname });
    syncAddressToBranch();
    saveSection("grunddaten");
  };

  const handleSaveKontakt = () => saveSection("kontakt");
  const handleSaveBankdaten = () => saveSection("bankdaten");
  const handleSaveGln = () => saveSection("gln_filialen");
  const handleSaveGeschaeft = () => saveSection("geschaeftsdaten");
  const handleSaveGwg = () => saveSection("gwg_daten");
  const handleSaveLieferantStamm = () => saveSection("lieferant_stamm");

  // Auto-navigate after a section saves and stammdaten hits 100%
  const checkAutoNav = () => {
    const { stammdaten } = getProgressBreakdown(state);
    if (stammdaten >= 100) {
      setTimeout(() => navigate({ to: "/upload-center" }), 800);
    }
  };

  return (
    <AppShell
      title="Unternehmen"
      subtitle={isLieferant
        ? "Stammdaten, Bankdaten & Lieferanten-Stammblatt — jederzeit zwischenspeicherbar."
        : "Stammdaten, Bankdaten, GLN & Filialen — jederzeit zwischenspeicherbar."}
    >
      <div className="space-y-6 max-w-4xl">

        {/* SECTION 1 – Grunddaten */}
        <FormSection id="grunddaten" letter="1" title="Grunddaten" description="Geben Sie hier den offiziellen Sitz Ihres Unternehmens an.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Firmenname">
              <input className={inputClass} value={firmenname}
                onChange={(e) => setFirmenname(e.target.value)} />
            </Field>
            <Field label="Rechtsform">
              {state.legalFormLockedByAdmin ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-popover/50 px-3 py-2.5">
                  <Lock className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm text-foreground">
                    {LEGAL_FORMS.find((f) => f.value === legalForm)?.label ?? legalForm}
                  </span>
                  <span className="ml-auto text-[10px] text-muted">(Wurde bereits bei der Registrierung hinterlegt)</span>
                </div>
              ) : (
                <select className={inputClass} value={legalForm}
                  onChange={(e) => update({ legalForm: e.target.value as LegalForm })}>
                  {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Straße & Hausnummer">
              <input className={inputClass} placeholder="Musterstraße 12"
                value={strasse} onChange={(e) => setStrasse(e.target.value)} />
            </Field>
            <Field label="PLZ / Ort / Land">
              <div className="grid grid-cols-[100px_1fr_60px] gap-2">
                <input className={inputClass} placeholder="12345"
                  value={plz} onChange={(e) => setPlz(e.target.value)} />
                <input className={inputClass} placeholder="Musterstadt"
                  value={ort} onChange={(e) => setOrt(e.target.value)} />
                <input className={inputClass} placeholder="DE"
                  value={land} onChange={(e) => setLand(e.target.value)} />
              </div>
            </Field>
          </div>
          <SaveButton onSave={handleSaveGrunddaten} done={!!state.completedSections["grunddaten"]} />
        </FormSection>

        {/* SECTION 2 – Kontakt */}
        <FormSection id="kontakt" letter="2" title="Kontaktinformationen" description="Ansprechpartner für die Geschäftsführung und Ihre Buchhaltung.">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">Geschäftsführung</p>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name"><input className={inputClass} value={gfName} onChange={(e) => setGfName(e.target.value)} /></Field>
            <Field label="E-Mail"><input type="email" className={inputClass} value={gfEmail} onChange={(e) => setGfEmail(e.target.value)} /></Field>
            <Field label="Telefon"><input type="tel" className={inputClass} value={gfTel} onChange={(e) => setGfTel(e.target.value)} /></Field>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-secondary mb-2">Buchhaltung</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <input type="checkbox" className="h-4 w-4 accent-primary"
                checked={buchungIdent}
                onChange={(e) => setBuchungIdent(e.target.checked)} />
              Die Buchhaltung wird ebenfalls von der Geschäftsführung übernommen.
            </label>
          </div>

          {/* Conditional buchhaltung fields */}
          {!buchungIdent && (
            <div className="mt-3 rounded-lg border border-border bg-popover/30 p-4 space-y-4">
              <p className="text-xs text-secondary">Kontakt der Buchhaltung (abweichend)</p>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Name"><input className={inputClass} value={buName} onChange={(e) => setBuName(e.target.value)} /></Field>
                <Field label="E-Mail"><input type="email" className={inputClass} value={buEmail} onChange={(e) => setBuEmail(e.target.value)} /></Field>
                <Field label="Telefon"><input type="tel" className={inputClass} value={buTel} onChange={(e) => setBuTel(e.target.value)} /></Field>
              </div>
            </div>
          )}
          <SaveButton onSave={handleSaveKontakt} done={!!state.completedSections["kontakt"]} />
        </FormSection>

        {/* SECTION 3 – Bankdaten */}
        <FormSection id="bankdaten" letter="3" title="Bankdaten" description="Konto- und Steuerinformationen.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Bankname"><input className={inputClass} /></Field>
            <Field label="BIC"><input className={inputClass} placeholder="GENODEM1XXX" /></Field>
            <Field label="IBAN" className="md:col-span-2">
              <input className={inputClass} placeholder="DE89 3704 0044 0532 0130 00" />
            </Field>
            <Field label="Steuernummer"><input className={inputClass} /></Field>
            <Field label="USt-IdNr."><input className={inputClass} placeholder="DE123456789" /></Field>
          </div>
          <SaveButton onSave={handleSaveBankdaten} done={!!state.completedSections["bankdaten"]} />
        </FormSection>

        {/* LIEFERANT: Stammblatt statt GLN/Geschäftsdaten/GWG */}
        {isLieferant ? (
          <FormSection id="lieferant_stamm" letter="4" title="Lieferanten-Stammblatt" description="Sortiment, Marken und Ansprechpartner.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Sortimentsschwerpunkte">
                <input className={inputClass} placeholder="z.B. Damenmode, Herrenmode"
                  value={liefSortiment} onChange={(e) => setLiefSortiment(e.target.value)} />
              </Field>
              <Field label="Wichtigste Marken / Eigenmarken">
                <input className={inputClass} placeholder="Komma-getrennt"
                  value={liefMarken} onChange={(e) => setLiefMarken(e.target.value)} />
              </Field>
              <Field label="Ansprechpartner unitex-Betreuung">
                <input className={inputClass} placeholder="Name des Betreuers"
                  value={liefAnsprechpartner} onChange={(e) => setLiefAnsprechpartner(e.target.value)} />
              </Field>
            </div>
            <SaveButton onSave={handleSaveLieferantStamm} done={!!state.completedSections["lieferant_stamm"]} />
          </FormSection>
        ) : (
          <>
            {/* SECTION 4 – GLN & Filialen */}
            <FormSection id="gln_filialen" letter="4" title="GLN & Filialen" description="Global Location Number und Filialstruktur.">
              <div className="rounded-lg bg-popover p-4">
                <p className="text-sm font-medium text-foreground mb-3">Haben Sie bereits eine GLN-Nummer?</p>
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" onClick={() => setHasGln(v)}
                      className={[
                        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                        hasGln === v ? "bg-primary text-primary-foreground" : "bg-background text-secondary hover:text-foreground",
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
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Straße</th>
                        <th className="text-left p-2 font-medium w-20">PLZ</th>
                        <th className="text-left p-2 font-medium">Ort</th>
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
                                className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
                  Ihre Hauptadresse (aus Schritt 1) haben wir bereits als erste Filiale für Sie angelegt. Sie können diese bei Bedarf anpassen.
                </p>
              </div>
              <SaveButton onSave={handleSaveGln} done={!!state.completedSections["gln_filialen"]} />
            </FormSection>

            {/* SECTION 5 – Geschäftsdaten */}
            <FormSection id="geschaeftsdaten" letter="5" title="Geschäftsdaten" description="Umsatz, Mitarbeiter, Sortimentsschwerpunkte.">
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Geschätzter Jahresumsatz" hint="Auf 100.000 € gerundet">
                  <input className={inputClass} placeholder="z.B. 800.000" />
                </Field>
                <Field label="Mitarbeiterzahl"><input type="number" className={inputClass} /></Field>
                <Field label="Gründungsdatum"><input type="date" className={inputClass} /></Field>
              </div>
              <Field label="Sortimentsschwerpunkte">
                <div className="flex flex-wrap gap-2">
                  {["DOB", "HAKA", "KIKO", "Schuhe", "Accessoires", "Wäsche"].map((c) => (
                    <Pill key={c} label={c} />
                  ))}
                </div>
              </Field>
              <Field label="Ihre wichtigsten Marken" hint="Komma-getrennt">
                <input className={inputClass} placeholder="z.B. StreetOne, Cecil, Opus" />
              </Field>
              
              {/* S.Oliver toggle */}
              <div className="rounded-lg bg-popover p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={state.hasSoliver}
                    onChange={(e) => update({ hasSoliver: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-primary" />
                  <div className="flex-1">
                    
                    {/* Dieser Container bringt Text und Icon in eine Reihe */}
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">Zusammenarbeit mit s.Oliver / COMMA / Gebr. Amman (ISCO)?</p>
                      
                      {/* SONDER tooltip trigger */}
                      <div className="relative inline-block">
                        <button type="button"
                          className="text-muted hover:text-primary transition-colors flex items-center"
                          onMouseEnter={() => setSonderTooltip(true)}
                          onMouseLeave={() => setSonderTooltip(false)}
                          onClick={(e) => {
                            e.preventDefault(); // Verhindert, dass die Checkbox ungewollt triggert
                            setSonderTooltip((v) => !v);
                          }}
                          aria-label="Sonder erklären"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                        {sonderTooltip && (
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-80 rounded-xl border border-border bg-card p-4 text-xs text-secondary shadow-xl leading-relaxed">
                            <p className="font-semibold text-foreground mb-1">Warum wollen wir das wissen?</p>
                            {SONDER_TOOLTIP}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-secondary mt-0.5">Falls ja, schalten wir direkt die passenden Sonder-Verträge für Sie frei.</p>
                  </div>
                </label>
                {state.hasSoliver && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
                    <Info className="h-4 w-4 mt-0.5" />
                    Sonderformular Zentralregulierung wurde automatisch zur Signatur hinzugefügt.
                  </div>
                )}
              </div>
              <SaveButton onSave={handleSaveGeschaeft} done={!!state.completedSections["geschaeftsdaten"]} />
            </FormSection>

            {/* SECTION 6 – GWG */}
            {SHOWS_GWG.includes(legalForm) && (
              <FormSection id="gwg_daten" letter="6" title="GWG-Daten"
                description="Gesetzliche Pflichtangaben nach dem Geldwäschegesetz (GwG).">
                <Checkbox label="Besteht eine wirtschaftliche Abhängigkeit zu einem einzelnen Lieferanten (mehr als 50% des Gesamtumsatzes)?" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">Gesellschafter</p>
                      {/* PEP tooltip trigger */}
                      <div className="relative">
                        <button type="button"
                          className="text-muted hover:text-primary transition-colors"
                          onMouseEnter={() => setPepTooltip(true)}
                          onMouseLeave={() => setPepTooltip(false)}
                          onClick={() => setPepTooltip((v) => !v)}
                          aria-label="PEP erklären"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                        {pepTooltip && (
                          <div className="absolute left-6 top-0 z-30 w-80 rounded-xl border border-border bg-card p-4 text-xs text-secondary shadow-xl leading-relaxed">
                            <p className="font-semibold text-foreground mb-1">PEP – Politisch exponierte Person *</p>
                            {PEP_TOOLTIP}
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="button" disabled={shareholders.length >= 6}
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
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium w-28">Kapital %</th>
                          <th className="text-left p-2 font-medium w-28">Stimmrecht %</th>
                          <th className="text-left p-2 font-medium w-16">PEP *</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {shareholders.map((s, i) => (
                          <tr key={i} className="border-t border-border">
                            {(["name", "capital", "voting"] as const).map((k) => (
                              <td key={k} className="p-1.5">
                                <input value={s[k]}
                                  onChange={(e) => {
                                    const n = [...shareholders];
                                    n[i] = { ...n[i], [k]: e.target.value };
                                    setShareholders(n);
                                  }}
                                  className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  placeholder={k !== "name" ? "50" : ""}
                                />
                              </td>
                            ))}
                            <td className="p-1.5 text-center">
                              <input type="checkbox" checked={s.pep}
                                onChange={(e) => {
                                  const n = [...shareholders];
                                  n[i] = { ...n[i], pep: e.target.checked };
                                  setShareholders(n);
                                }}
                                className="h-4 w-4 accent-primary"
                              />
                            </td>
                            <td className="p-1.5">
                              <button type="button"
                                onClick={() => setShareholders(shareholders.filter((_, j) => j !== i))}
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
                    * PEP = Politisch exponierte Person gem. § 1 Abs. 11 GwG. Hover auf <HelpCircle className="inline h-3 w-3" /> für mehr Informationen.
                  </p>
                </div>
                <SaveButton onSave={handleSaveGwg} done={!!state.completedSections["gwg_daten"]} />
              </FormSection>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SaveButton({ onSave, done }: { onSave: () => void; done: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button type="button" onClick={onSave}
        className={[
          "inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-colors",
          done
            ? "bg-primary/20 text-primary border border-primary/30 cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        ].join(" ")}
      >
        {done ? (<><Check className="h-4 w-4" /> Gespeichert</>) : "Speichern"}
      </button>
    </div>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
      <input type="checkbox" className="h-4 w-4 accent-primary" />
      {label}
    </label>
  );
}

function Pill({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" onClick={() => setOn((v) => !v)}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        on ? "border-primary bg-primary/10 text-primary" : "border-border text-secondary hover:border-primary/50 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
