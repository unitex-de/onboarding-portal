import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Mail, Lock, ShieldCheck } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { supabase } from "@/lib/supabase";
import { UnitexLogo } from "@/components/ui/UnitexLogo";

export const Route = createFileRoute("/intern")({
  head: () => ({
    meta: [
      { title: "Admin-Anmeldung | unitex Onboarding" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InternLogin,
});

function InternLogin() {
  const navigate = useNavigate();
  const { state, update, refreshCustomers } = useOnboarding();

  // Bereits eingeloggte Admins direkt weiterleiten
  useEffect(() => {
    if (!state.loading && state.signedIn && state.role === "admin") {
      navigate({ to: "/admin" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmailError, setAdminEmailError] = useState("");
  const [adminPassError, setAdminPassError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validateAdminEmail = (val: string) => {
    if (!val.includes("@")) return "Bitte eine gültige E-Mail eingeben.";
    if (!val.toLowerCase().endsWith("@unitex.de")) return "Nur @unitex.de E-Mail-Adressen sind erlaubt.";
    return "";
  };

  const onAdminSubmit = async () => {
    const emailErr = validateAdminEmail(adminEmail);
    if (emailErr) { setAdminEmailError(emailErr); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error) {
      setAdminPassError(true);
      setSubmitting(false);
      return;
    }

    await refreshCustomers();

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
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Interner Bereich
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-10 pb-16">
        <section className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
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
                    autoFocus
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
                disabled={!adminEmail || !adminPassword || submitting}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Wird geprüft…" : "Anmelden"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}