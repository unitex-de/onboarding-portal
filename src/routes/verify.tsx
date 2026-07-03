import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useOnboarding, fetchCustomerByEmail, markDashboardSeen } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { Loader2, MailX, ShieldCheck } from "lucide-react";

const searchSchema = z.object({
  token_hash: z.string().optional(),
  token: z.string().optional(),
  type: z.string().optional(),
});

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Anmeldung bestätigen | unitex Onboarding" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: searchSchema,
  component: VerifyPage,
});

async function applyCustomerSession(
  email: string,
  update: ReturnType<typeof useOnboarding>["update"],
  setVerifiedEmail: (e: string) => void,
  navigate: ReturnType<typeof useNavigate>
) {
  const customer = await fetchCustomerByEmail(email);

  update({
    email,
    signedIn: true,
    role: "kunde",
    ...(customer ? {
      memberType: customer.memberType,
      legalForm: customer.legalForm,
      legalFormLockedByAdmin: true,
      userName: customer.loggedInName || `${customer.firstName} ${customer.lastName}`.trim(),
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
    // Nicht der erste Login → direkt zum Dashboard, kein Erfolgs-/Welcome-Screen, keine Tour
    navigate({ to: "/dashboard" });
  } else {
    if (customer) await markDashboardSeen(customer.id);
    setVerifiedEmail(email);
  }
}

function VerifyPage() {
  const { token_hash, token, type } = Route.useSearch();
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    // Supabase kann Token als Fragment (#access_token=...) oder Query (?token_hash=...) senden
    const hash = token_hash ?? token;

    // Fragment aus URL lesen falls Query leer
    if (!hash && typeof window !== "undefined" && window.location.hash) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const errorCode = params.get("error_code");

      if (errorCode) {
        setError("Dieser Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Magic Link an.");
        return;
      }

      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error: authError }) => {
            if (authError || !data.session) {
              setError("Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
              return;
            }
            const email = data.session.user.email ?? "";
            applyCustomerSession(email, update, setVerifiedEmail, navigate);
          });
        return;
      }
    }

    if (!hash || !type) {
      setError("Ungültiger Link – Token oder Typ fehlt. Bitte fordern Sie einen neuen Magic Link an.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: hash, type: type as EmailOtpType })
      .then(({ data, error: authError }) => {
        if (authError || !data.session) {
          setError(
            authError?.message?.includes("expired") || authError?.message?.includes("invalid")
              ? "Dieser Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Magic Link an."
              : (authError?.message ?? "Verifizierung fehlgeschlagen.")
          );
          return;
        }
        const email = data.session.user.email ?? "";
        applyCustomerSession(email, update, setVerifiedEmail, navigate);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <div className="mb-10">
        <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center">
          <UnitexLogo className="h-4 w-[60px] text-slate-900" />
        </div>
      </div>

      {verifiedEmail ? (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Erfolgreich angemeldet</h1>
            <p className="mt-2 text-sm text-secondary leading-relaxed">
              Speichern Sie diesen Link als Lesezeichen, um künftig direkt hierher zurückzukehren:
            </p>
            <a
              href={`https://onboarding.unitex.de/?email=${encodeURIComponent(verifiedEmail)}`}
              className="mt-2 block text-xs text-primary underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {`onboarding.unitex.de/?email=${encodeURIComponent(verifiedEmail)}`}
            </a>
          </div>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Weiter zum Dashboard
          </button>
        </div>
      ) : error ? (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
            <MailX className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Link ungültig</h1>
            <p className="mt-2 text-sm text-secondary leading-relaxed">{error}</p>
          </div>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Neuen Magic Link anfordern
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              Anmeldung wird bestätigt…
            </h1>
            <p className="mt-2 text-sm text-secondary">
              Bitte warten Sie einen Moment. Sie werden gleich weitergeleitet.
            </p>
          </div>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}