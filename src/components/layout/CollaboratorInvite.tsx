/**
 * CollaboratorInvite – Mitbearbeiter einladen
 *
 * Der Kunde (oder ein Admin im Namen eines Kunden) trägt Name und E-Mail-Adresse
 * eines Mitbearbeiters ein. Dieser bekommt eine eigene OTP-Einladungsmail
 * und kann sich danach eigenständig mit voller Berechtigung auf denselben
 * Kundendatensatz anmelden (siehe collaborators-Tabelle + RLS-Policies).
 */
import { useState } from "react";
import { X, Users, UserPlus, Info, CheckCircle2, Loader2 } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";

export function CollaboratorInvite({ onClose }: { onClose: () => void }) {
  const { inviteCollaborator } = useOnboarding();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValidEmail = email.includes("@") && email.includes(".");
  const isValid = isValidEmail && firstName.trim() !== "" && lastName.trim() !== "";

  const handleInvite = async () => {
    if (!isValid) return;
    setStatus("loading");
    setErrorMsg(null);

    const result = await inviteCollaborator(email.trim(), firstName.trim(), lastName.trim());

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Unbekannter Fehler beim Einladen.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">Mitbearbeiter einladen</h3>
              <p className="text-xs text-secondary mt-0.5">Buchhalter, Steuerberater oder Kollegen</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {status === "success" ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground leading-relaxed">
                Einladung an <span className="font-medium">{firstName} {lastName}</span> ({email}) wurde versendet.
                Die Person erhält eine E-Mail mit einem Anmeldecode und hat danach denselben
                Zugriff wie Sie.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-secondary leading-relaxed">
                Laden Sie eine Person per E-Mail ein. Sie erhält einen eigenen Anmeldecode
                und kann danach eigenständig auf Ihr Onboarding-Konto zugreifen.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Max"
                    className="w-full rounded-lg border border-border bg-popover p-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-secondary">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="Mustermann"
                    className="w-full rounded-lg border border-border bg-popover p-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-secondary">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="name@beispiel.de"
                  className="w-full rounded-lg border border-border bg-popover p-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {status === "error" && errorMsg && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}

              <button
                type="button"
                onClick={handleInvite}
                disabled={!isValid || status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Einladen</>
                )}
              </button>

              <div className="rounded-lg bg-popover/80 border border-border p-3 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-secondary leading-relaxed">
                  <span className="font-medium text-foreground">Sicherheitshinweis:</span>{" "}
                  Der Mitbearbeiter erhält vollen Zugriff auf Ihre Onboarding-Daten – wie Sie
                  selbst. Laden Sie nur Personen ein, denen Sie vertrauen.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground hover:border-primary/50 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}