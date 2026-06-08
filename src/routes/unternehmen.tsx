import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Info, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormSection, Field, inputClass } from "@/components/forms/FormSection";
import { useOnboarding, type ContractType, type LegalForm } from "@/lib/onboarding-state";

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

const CONTRACT_OPTIONS: {
  value: ContractType;
  title: string;
  price: string;
  desc: string;
  highlight?: boolean;
}[] = [
  { value: "probe", title: "Probe-Vertrag", price: "Kostenlos", desc: "Keine Laufzeit, keine Gebühren während der Testphase." },
  { value: "3jahre", title: "3 Jahre Laufzeit", price: "€45 / Monat", desc: "Volle Boni, Standardlaufzeit.", highlight: true },
  { value: "5jahre", title: "5 Jahre Laufzeit", price: "€45 / Monat", desc: "Identische Boni, langfristige Konditionssicherheit." },
];

const SHOWS_GWG: LegalForm[] = ["GmbH", "GmbHCoKG", "KG", "OHG", "GbR"];

function UnternehmenPage() {
  const { state, update } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";

  // Local form state (real impl would use react-hook-form + auto-save).
  const [shareholders, setShareholders] = useState([
    { name: "", capital: "", voting: "", pep: false },
  ]);
  const [branches, setBranches] = useState([{ name: "", street: "", zip: "", city: "", gln: "" }]);
  const [hasGln, setHasGln] = useState(true);
  const [partnerCheck, setPartnerCheck] = useState(false);

  return (
    <AppShell
      title="Unternehmen"
      subtitle="Stammdaten, Bankdaten, GLN & Filialen, Geschäftsdaten — jederzeit zwischenspeicherbar."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Vertragsart */}
        <FormSection
          id="vertragsart"
          letter="0"
          title="Vertragsart wählen"
          description="Bestimmt Laufzeit, Boni und Gebühren Ihrer Mitgliedschaft."
        >
          <div className="grid md:grid-cols-3 gap-3">
            {CONTRACT_OPTIONS.map((c) => {
              const active = state.contractType === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => update({ contractType: c.value })}
                  className={[
                    "relative rounded-xl border p-5 text-left transition-all",
                    active
                      ? "border-primary bg-upload-active"
                      : "border-border bg-popover hover:border-primary/40",
                  ].join(" ")}
                >
                  {c.highlight && !active && (
                    <span className="absolute right-3 top-3 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                      Empfohlen
                    </span>
                  )}
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  <h4 className="font-display text-base font-semibold">{c.title}</h4>
                  <p className="mt-1 text-sm text-primary">{c.price}</p>
                  <p className="mt-2 text-xs text-secondary">{c.desc}</p>
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* Sektion A */}
        <FormSection id="grunddaten" letter="1" title="Grunddaten" description="Firmensitz und Rechtsform Ihres Unternehmens.">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Firmenname">
              <input className={inputClass} defaultValue={state.companyName} />
            </Field>
            <Field label="Rechtsform">
              <select
                className={inputClass}
                value={legalForm}
                onChange={(e) => update({ legalForm: e.target.value as LegalForm })}
              >
                {LEGAL_FORMS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Straße & Hausnummer"><input className={inputClass} placeholder="Musterstraße 12" /></Field>
            <Field label="PLZ / Ort">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input className={inputClass} placeholder="12345" />
                <input className={inputClass} placeholder="Musterstadt" />
              </div>
            </Field>
          </div>
        </FormSection>

        {/* Sektion B */}
        <FormSection id="kontakt" letter="2" title="Kontakt" description="Geschäftsführung und Buchhaltung.">
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

        {/* Sektion C */}
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

        {/* Sektion D */}
        <FormSection id="gln" letter="4" title="GLN & Filialen" description="Global Location Number und Filialstruktur.">
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
                    hasGln === v ? "bg-primary text-primary-foreground" : "bg-background text-secondary hover:text-foreground",
                  ].join(" ")}
                >
                  {v ? "Ja" : "Nein"}
                </button>
              ))}
            </div>
            {!hasGln && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-success">
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

        {/* Sektion E */}
        <FormSection id="geschaeft" letter="5" title="Geschäftsdaten" description="Umsatz, Mitarbeiter, Sortimentsschwerpunkte.">
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
          <div className="rounded-lg bg-popover p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={partnerCheck}
                onChange={(e) => setPartnerCheck(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium">Zusammenarbeit mit S.Oliver / Comma / Isco?</p>
                <p className="text-xs text-secondary">Aktiviert ein Sonderformular in der Signatur-Sektion.</p>
              </div>
            </label>
            {partnerCheck && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">
                <Info className="h-4 w-4 mt-0.5" />
                Sonderformular Zentralregulierung erforderlich – wird automatisch zur Signatur hinzugefügt.
              </div>
            )}
          </div>
        </FormSection>

        {/* Sektion F – conditional */}
        {SHOWS_GWG.includes(legalForm) && (
          <FormSection
            id="gwg"
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
                  <Plus className="h-3.5 w-3.5" /> Gesellschafter hinzufügen
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-popover text-xs uppercase tracking-wide text-secondary">
                    <tr>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium w-32">Kapital %</th>
                      <th className="text-left p-2 font-medium w-32">Stimmrecht %</th>
                      <th className="text-left p-2 font-medium w-20">PEP</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {shareholders.map((s, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1.5">
                          <input
                            value={s.name}
                            onChange={(e) => {
                              const n = [...shareholders];
                              n[i] = { ...n[i], name: e.target.value };
                              setShareholders(n);
                            }}
                            className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            value={s.capital}
                            onChange={(e) => {
                              const n = [...shareholders];
                              n[i] = { ...n[i], capital: e.target.value };
                              setShareholders(n);
                            }}
                            className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="50"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            value={s.voting}
                            onChange={(e) => {
                              const n = [...shareholders];
                              n[i] = { ...n[i], voting: e.target.value };
                              setShareholders(n);
                            }}
                            className="w-full rounded bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="50"
                          />
                        </td>
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