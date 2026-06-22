import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Mail, ShieldCheck, CheckCircle2, UserCog, User, Lock, Sparkles } from "lucide-react";
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

// ── Typewriter helper ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 40, startDelay = 0) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ── Welcome screen after verification ─────────────────────────────────────────
function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const WELCOME_TEXT = "Willkommen im Onboarding von unitex ZR! Wir begleiten Sie durch den Prozess Mitglied unserer FashionCommunity zu werden!";
  const { displayed, done } = useTypewriter(WELCOME_TEXT, 30, 300);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="max-w-lg px-8 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 border border-primary/30 animate-pulse">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <p className="font-display text-2xl font-semibold text-foreground leading-relaxed min-h-[5rem]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-6 bg-primary ml-1 animate-pulse" />}
        </p>
        <div className="flex flex-col items-center gap-3 min-h-[2.5rem]">
          {done && (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all animate-in fade-in duration-500"
            >
              Los geht's <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {!done && (
            <button
              type="button"
              onClick={onContinue}
              className="text-xs text-muted hover:text-secondary underline underline-offset-4 transition-colors"
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  const { state, update } = useOnboarding();

  const [role, setRole] = useState<UserRole>("kunde");
  const [email, setEmail] = useState(state.email ?? "");
  const [sent, setSent] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const pendingNav = useRef<() => void>(() => {});

  // Admin fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmailError, setAdminEmailError] = useState("");
  const [adminPassError, setAdminPassError] = useState(false);

  const ADMIN_PASSWORD = "unitex2026";

  const validateAdminEmail = (val: string) => {
    if (!val.includes("@")) return "Bitte eine gültige E-Mail eingeben.";
    if (!val.toLowerCase().endsWith("@unitex.de")) return "Nur @unitex.de E-Mail-Adressen sind erlaubt.";
    return "";
  };

  const onAdminSubmit = () => {
    const emailErr = validateAdminEmail(adminEmail);
    if (emailErr) { setAdminEmailError(emailErr); return; }
    if (adminPassword !== ADMIN_PASSWORD) { setAdminPassError(true); return; }

    const prefix = adminEmail.split("@")[0];
    const parts = prefix.split(".");
    const userName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

    update({
      email: adminEmail,
      legalFormLockedByAdmin: false,
      userName,
      role: "admin",
      signedIn: true,
      activeCustomerId: null,
    });
    navigate({ to: "/admin" });
  };

  const onKundeRequest = () => {
    if (!email.includes("@")) return;
    update({ email });
    setSent(true);
  };

  const onVerify = () => {
    if (verifyCode.length === 6) {
      const matchingAccount = state.customerAccounts.find(
        (a) => a.email.toLowerCase() === email.toLowerCase()
      );
      update({
        signedIn: true,
        role: "kunde",
        tourSeen: false,
        ...(matchingAccount ? {
          memberType: matchingAccount.memberType,
          legalForm: matchingAccount.legalForm,
          legalFormLockedByAdmin: true,
          userName: `${matchingAccount.firstName} ${matchingAccount.lastName}`,
          companyName: matchingAccount.companyName,
          activeCustomerId: matchingAccount.id,
          uploadedDocs: matchingAccount.uploadedDocs,
          completedSections: matchingAccount.completedSections,
          postalCode: matchingAccount.postalCode,
          country: matchingAccount.country,
        } : {}),
      });
      // Show welcome animation, then navigate
      pendingNav.current = () => navigate({ to: "/dashboard" });
      setShowWelcome(true);
    } else {
      setCodeError(true);
    }
  };

  if (showWelcome) {
    return <WelcomeScreen onContinue={() => { setShowWelcome(false); pendingNav.current(); }} />;
  }

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
            {["Frei navigierbar", "Digital signieren via PandaDoc", "DSGVO-konform"].map((t) => (
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
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Admin-Anmeldung</h2>
                  <p className="mt-1 text-sm text-secondary">Nur für unitex-Mitarbeiter.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">E-Mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      type="email"
                      className={[
                        "w-full rounded-md border bg-popover pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1",
                        adminEmailError
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:border-primary focus:ring-primary",
                      ].join(" ")}
                      value={adminEmail}
                      onChange={(e) => { setAdminEmail(e.target.value); setAdminEmailError(""); }}
                      placeholder="name@unitex.de"
                    />
                  </div>
                  {adminEmailError && <p className="text-xs text-destructive">{adminEmailError}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> Passwort
                  </label>
                  <input
                    type="password"
                    className={[
                      "w-full rounded-md border bg-popover px-3 py-2.5 text-sm focus:outline-none focus:ring-1",
                      adminPassError
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:border-primary focus:ring-primary",
                    ].join(" ")}
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setAdminPassError(false); }}
                    placeholder="••••••••"
                    onKeyDown={(e) => { if (e.key === "Enter") onAdminSubmit(); }}
                  />
                  {adminPassError && <p className="text-xs text-destructive">Falsches Passwort.</p>}
                </div>
                <button
                  type="button"
                  onClick={onAdminSubmit}
                  disabled={!adminEmail || !adminPassword}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anmelden
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            ) : !sent ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">Anmelden</h2>
                  <p className="mt-1 text-sm text-secondary">
                    Geben Sie Ihre geschäftliche E-Mail-Adresse ein. Wir senden Ihnen einen sicheren Einmal-Code.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">E-Mail-Adresse</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@firma.de"
                      className="w-full rounded-md border border-border bg-popover pl-9 pr-3 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      onKeyDown={(e) => { if (e.key === "Enter") onKundeRequest(); }}
                    />
                  </div>
                </div>
                <button type="button" onClick={onKundeRequest} disabled={!email.includes("@")}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Einmal-Code anfordern
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="text-[11px] text-muted text-center">
                  Mit dem Fortfahren akzeptieren Sie unsere{" "}
                  <a href="https://unitex.de/datenschutz/" target="_blank" rel="noopener noreferrer" className="underline">
                    Datenschutzbestimmungen
                  </a>.
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
                    Der Code ist 10 Minuten gültig.
                  </p>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs text-secondary uppercase tracking-wide">Verifizierungscode</label>
                  <input type="text" inputMode="numeric" maxLength={6}
                    value={verifyCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setVerifyCode(val);
                      setCodeError(false);
                      // Auto-verify on 6 digits
                      if (val.length === 6) {
                        setTimeout(() => {
                          const matchingAccount = state.customerAccounts.find(
                            (a) => a.email.toLowerCase() === email.toLowerCase()
                          );
                          update({
                            signedIn: true,
                            role: "kunde",
                            tourSeen: false,
                            ...(matchingAccount ? {
                              memberType: matchingAccount.memberType,
                              legalForm: matchingAccount.legalForm,
                              legalFormLockedByAdmin: true,
                              userName: `${matchingAccount.firstName} ${matchingAccount.lastName}`,
                              companyName: matchingAccount.companyName,
                              activeCustomerId: matchingAccount.id,
                              uploadedDocs: matchingAccount.uploadedDocs,
                              completedSections: matchingAccount.completedSections,
                              postalCode: matchingAccount.postalCode,
                              country: matchingAccount.country,
                            } : {}),
                          });
                          pendingNav.current = () => navigate({ to: "/dashboard" });
                          setShowWelcome(true);
                        }, 300);
                      }
                    }}
                    placeholder="123456"
                    autoFocus
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
