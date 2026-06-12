import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users, Plus, ArrowRight, Building2, UserCheck, Mail, Calendar,
  ExternalLink, X, Lock, CheckCircle2, ClipboardList, Send, FileEdit,
} from "lucide-react";
import { useOnboarding, type MemberType, type LegalForm, type CustomerAccount } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin-Übersicht | unitex Onboarding" }] }),
  component: AdminPage,
});

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: "eK", label: "e.K. (Einzelkaufmann)" },
  { value: "GbR", label: "GbR" },
  { value: "GmbH", label: "GmbH" },
  { value: "GmbHCoKG", label: "GmbH & Co. KG" },
  { value: "KG", label: "KG" },
  { value: "OHG", label: "OHG" },
];

type WizardStep = "form" | "prepare" | "confirm_link";

function AdminPage() {
  const navigate = useNavigate();
  const { state, update, addCustomerAccount } = useOnboarding();
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("form");
  const [pendingAcc, setPendingAcc] = useState<CustomerAccount | null>(null);

  // Create form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("händler");
  const [legalForm, setLegalForm] = useState<LegalForm>("GmbH");

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setCompanyName("");
    setMemberType("händler"); setLegalForm("GmbH");
    setWizardStep("form"); setPendingAcc(null);
  };

  const closeModal = () => { setShowCreate(false); resetForm(); };

  // Step 1: Create account + enter admin prep view
  const handleCreate = () => {
    if (!firstName || !lastName || !email || !companyName) return;
    const acc = addCustomerAccount({ firstName, lastName, email, companyName, memberType, legalForm });
    setPendingAcc(acc);
    // Navigate into customer as admin to pre-fill
    update({
      email: acc.email,
      memberType: acc.memberType,
      legalForm: acc.legalForm,
      legalFormLockedByAdmin: true,
      userName: `${acc.firstName} ${acc.lastName}`,
      companyName: acc.companyName,
      role: "admin",
      signedIn: true,
      activeCustomerId: acc.id,
      uploadedDocs: {},
      completedSections: {},
      submittedAt: null,
    });
    setShowCreate(false);
    navigate({ to: "/dashboard" });
  };

  // Send magic link for an existing account
  const handleSendMagicLink = (acc: CustomerAccount) => {
    if (acc.magicLinkSent) return; // Only one link per account
    update({
      customerAccounts: state.customerAccounts.map((a) =>
        a.id === acc.id ? { ...a, magicLinkSent: true } : a
      ),
    });
    alert(`Magic Link wurde an ${acc.email} gesendet.`);
  };

  const handleViewCustomer = (acc: CustomerAccount) => {
    update({
      email: acc.email,
      memberType: acc.memberType,
      legalForm: acc.legalForm,
      legalFormLockedByAdmin: true,
      userName: `${acc.firstName} ${acc.lastName}`,
      companyName: acc.companyName,
      role: "admin",
      signedIn: true,
      activeCustomerId: acc.id,
    });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-5 flex items-center justify-between">
        <div className="flex flex-row items-end gap-3">
          <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
            <UnitexLogo className="h-4 w-[60px] text-slate-900" />
          </div>
          <span className="text-[10px] leading-tight font-medium">
            VERTRAUEN.<br />KOMPETENZ.<br />INNOVATION.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-secondary">Admin-Bereich</span>
          <button
            onClick={() => { update({ signedIn: false, role: "kunde" }); navigate({ to: "/" }); }}
            className="text-xs text-secondary hover:text-foreground transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-10 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">ZR-Accounts</h1>
            <p className="mt-1 text-sm text-secondary">
              {state.customerAccounts.length === 0
                ? "Noch keine Accounts angelegt."
                : `${state.customerAccounts.length} Account${state.customerAccounts.length !== 1 ? "s" : ""} insgesamt`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neuen Account anlegen
          </button>
        </div>

        {state.customerAccounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
            <Users className="mx-auto h-10 w-10 text-muted mb-4" />
            <p className="text-secondary text-sm">Noch keine Kunden angelegt. Legen Sie den ersten Account an.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.customerAccounts.map((acc) => (
              <CustomerCard
                key={acc.id}
                acc={acc}
                onView={() => handleViewCustomer(acc)}
                onSendLink={() => handleSendMagicLink(acc)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card overflow-hidden">
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-semibold">Neuen ZR-Account anlegen</h2>
              <button onClick={closeModal} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">Vorname *</label>
                  <input className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">Nachname *</label>
                  <input className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mustermann" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">E-Mail *</label>
                <input type="email" className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firma.de" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Unternehmensname *</label>
                <input className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Muster Textil GmbH" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Klassifizierung</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-popover">
                  {(["händler", "lieferant"] as MemberType[]).map((t) => (
                    <button key={t} type="button" onClick={() => setMemberType(t)}
                      className={["rounded-md py-2 text-sm font-medium transition-colors",
                        memberType === t ? "bg-primary text-primary-foreground" : "text-secondary hover:text-foreground"].join(" ")}
                    >
                      {t === "händler" ? "Händler" : "Lieferant"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Rechtsform (wird gesperrt)
                </label>
                <select value={legalForm} onChange={(e) => setLegalForm(e.target.value as LegalForm)}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
                  {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <p className="text-[11px] text-muted">Nach Anlage nicht mehr änderbar.</p>
              </div>

              {/* Info box about the new workflow */}
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-primary leading-relaxed">
                <p className="font-semibold mb-1">Was passiert als nächstes?</p>
                <p>Nach dem Anlegen werden Sie direkt in die Admin-Ansicht des Kundenaccounts geleitet, um Daten vorzubereiten. Anschließend können Sie den Magic Link an den Kunden senden.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground transition-colors">
                  Abbrechen
                </button>
                <button type="button" onClick={handleCreate}
                  disabled={!firstName || !lastName || !email || !companyName}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <FileEdit className="h-4 w-4" />
                  Anlegen & Vorbereiten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerCard({ acc, onView, onSendLink }: { acc: CustomerAccount; onView: () => void; onSendLink: () => void }) {
  const createdDate = new Date(acc.createdAt).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-popover border border-border">
        <Building2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-foreground truncate">{acc.companyName}</p>
          <span className={["shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
            acc.memberType === "händler" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-400"].join(" ")}>
            {acc.memberType}
          </span>
          {!acc.magicLinkSent && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium bg-border/50 text-muted">
              Entwurf
            </span>
          )}
        </div>
        <p className="text-xs text-secondary mt-0.5">{acc.firstName} {acc.lastName} · {acc.email}</p>
      </div>
      <div className="hidden md:flex items-center gap-4 text-xs text-muted shrink-0">
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{createdDate}</span>
        {acc.magicLinkSent && (
          <span className="flex items-center gap-1 text-primary"><UserCheck className="h-3.5 w-3.5" />Link gesendet</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Magic link button — only if not yet sent */}
        {!acc.magicLinkSent ? (
          <button onClick={onSendLink}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
            <Send className="h-3.5 w-3.5" />Magic Link senden
          </button>
        ) : (
          <span className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />Link gesendet
          </span>
        )}
        <button onClick={onView}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors">
          Öffnen <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
