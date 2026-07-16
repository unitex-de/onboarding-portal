import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Mail, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { useOnboarding, fetchCustomerByEmail, markDashboardSeen } from "@/lib/onboarding-state";
import { supabase } from "@/lib/supabase";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { z } from "zod";


const indexSearchSchema = z.object({
  email: z.string().optional(),
  verify: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: indexSearchSchema,
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
function WelcomeScreen({ name, email, onContinue }: { name: string; email?: string; onContinue: () => void }) {
  const text = name
    ? `Willkommen ${name} im unitex Onboarding Portal`
    : "Willkommen im unitex Onboarding Portal";
  const { displayed, done } = useTypewriter(text, 38, 300);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="max-w-xl px-8 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 border border-primary/30 animate-pulse">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <p className="font-display text-3xl font-bold text-foreground leading-snug min-h-[5rem]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-8 bg-primary ml-1 animate-pulse" />}
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
        {done && email && (
          <p className="text-xs text-muted animate-in fade-in duration-700">
            Tipp: Speichern Sie{" "}
            <a
              href={`https://onboarding.unitex.de/?email=${encodeURIComponent(email)}`}
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              diesen Link
            </a>{" "}
            als Lesezeichen für künftige Logins.
          </p>
        )}
      </div>
    </div>
  );
}

function Index() {
  const { email: prefillEmail, verify } = Route.useSearch();

  const navigate = useNavigate();
  const { state, loading, update } = useOnboarding();
    useEffect(() => {
      if (!state.loading && state.signedIn) {
        navigate({ to: state.role === "admin" ? "/admin" : "/dashboard" });
      }
    }, [state.loading, state.signedIn, state.role, navigate]);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [sent, setSent] = useState(verify === "1");
  const [verifyCode, setVerifyCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const pendingNav = useRef<() => void>(() => {});
  const pendingName = useRef<string>("");

  const onKundeRequest = async () => {
    if (!email.includes("@")) return;
    setEmailError(null);

    const { data: isRegistered } = await supabase.rpc("email_is_registered", { check_email: email });
    if (!isRegistered) {
      setEmailError("Diese E-Mail-Adresse ist uns nicht bekannt. Bitte wenden Sie sich an Ihren unitex-Ansprechpartner.");
      return;
    }

    update({ email });
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `https://onboarding.unitex.de/?email=${encodeURIComponent(email)}&verify=1`,
      },
    });

    if (otpError) {
      setEmailError("Code konnte nicht versendet werden. Bitte versuchen Sie es erneut.");
      return;
    }

    setSent(true);
  };

  const doVerify = async (code: string) => {
    if (code.length !== 6) return;
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) { setCodeError(true); return; }

    const customer = await fetchCustomerByEmail(email);
    const name = customer
      ? (customer.loggedInName || `${customer.firstName} ${customer.lastName}`.trim())
      : "";

    update({
      signedIn: true,
      role: "kunde",
      ...(customer ? {
        memberType: customer.memberType,
        legalForm: customer.legalForm,
        legalFormLockedByAdmin: true,
        userName: name,
        companyName: customer.companyName,
        activeCustomerId: customer.id,
        uploadedDocs: customer.uploadedDocs,
        completedSections: customer.completedSections,
        postalCode: customer.postalCode,
        country: customer.country,
        dashboardSeen: customer.dashboardSeen,
        savedFormData: customer.savedFormData ?? {},
      } : {}),
    });

    if (customer?.dashboardSeen) {
      // Nicht der erste Login → direkt zum Dashboard, kein Welcome-Screen, keine Tour
      navigate({ to: "/dashboard" });
    } else {
      pendingName.current = name;
      pendingNav.current = () => {
        if (customer) markDashboardSeen(customer.id);
        navigate({ to: "/dashboard" });
      };
      setShowWelcome(true);
    }
  };

  const onVerify = () => doVerify(verifyCode);

  if (showWelcome) {
    return (
      <WelcomeScreen
        name={pendingName.current}
        email={email}
        onContinue={() => {
          setShowWelcome(false);
          update({ dashboardSeen: true, pendingTourStart: true });
          pendingNav.current();
        }}
      />
    );
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
            {["Frei navigierbar", "Digital signieren", "DSGVO-konform"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-secondary">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-md justify-self-end">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
            {!sent ? (
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
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
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
                        setTimeout(() => doVerify(val), 300);
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