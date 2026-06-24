import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useOnboarding } from "@/lib/onboarding-state";
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

function VerifyPage() {
  const { token_hash, token, type } = Route.useSearch();
  const navigate = useNavigate();
  const { state, update } = useOnboarding();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = token_hash ?? token;

    if (!hash || !type) {
      setError("Ungültiger Link – Token oder Typ fehlt. Bitte fordern Sie einen neuen Magic Link an.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: hash, type: type as EmailOtpType })
      .then(({ data, error: authError }) => {
        if (authError || !data.session) {
          const msg =
            authError?.message?.includes("expired") || authError?.message?.includes("invalid")
              ? "Dieser Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Magic Link an."
              : (authError?.message ?? "Verifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
          setError(msg);
          return;
        }

        const user = data.session.user;
        const email = user.email ?? "";

        const matchingAccount = state.customerAccounts.find(
          (a) => a.email.toLowerCase() === email.toLowerCase(),
        );

        update({
          email,
          signedIn: true,
          role: "kunde",
          tourSeen: false,
          ...(matchingAccount
            ? {
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
              }
            : {}),
        });

        navigate({ to: "/dashboard" });
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4">
      <div className="mb-10">
        <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center">
          <UnitexLogo className="h-4 w-[60px] text-slate-900" />
        </div>
      </div>

      {error ? (
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
