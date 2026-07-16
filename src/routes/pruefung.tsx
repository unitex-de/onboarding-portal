import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, XCircle, Building2, Mail, Calendar } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/pruefung")({
  head: () => ({ meta: [{ title: "Prüfung | unitex Onboarding" }] }),
  component: PruefungPage,
});

function PruefungPage() {
  const navigate = useNavigate();
  const { state, reviewCustomer } = useOnboarding();

  const [mode, setMode] = useState<"view" | "reject">("view");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!state.loading && (!state.signedIn || state.role !== "admin")) {
    navigate({ to: "/intern" });
    return <div className="min-h-screen bg-background" />;
  }

  const acc = state.customerAccounts.find((a) => a.id === state.activeCustomerId);

  const submittedDate = acc?.submittedAt
    ? new Date(acc.submittedAt).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const handleApprove = async () => {
    if (!acc) return;
    setSaving(true);
    try {
      await reviewCustomer(acc.id, "Freigegeben");
      navigate({ to: "/admin" });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!acc || !note.trim()) return;
    setSaving(true);
    try {
      await reviewCustomer(acc.id, "Nachbesserung nötig", note.trim());
      navigate({ to: "/admin" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Prüfung" subtitle={acc ? acc.companyName : undefined}>
      <div className="max-w-2xl mx-auto py-8">
        {!acc ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-secondary text-sm">
              Kein Account ausgewählt. Über "Prüfen" auf der ZR-Accounts-Liste hierher gelangen.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-popover border border-border">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary">
                  {acc.memberType === "lieferant" ? "Lieferant" : "Händler"}
                </p>
                <h1 className="mt-0.5 font-display text-xl font-semibold">{acc.companyName}</h1>
                <p className="text-sm text-secondary mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {acc.firstName} {acc.lastName} · {acc.email}
                </p>
                {submittedDate && (
                  <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Eingereicht am {submittedDate}
                  </p>
                )}
              </div>
            </div>

            {acc.status !== "Zur Prüfung eingereicht" ? (
              <div className="mt-6 rounded-md border border-border bg-popover px-4 py-3 text-sm text-secondary">
                Aktueller Status: <b>{acc.status}</b>. Es liegt gerade nichts zur Prüfung vor.
              </div>
            ) : mode === "view" ? (
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("reject")}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Nachbesserung nötig
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving ? "Wird gespeichert…" : "Freigeben"}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <label className="text-xs font-medium text-secondary">
                  Was muss der Kunde korrigieren? (Pflichtfeld, wird dem Kunden angezeigt)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="z. B. Bitte Handelsregisterauszug erneut hochladen, aktuelle Version fehlt."
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    disabled={saving}
                    className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={saving || !note.trim()}
                    className="flex-1 rounded-md bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Wird gespeichert…" : "Zurückweisen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
