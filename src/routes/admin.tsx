import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Users, Plus, ArrowRight, Building2, UserCheck, Mail, Calendar,
  ExternalLink, X, Lock, Search, Filter, RefreshCw, Copy, CheckCircle2,
  Clock, FileEdit, ChevronDown
} from "lucide-react";
import {
  useOnboarding, type MemberType, type LegalForm, type CustomerAccount,
  type CustomerStatus, buildMagicLink
} from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { supabase } from "@/lib/supabase";

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

const STATUS_LABELS: Record<CustomerStatus, { label: string; color: string }> = {
  Entwurf: { label: "Entwurf", color: "bg-secondary/20 text-secondary" },
  "Link gesendet": { label: "Link gesendet", color: "bg-primary/15 text-primary" },
  Signiert: { label: "Signiert", color: "bg-emerald-500/15 text-emerald-400" },
};

function AdminPage() {
  const navigate = useNavigate();
  const { state, update, addCustomerAccount, sendMagicLink } = useOnboarding();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | MemberType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | CustomerStatus>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Create form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("händler");
  const [legalForm, setLegalForm] = useState<LegalForm>("GmbH");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("DE");
  const [zrStartDate, setZrStartDate] = useState("");

  // Filtered accounts
  const filtered = useMemo(() => {
    return state.customerAccounts.filter((acc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        acc.companyName.toLowerCase().includes(q) ||
        acc.firstName.toLowerCase().includes(q) ||
        acc.lastName.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q);

      const matchesType = filterType === "all" || acc.memberType === filterType;
      const matchesStatus = filterStatus === "all" || acc.status === filterStatus;

      const created = new Date(acc.createdAt);
      const matchesFrom = !filterDateFrom || created >= new Date(filterDateFrom);
      const matchesTo = !filterDateTo || created <= new Date(filterDateTo + "T23:59:59");

      return matchesSearch && matchesType && matchesStatus && matchesFrom && matchesTo;
    });
  }, [state.customerAccounts, searchQuery, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const handleCreate = async () => {
    if (!firstName || !lastName || !email || !companyName) return;
    try {
      const acc = await addCustomerAccount({
        firstName, lastName, email, companyName, memberType, legalForm,
        postalCode, country, zrStartDate,
        dashboardSeen: false
      });
      setShowCreate(false);
      setFirstName(""); setLastName(""); setEmail(""); setCompanyName("");
      setMemberType("händler"); setLegalForm("GmbH"); setPostalCode(""); setCountry("DE");
      setZrStartDate("");
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
        postalCode: acc.postalCode,
        country: acc.country,
        zrStartDate: acc.zrStartDate,
        savedFormData: {},
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("Fehler beim Anlegen:", err);
      alert("Fehler beim Anlegen des Kunden. Bitte prüfe die Konsole.");
    }
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
      uploadedDocs: acc.uploadedDocs,
      completedSections: acc.completedSections,
      postalCode: acc.postalCode,
      country: acc.country,
      zrStartDate: acc.zrStartDate,
      savedFormData: acc.savedFormData ?? {},
    });
    navigate({ to: "/dashboard" });
  };

  const handleSendLink = async (acc: CustomerAccount) => {
    // Supabase sendet die OTP-Mail direkt an den Kunden
    const { error } = await supabase.auth.signInWithOtp({
      email: acc.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "https://onboarding.unitex.de/verify",
      },
    });

    if (error) {
      alert(`Fehler beim Senden: ${error.message}`);
      return;
    }

    // In DB als gesendet markieren
    await sendMagicLink(acc.id);
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleCopyLink = (acc: CustomerAccount) => {
    const link = buildMagicLink(acc.magicToken, acc.email);
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedId(acc.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
            🛡 Admin-Bereich
          </span>
          <button
            onClick={() => { update({ signedIn: false, role: "kunde" }); navigate({ to: "/" }); }}
            className="text-xs text-secondary hover:text-foreground transition-colors"
          >
            Abmelden
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-10">
        {/* Title row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">ZR-Accounts</h1>
            <p className="mt-1 text-sm text-secondary">
              {state.customerAccounts.length === 0
                ? "Noch keine Accounts angelegt."
                : `${state.customerAccounts.length} Account${state.customerAccounts.length !== 1 ? "s" : ""} gesamt · ${filtered.length} angezeigt`}
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

        {/* Filter bar */}
        {state.customerAccounts.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  className="w-full rounded-md border border-border bg-popover pl-8 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Name, Firma, E-Mail…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            {/* Type filter */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted">Typ</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">Alle Typen</option>
                <option value="händler">Händler</option>
                <option value="lieferant">Lieferant</option>
              </select>
            </div>
            {/* Status filter */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="all">Alle Status</option>
                <option value="Entwurf">Entwurf</option>
                <option value="Link gesendet">Link gesendet</option>
                <option value="Signiert">Signiert</option>
              </select>
            </div>
            {/* Date from */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted">Von Datum</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {/* Date to */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-muted">Bis Datum</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {/* Reset */}
            {(searchQuery || filterType !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => {
                  setSearchQuery(""); setFilterType("all"); setFilterStatus("all");
                  setFilterDateFrom(""); setFilterDateTo("");
                }}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-secondary hover:text-foreground hover:border-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Customer list */}
        {state.customerAccounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
            <Users className="mx-auto h-10 w-10 text-muted mb-4" />
            <p className="text-secondary text-sm">Noch keine Kunden angelegt. Legen Sie den ersten Account an.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted mb-3" />
            <p className="text-secondary text-sm">Keine Accounts gefunden. Filter anpassen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((acc) => (
              <CustomerCard
                key={acc.id}
                acc={acc}
                isCopied={copiedId === acc.id}
                onView={() => handleViewCustomer(acc)}
                onSendLink={() => handleSendLink(acc)}
                onCopyLink={() => handleCopyLink(acc)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card overflow-hidden max-h-[90vh] overflow-y-auto">
            <header className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
              <h2 className="font-display text-lg font-semibold">Neuen ZR-Account anlegen</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">Vorname *</label>
                  <input
                    className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">Nachname *</label>
                  <input
                    className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mustermann"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">
                  E-Mail * <span className="text-primary">(Sicherheitsanker – Pflichtfeld)</span>
                </label>
                <input
                  type="email"
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Unternehmensname *</label>
                <input
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Muster Textil GmbH"
                />
              </div>
              {/* PLZ & Land */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">PLZ</label>
                  <input
                    className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="89073"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-secondary uppercase tracking-wide">Land</label>
                  <select
                    value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-md border border-border bg-popover px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                  </select>
                </div>
              </div>
              {/* Händler / Lieferant */}
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Klassifizierung</label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-popover">
                  {(["händler", "lieferant"] as MemberType[]).map((t) => (
                    <button
                      key={t} type="button" onClick={() => setMemberType(t)}
                      className={[
                        "rounded-md py-2 text-sm font-medium transition-colors",
                        memberType === t ? "bg-primary text-primary-foreground" : "text-secondary hover:text-foreground",
                      ].join(" ")}
                    >
                      {t === "händler" ? "Händler" : "Lieferant"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Rechtsform */}
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Rechtsform (wird gesperrt)
                </label>
                <select
                  value={legalForm} onChange={(e) => setLegalForm(e.target.value as LegalForm)}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
                >
                  {LEGAL_FORMS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted">Nach Anlage nicht mehr änderbar.</p>
              </div>

              {/* ZR-Startdatum */}
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">ZR-Startdatum *</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  value={zrStartDate}
                  onChange={(e) => setZrStartDate(e.target.value)}
                />
              </div>

              {/* Info: Admin kann nicht signieren */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-400">
                <strong>Hinweis:</strong> Als Admin können Sie Felder vorausfüllen und Dokumente hochladen, aber <strong>nicht selbst signieren</strong>. Der Kunde erhält dafür den Magic Link.
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-secondary hover:text-foreground transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button" onClick={handleCreate}
                  disabled={!firstName || !lastName || !email || !companyName}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FileEdit className="h-4 w-4" />
                  Anlegen & Entwurf öffnen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomerCard({
  acc,
  isCopied,
  onView,
  onSendLink,
  onCopyLink,
}: {
  acc: CustomerAccount;
  isCopied: boolean;
  onView: () => void;
  onSendLink: () => void;
  onCopyLink: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const status = STATUS_LABELS[acc.status] ?? STATUS_LABELS["Entwurf"];
  const createdDate = new Date(acc.createdAt).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const sentDate = acc.linkSentAt
    ? new Date(acc.linkSentAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-popover border border-border">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-foreground truncate">{acc.companyName}</p>
            <span className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
              acc.memberType === "händler" ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-400",
            ].join(" ")}>
              {acc.memberType}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-secondary mt-0.5">{acc.firstName} {acc.lastName} · {acc.email}</p>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs text-muted shrink-0">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{createdDate}</span>
          {sentDate && (
            <span className="flex items-center gap-1 text-primary">
              <UserCheck className="h-3.5 w-3.5" />Link: {sentDate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Send / Resend Magic Link */}
          <button
            onClick={onSendLink}
            title={acc.magicLinkSent ? "Magic Link erneut senden (Token bleibt gleich)" : "Magic Link senden"}
            className={[
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              isCopied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : acc.magicLinkSent
                ? "border-primary/40 text-primary hover:bg-primary/10"
                : "border-border text-secondary hover:border-primary hover:text-primary",
            ].join(" ")}
          >
            {isCopied ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Kopiert!</>
            ) : acc.magicLinkSent ? (
              <><RefreshCw className="h-3.5 w-3.5" /> Erneut senden</>
            ) : (
              <><Mail className="h-3.5 w-3.5" /> Magic Link senden</>
            )}
          </button>
          {/* Copy link button */}
          {acc.magicToken && (
            <button
              onClick={onCopyLink}
              title="Magic Link kopieren"
              className="rounded-md border border-border p-1.5 text-muted hover:border-primary hover:text-primary transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Open */}
          <button
            onClick={onView}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Öffnen <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Magic Link Preview (collapsed) */}
      {acc.magicToken && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] text-muted font-mono truncate">
            🔗 {buildMagicLink(acc.magicToken, acc.email)}
          </p>
        </div>
      )}
    </div>
  );
}
