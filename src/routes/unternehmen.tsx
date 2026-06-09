import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Info, Lock, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormSection, Field, inputClass } from "@/components/forms/FormSection";
import { useOnboarding, type LegalForm } from "@/lib/onboarding-state";

export const Route = createFileRoute("/unternehmen")({
  head: () => ({ meta: [{ title: "Unternehmen | unitex Onboarding" }] }),
  component: UnternehmenPage,
});

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: "eK",       label: "e.K. (Einzelkaufmann)" },
  { value: "GbR",      label: "GbR" },
  { value: "GmbH",     label: "GmbH" },
  { value: "GmbHCoKG", label: "GmbH & Co. KG" },
  { value: "KG",       label: "KG" },
  { value: "OHG",      label: "OHG" },
];

/** GWG section shown for these forms */
const SHOWS_GWG: LegalForm[] = ["GmbH", "GmbHCoKG", "KG", "OHG", "GbR"];

function UnternehmenPage() {
  const { state, update } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";

  // Local form state
  const [shareholders, setShareholders] = useState([
    { name: "", capital: "", voting: "", pep: false },
  ]);
  const [branches, setBranches] = useState([{ name: "", street: "", zip: "", city: "", gln: "" }]);
  const [hasGln, setHasGln] = useState(true);

  const handleSoliver = (checked: boolean) => {
    update({ hasSoliver: checked });
  };

  return (
    <AppShell
      title="Unternehmen"
      subtitle="Stammdaten, Bankdaten, GLN & Filialen, Geschäftsdaten — jederzeit zwischenspeicherbar."
    >
      <div className="space-y-6 max-w-4xl">

        {/* SECTION 1 – Grunddaten */}
        <FormSection id="grunddaten" letter="1" title="Grunddaten" description="Firmensitz und Rechtsform Ihres Unternehmens.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Firmenname">
              <input className={inputClass} defaultValue={state.companyName}
                onChange={(e) => update({ companyName: e.target.value })} />
            </Field>

            {/* Rechtsform – locked if set by admin */}
            <Field label="Rechtsform">
              {state.legalFormLockedByAdmin ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-popover/50 px-3 py-2.5">
                  <Lock className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-sm text-foreground">
                    {LEGAL_FORMS.find((f) => f.value === legalForm)?.label ?? legalForm}
                  </span>
                  <span className="ml-auto text-[10px] text-muted">Vom Admin festgelegt</span>
                </div>
              ) : (
                <select
                  className={inputClass}
                  value={legalForm}
                  onChange={(e) => update({ legalForm: e.target.value as LegalForm })}
                >
                  {LEGAL_FORMS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Straße & Hausnummer">
              <input className={inputClass} placeholder="Musterstraße 12" />
            </Field>
            <Field label="PLZ / Ort">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input className={inputClass} placeholder="12345" />
                <input className={inputClass} placeholder="Musterstadt" />
              </div>
            </Field>
          </div>

        </FormSection>

        {/* SECTION 2 – Kontakt */}
        <FormSection id="kontakt" letter="2" title="Kontaktinformationen" description="Geschäftsführung und Buchhaltung.">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">Geschäftsführung</p>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name"><input className={inputClass} /></Field>
            <Field label="E-Mail"><input type="email" className={inputClass} /></Field>
            <Field label="Telefon"><input type="tel" className={inputClass} /></Field>
          </div>
          <Checkbox label="GF ist gleichzeitig Inhaber" />
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-secondary">Buchhaltung</p>
          <Checkbox label="Identisch mit Geschäftsführung" />
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Name"><input className={inputClass} /></Field>
            <Field label="E-Mail"><input type="email" className={inputClass} /></Field>
            <Field label="Telefon"><input type="tel" className={inputClass} /></Field>
          </div>

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

        </FormSection>

        {/* SECTION 4 – GLN & Filialen */}
        <FormSection id="gln_filialen" letter="4" title="GLN & Filialen" description="Global Location Number und Filialstruktur.">
          <div className="rounded-lg bg-popover p-4">
            <p className="text-sm font-medium text-foreground mb-3">Haben Sie bereits eine GLN-Nummer?</p>
            <div className="flex gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setHasGln(v)}
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
              <button
                type="button"
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
                        <button
                          type="button"
                          onClick={() => setBranches(branches.filter((_, j) => j !== i))}
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
          </div>

        </FormSection>

        {/* SECTION 5 – Geschäftsdaten */}
        <FormSection id="geschaeftsdaten" letter="5" title="Geschäftsdaten" description="Umsatz, Mitarbeiter, Sortimentsschwerpunkte.">
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Geschätzter Jahresumsatz">
              <select className={inputClass}>
                <option>bis 500.000 €</option>
                <option>500.000 € – 1 Mio €</option>
                <option>1 – 5 Mio €</option>
                <option>über 5 Mio €</option>
              </select>
            </Field>
            <Field label="Mitarbeiterzahl"><input type="number" className={inputClass} /></Field>
            <Field label="Gründungsdatum"><input type="date" className={inputClass} /></Field>
          </div>
          <Field label="Sortimentsschwerpunkte">
            <div className="flex flex-wrap gap-2">
              {["Damenmode", "Herrenmode", "Kindermode", "Schuhe", "Accessoires", "Wäsche"].map((c) => (
                <Pill key={c} label={c} />
              ))}
            </div>
          </Field>
          <Field label="Wichtige Marken" hint="Komma-getrennt">
            <input className={inputClass} placeholder="z.B. Tommy Hilfiger, Marc O'Polo" />
          </Field>

          {/* S.Oliver toggle */}
          <div className="rounded-lg bg-popover p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.hasSoliver}
                onChange={(e) => handleSoliver(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Zusammenarbeit mit S.Oliver / Comma / Isco?</p>
                <p className="text-xs text-secondary">Aktiviert ein Sonderformular in der Signatur-Sektion.</p>
              </div>
            </label>
            {state.hasSoliver && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
                <Info className="h-4 w-4 mt-0.5" />
                Sonderformular Zentralregulierung wird automatisch zur Signatur hinzugefügt.
              </div>
            )}
          </div>

        </FormSection>

        {/* SECTION 6 – GWG (conditional) */}
        {SHOWS_GWG.includes(legalForm) && (
          <FormSection
            id="gwg_daten"
            letter="6"
            title="GWG-Daten"
            description="Geldwäschegesetz – wirtschaftlich Berechtigte und Gesellschafterstruktur."
          >
            <Checkbox label="Es besteht keine Marktabhängigkeit gegenüber einem einzelnen Lieferanten (>50% Umsatz)." />
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
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium w-28">Kapital %</th>
                      <th className="text-left p-2 font-medium w-28">Stimmrecht %</th>
                      <th className="text-left p-2 font-medium w-16">PEP</th>
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
                              className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder={k !== "name" ? "50" : ""}
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={s.pep}
                            onChange={(e) => {
                              const n = [...shareholders];
                              n[i] = { ...n[i], pep: e.target.checked };
                              setShareholders(n);
                            }}
                            className="h-4 w-4 accent-primary"
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
            </div>

          </FormSection>
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
      <button
        type="button"
        onClick={onSave}
        className={[
          "inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-colors",
          done
            ? "bg-primary/20 text-primary border border-primary/30 cursor-default"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        ].join(" ")}
      >
        {done ? (
          <><Check className="h-4 w-4" /> Gespeichert</>
        ) : (
          "Speichern"
        )}
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
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        on
          ? "border-primary bg-upload-active text-primary"
          : "border-border text-secondary hover:border-primary/50 hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
