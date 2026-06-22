/**
 * CollaboratorInvite – Mitbearbeiter einladen
 *
 * Ansatz: "Copy Link" – der Benutzer erhält einen personalisierten Link,
 * der weitergegeben werden kann (z.B. an Buchhalter / Steuerberater).
 * Kein separater Backend-User nötig – der Link enthält das Session-Token
 * aus dem State, sodass der Eingeladene denselben Zugriff wie der Kunde hat.
 *
 * Backend-Hinweis für echte Implementierung:
 * - Option A (einfach): Link enthält das bestehende magic Token → gleicher Zugang,
 *   kein separater Account nötig.
 * - Option B (sicher): Neuen collaborator_token in Supabase anlegen,
 *   per Zapier-Webhook E-Mail versenden, Token mit read-only oder
 *   section-spezifischen Rechten verknüpfen.
 * Für den Demo-Prototyp wird Option A umgesetzt (Copy Link).
 */
import { useState } from "react";
import { X, Copy, Check, Users, Link as LinkIcon, Info } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";

export function CollaboratorInvite({ onClose }: { onClose: () => void }) {
  const { state } = useOnboarding();
  const [copied, setCopied] = useState(false);

  // Build shareable link using the current magic token if available
  const activeAccount = state.customerAccounts.find((a) => a.id === state.activeCustomerId);
  const token = activeAccount?.magicToken ?? "demo-token";
  const email = state.email ?? "";
  const shareLink = `${window.location.origin}/verify?token=${token}&email=${encodeURIComponent(email)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
          <p className="text-sm text-secondary leading-relaxed">
            Teilen Sie diesen Link mit Personen, die Ihnen beim Ausfüllen des Onboarding-Formulars helfen sollen.
            Der Link gewährt Zugriff auf Ihr Onboarding-Konto.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-secondary">Ihr Einladungslink</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-popover p-3">
              <LinkIcon className="h-4 w-4 text-muted shrink-0" />
              <span className="flex-1 text-xs text-foreground truncate font-mono">{shareLink}</span>
              <button
                type="button"
                onClick={handleCopy}
                className={[
                  "shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                  copied
                    ? "bg-success/15 text-success border border-success/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                ].join(" ")}
              >
                {copied ? (
                  <><Check className="h-3.5 w-3.5" /> Kopiert!</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Kopieren</>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-popover/80 border border-border p-3 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-secondary leading-relaxed">
              <span className="font-medium text-foreground">Sicherheitshinweis:</span>{" "}
              Teilen Sie diesen Link nur mit Personen, denen Sie vertrauen. Er gewährt Lesezugriff auf Ihre Onboarding-Daten. Der Link ist an Ihre E-Mail-Adresse gebunden.
            </p>
          </div>
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
