import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck, CheckCircle2, UserCog, User } from "lucide-react";
import { useOnboarding, type MemberType, type LegalForm, type UserRole } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "unitex Onboarding Portal" },
      { name: "description", content: "Werden Sie Mitglied bei unitex – dem Verband für Textileinkauf." },
    ],
  }),
  component: Index,
});

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: "eK", label: "e.K. (Einzelkaufmann)" },
  { value: "GbR", label: "GbR" },
  { value: "GmbH", label: "GmbH" },
  { value: "GmbHCoKG", label: "GmbH & Co. KG" },
  { value: "KG", label: "KG" },
  { value: "OHG", label: "OHG" },
];

function Index() {
  const navigate = useNavigate();
  const { state, update } = useOnboarding();

  const [role, setRole] = useState<UserRole>("kunde");
  const [email, setEmail] = useState(state.email ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>(state.memberType ?? "händler");
  const [legalForm, setLegalForm] = useState<LegalForm>(state.legalForm ?? "GmbH");
  const [sent, setSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const onAdminSubmit = () => {
    if (!email.includes("@") || !firstName || !lastName) return;
    update({
      email,
      memberType,
      legalForm,
      legalFormLockedByAdmin: true,
      userName: `${firstName} ${lastName}`,
      role: "admin",
      signedIn: true,
    });
    // Admin goes to the customer overview
    navigate({ to: "/admin" });
  };

  const onKundeRequest = () => {
    if (!email.includes("@")) return;
    update({ email, memberType });
    setSent(true);
  };

  const onVerify = () => {
    if (verifyCode.length === 6) {
      update({ signedIn: true, role: "kunde", tourSeen: false });
      navigate({ to: "/dashboard" });
    } else {
      setCodeError(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-10 py-8 flex items-center justify-between">
        <div className="flex flex-row items-end gap-3 p-1">
          <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
            <UnitexLogo className="h-4 w-[60px] text-slate-900" />
          </div>
          <span className="text-[10px] leading-tight font-medium">
            VERTRAUEN.<br />
            KOMPETENZ.<br />
            <span className="text-[#FACBBA]">INNOVATION.</span>
          </span>
        </div>
        <a href="https://unitex.de/kontakt/" target="_blank" rel="noopener noreferrer"
          className="text-sm text-secondary hover:text-foreground">
          Hilfe benötigt?
        </a>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-12 px-10 pb-16 max-w-7xl w-full mx-auto items-center">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Passwortloser Zugang per Magic Link
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
            Willkommen im<br />
            <span className="text-primary">unitex Onboarding Portal.</span>
          </h1>
          <p className="text-base text-secondary max-w-md">
            Schließen Sie Ihre ZR-Mitgliedschaft in wenigen Schritten ab.<br />
            Flexibel, sicher und ohne Papierkram.
          </p>
          <ul className="space-y-3 pt-2">
            {["Frei navigierbar", "Digital signieren via PandaDoc"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-secondary">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-md justify-self-end">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
            {/* Role switcher */}
            <div className="mb-6">
              <label className="text-xs font-medium text-secondary uppercase tracking-wide">Ich bin</label>
              <div className="mt-2 grid grid-cols-2 gap-2 p-1 rounded-lg bg-popover">
                {([
                  { value: "kunde" as UserRole, label: "Kunde", icon: User },
                  { value: "admin" as UserRole, label: "Admin (unitex)", icon: UserCog },
                ]).map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => setRole(value)}
                    className={[
                      "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
                      role === value ? "bg-primary text-primary-foreground" : "text-secondary hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {role === "admin" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Admin-Anmeldung</h2>
                  <p className="mt-1 text-sm text-secondary">Melden Sie sich an, um zur Kunden-Übersicht zu gelangen.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-secondary uppercase tracking-wide">Vorname</label>
                    <input className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tanja" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-secondary uppercase tracking-wide">Nachname</label>
                    <input className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Lemke" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">E-Mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input type="email"
                      className="w-full rounded-md border border-border bg-popover pl-9 pr-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tl@unitex.de" />
                  </div>
                </div>
                <button type="button" onClick={onAdminSubmit}
                  disabled={!email.includes("@") || !firstName || !lastName}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zur Kunden-Übersicht
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            ) : !sent ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Anmelden</h2>
                  <p className="mt-1 text-sm text-secondary">Geben Sie Ihre geschäftliche E-Mail-Adresse ein. Wir senden Ihnen einen sicheren Anmelde-Link.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">E-Mail-Adresse</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@firma.de"
                      className="w-full rounded-md border border-border bg-popover pl-9 pr-3 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <button type="button" onClick={onKundeRequest} disabled={!email.includes("@")}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Magic Link anfordern
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="text-[11px] text-muted text-center">
                  Mit dem Fortfahren akzeptieren Sie unsere Datenschutzbestimmungen.
                </p>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-card border border-border">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">Prüfen Sie Ihr Postfach</h2>
                  <p className="mt-2 text-sm text-secondary">
                    Wir haben einen 6-stelligen Code an{" "}
                    <span className="text-foreground font-medium">{email}</span> gesendet.
                  </p>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs text-secondary uppercase tracking-wide">Verifizierungscode</label>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={verifyCode}
                    onChange={(e) => { setVerifyCode(e.target.value.replace(/\D/g, "")); setCodeError(false); }}
                    placeholder="123456"
                    className={[
                      "w-full rounded-md border bg-popover px-3 py-2.5 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-1",
                      codeError ? "border-destructive focus:ring-destructive" : "border-border focus:border-primary focus:ring-primary",
                    ].join(" ")}
                  />
                  {codeError && <p className="text-xs text-destructive">Ungültiger Code. Bitte 6 Ziffern eingeben.</p>}
                </div>
                <button type="button" onClick={onVerify}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Bestätigen <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button"
                  onClick={() => { setSent(false); setVerifyCode(""); setCodeError(false); }}
                  className="text-xs text-secondary hover:text-foreground underline underline-offset-4"
                >
                  Andere E-Mail verwenden
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
