/**
 * CollaboratorInvite – Mitbearbeiter einladen & verwalten
 *
 * Zeigt ein Formular zum Einladen neuer Mitbearbeiter sowie eine Liste
 * der bereits eingetragenen Mitbearbeiter mit Entfernen-Option.
 */
import { useState, useEffect, useCallback } from "react";
import { X, Users, UserPlus, Info, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useOnboarding, type Collaborator } from "@/lib/onboarding-state";

export function CollaboratorInvite({ onClose }: { onClose: () => void }) {
  const { inviteCollaborator, fetchCollaborators, removeCollaborator } = useOnboarding();

  // Invite-Formular
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Liste
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    const list = await fetchCollaborators();
    setCollaborators(list);
    setListLoading(false);
  }, [fetchCollaborators]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const isValidEmail = email.includes("@") && email.includes(".");
  const isValid = isValidEmail && firstName.trim() !== "" && lastName.trim() !== "";

  const handleInvite = async () => {
    if (!isValid) return;
    setStatus("loading");
    setErrorMsg(null);

    const result = await inviteCollaborator(email.trim(), firstName.trim(), lastName.trim());

    if (result.success) {
      setStatus("success");
      setFirstName("");
      setLastName("");
      setEmail("");
      await loadList();
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Unbekannter Fehler beim Einladen.");
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await removeCollaborator(id);
    await loadList();
    setRemovingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">Mitbearbeiter</h3>
              <p className="text-xs text-secondary mt-0.5">Buchhalter, Steuerberater oder Kollegen</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body – scrollbar bei vielen Einträgen */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Bestehende Mitbearbeiter */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-secondary">
              Eingetragene Mitbearbeiter
            </h4>
            {listLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Mitbearbeiter eingeladen.</p>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-popover p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-secondary truncate">{c.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(c.id)}
                      disabled={removingId === c.id}
                      title="Mitbearbeiter entfernen"
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-destructive hover:bg-destructive-soft transition-colors disabled:opacity-50"
                    >
                      {removingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border pt-6 space-y-5">
            {status === "success" ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">
                  Einladung wurde versendet. Die Person erhält eine E-Mail mit einem Anmeldecode.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-secondary leading-relaxed">
                  Laden Sie eine weitere Person per E-Mail ein. Sie erhält einen eigenen
                  Anmeldecode und kann danach eigenständig auf Ihr Onboarding-Konto zugreifen.
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
                    Mitbearbeiter erhalten vollen Zugriff auf Ihre Onboarding-Daten – wie Sie
                    selbst. Laden Sie nur Personen ein, denen Sie vertrauen.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0">
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