import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useOnboarding, type MemberType } from "@/lib/onboarding-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "unitex Onboarding Portal" },
      { name: "description", content: "Werden Sie Mitglied bei unitex – dem Verband für Textileinkauf. Starten Sie Ihr Onboarding in wenigen Minuten." },
      { property: "og:title", content: "unitex Onboarding Portal" },
      { property: "og:description", content: "Werden Sie Mitglied bei unitex – dem Verband für Textileinkauf." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { state, update } = useOnboarding();
  const [email, setEmail] = useState(state.email ?? "");
  const [memberType, setMemberType] = useState<MemberType>(state.memberType ?? "händler");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    update({ email, memberType });
    setSent(true);
  };

  const onContinue = () => {
    update({ signedIn: true });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-10 py-8 flex items-center justify-between">
        <div className="flex items-end gap-2">
          <span className="font-display text-2xl font-bold">unitex</span>
          <span className="text-[11px] leading-tight text-secondary hidden sm:block">
            Vertrauen. Kompetenz. Innovation.
          </span>
        </div>
        <a href="mailto:onboarding@unitex.de" className="text-sm text-secondary hover:text-foreground">
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
            Willkommen im
            <br />
            <span className="text-primary">unitex Onboarding Portal.</span>
          </h1>
          <p className="text-base text-secondary max-w-md">
            Schließen Sie Ihre Mitgliedschaft beim Textil-Verband in wenigen Schritten ab –
            flexibel, sicher und ohne Papierkram.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              "Frei navigierbar – kein starrer Wizard",
              "Auto-Save auf jedem Feld",
              "Digital signieren via PandaDoc",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-secondary">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full max-w-md justify-self-end">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
            {!sent ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-semibold">Jetzt starten</h2>
                  <p className="mt-1 text-sm text-secondary">
                    Geben Sie Ihre geschäftliche E-Mail-Adresse ein. Wir senden Ihnen einen
                    sicheren Anmelde-Link.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wide">
                    Ich bin
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-popover">
                    {(["händler", "lieferant"] as MemberType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMemberType(t)}
                        className={[
                          "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                          memberType === t
                            ? "bg-primary text-primary-foreground"
                            : "text-secondary hover:text-foreground",
                        ].join(" ")}
                      >
                        {t === "händler" ? "Händler" : "Lieferant"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-medium text-secondary uppercase tracking-wide">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@firma.de"
                      className="w-full rounded-md border border-border bg-popover pl-9 pr-3 py-2.5 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  Magic Link anfordern
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                <p className="text-[11px] text-muted text-center">
                  Mit dem Fortfahren akzeptieren Sie unsere Datenschutzbestimmungen.
                </p>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft">
                  <Mail className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">Prüfen Sie Ihr Postfach</h2>
                  <p className="mt-2 text-sm text-secondary">
                    Wir haben einen Anmelde-Link an
                    <br />
                    <span className="text-foreground font-medium">{email}</span> gesendet.
                  </p>
                </div>
                <button
                  onClick={onContinue}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Demo: Direkt fortfahren
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSent(false)}
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
