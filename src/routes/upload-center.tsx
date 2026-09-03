import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { CloudUpload, FileCheck2, FileText, MoreVertical, Trash2, RefreshCcw, Download, Shield, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, getDownloadUrl, type LegalForm } from "@/lib/onboarding-state";
import { REQUIRED_DOCS, REQUIRED_DOCS_LIEFERANT, ADMIN_ONLY_DOCS, formatBytes } from "@/lib/required-docs";
import { ConfettiPopup } from "@/components/ui/ConfettiPopup";
import { FieldReviewProvider, FieldFlag } from "@/components/forms/FormSection";

const LEGAL_FORMS: { value: LegalForm; label: string }[] = [
  { value: "eK", label: "e.K." },
  { value: "GbR", label: "GbR" },
  { value: "GmbH", label: "GmbH" },
  { value: "GmbHCoKG", label: "GmbH & Co. KG" },
  { value: "KG", label: "KG" },
  { value: "OHG", label: "OHG" },
];

export const Route = createFileRoute("/upload-center")({
  head: () => ({ meta: [{ title: "Upload-Center | unitex Onboarding" }] }),
  component: UploadCenterPage,
});

function UploadCenterPage() {
  const navigate = useNavigate();
  const { state, update, uploadDoc, removeDoc, setFieldCorrection } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";
  const isLieferant = state.memberType === "lieferant";
  const isAdmin = state.role === "admin";
  const docs = isLieferant ? REQUIRED_DOCS_LIEFERANT : REQUIRED_DOCS[legalForm];
  // Prüfmodus (Option B) – gleiches Prinzip wie in unternehmen.tsx
  const canEditReview = isAdmin && !!state.activeCustomerId;
  const reviewCustomerId = isAdmin ? state.activeCustomerId ?? "" : state.customerId ?? "";
  const initialCorrections = isAdmin
    ? (state.customerAccounts.find((a) => a.id === state.activeCustomerId)?.fieldCorrections ?? {})
    : (state.fieldCorrections ?? {});

  const requiredDocs = docs.filter((d) => d.required);
  const allRequiredDone = requiredDocs.every((d) => state.uploadedDocs[d.id]);
  const completed = docs.filter((d) => state.uploadedDocs[d.id]).length;

  // ── Mehrere Uploads pro Dokument (z.B. mehrere Ausweiskopien) ──────────────
  // Zusatz-Dateien liegen unter Keys wie "ausweiskopie_gf__2", "ausweiskopie_gf__3".
  // extraCount hält, wie viele Zusatz-Slots diese Session manuell hinzugefügt
  // wurden; kombiniert mit bereits vorhandenen Uploads aus der DB.
  const [extraCount, setExtraCount] = useState<Record<string, number>>({});
  const MAX_EXTRA_SLOTS = 5;
  const getExtraSlotCount = (docId: string): number => {
    let maxIndex = 1;
    const prefix = `${docId}__`;
    for (const key of Object.keys(state.uploadedDocs)) {
      if (key.startsWith(prefix)) {
        const n = Number(key.slice(prefix.length));
        if (Number.isFinite(n)) maxIndex = Math.max(maxIndex, n);
      }
    }
    return Math.max(maxIndex - 1, extraCount[docId] ?? 0);
  };

  const [showConfetti, setShowConfetti] = useState(false);
  const prevAllDone = useRef(allRequiredDone);

  useEffect(() => {
    // BUG 7: no confetti for admins
    if (!prevAllDone.current && allRequiredDone && !isAdmin) {
      setShowConfetti(true);
    }
    prevAllDone.current = allRequiredDone;
  }, [allRequiredDone, isAdmin]);

  // First pending doc becomes the active drop target.
  const firstPending = useMemo(() => docs.find((d) => !state.uploadedDocs[d.id])?.id, [docs, state.uploadedDocs]);
  const [activeId, setActiveId] = useState<string | null>(firstPending ?? null);
  const effectiveActive = activeId && docs.some((d) => d.id === activeId) ? activeId : firstPending ?? null;

  const isLieferantView = isLieferant;

  return (
    <AppShell
      title="Dokumenten-Upload"
      subtitle={`${state.companyName} · ${isLieferantView ? "Pflichtdokument für Lieferanten" : "Pflichtdokumente für Ihren ZR-Beitritt"}`}
    >
      {showConfetti && (
        <ConfettiPopup
          title="Zweite Etappe geschafft!"
          message="Alle Pflichtdokumente wurden erfolgreich hochgeladen. Jetzt geht es zum letzten Schritt."
          buttonLabel="Zum Onboarding-Abschluss"
          onClose={() => {
            setShowConfetti(false);
            navigate({ to: "/signaturen" });
          }}
        />
      )}

      {/* DSGVO Hinweis */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-secondary leading-relaxed">
          <span className="font-semibold text-foreground">Datenschutz & DSGVO:</span>{" "}
          Alle hochgeladenen Dokumente werden DSGVO-konform verarbeitet und ausschließlich zur Prüfung Ihrer Mitgliedschaft bei unitex verwendet.
          Unbefugte Dritte haben keinen Zugriff. Mehr Informationen in unserer{" "}
          <a href="https://unitex.de/datenschutz/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Datenschutzerklärung
          </a>.
        </div>
      </div>

      {/* Header strip */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{isAdmin ? "Kunden Dokumente" : "Ihre Dokumente"}</h3>
          <p className="text-sm text-secondary">
            {completed} von {docs.length} hochgeladen · Laden Sie alle erforderlichen Dokumente hoch.
          </p>
        </div>
        {!isLieferantView && (
          <div className="flex items-center gap-3 text-sm text-secondary">
            Rechtsform
            {state.legalFormLockedByAdmin ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-popover/50 px-3 py-1.5 text-sm text-foreground">
                <span>{LEGAL_FORMS.find((f) => f.value === legalForm)?.label ?? legalForm}</span>
                <span className="text-[10px] text-muted ml-1">gesperrt</span>
              </div>
            ) : (
              <select
                value={legalForm}
                onChange={(e) => update({ legalForm: e.target.value as LegalForm })}
                className="rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {LEGAL_FORMS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <FieldReviewProvider
        key={reviewCustomerId || "self"}
        canEdit={canEditReview}
        customerId={reviewCustomerId}
        initialCorrections={initialCorrections}
        onPersist={setFieldCorrection}
      >
      <div className="space-y-3">
        {docs.map((doc) => {
          const uploaded = state.uploadedDocs[doc.id];
          const isActive = effectiveActive === doc.id;
          const extraSlots = doc.multi ? getExtraSlotCount(doc.id) : 0;
          return (
            <div key={doc.id} className="space-y-2">
              <DocumentRow
                docId={doc.id}
                label={doc.label}
                hint={doc.hint}
                required={doc.required}
                uploaded={uploaded}
                isActive={isActive && !uploaded}
                onSelect={() => setActiveId(doc.id)}
                onRemove={() => removeDoc(doc.id)}
                onFileNow={(f) => uploadDoc(doc.id, f)}
              />
              {isActive && !uploaded && (
                <UploadDropZone onFile={(f) => uploadDoc(doc.id, f)} />
              )}

              {doc.multi && Array.from({ length: extraSlots }, (_, i) => i + 2).map((n) => {
                const extraId = `${doc.id}__${n}`;
                const extraUploaded = state.uploadedDocs[extraId];
                return (
                  <div key={extraId} className="ml-6 pl-4 border-l-2 border-border/60 space-y-2">
                    <DocumentRow
                      docId={extraId}
                      label={`${doc.label} – weitere Kopie ${n - 1}`}
                      required={false}
                      uploaded={extraUploaded}
                      isActive={false}
                      onSelect={() => {}}
                      onRemove={() => removeDoc(extraId)}
                      onFileNow={(f) => uploadDoc(extraId, f)}
                    />
                    {!extraUploaded && <UploadDropZone onFile={(f) => uploadDoc(extraId, f)} />}
                  </div>
                );
              })}

              {doc.multi && extraSlots < MAX_EXTRA_SLOTS && (
                <button
                  type="button"
                  onClick={() => setExtraCount((prev) => ({ ...prev, [doc.id]: extraSlots + 1 }))}
                  className="ml-6 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Weitere Kopie hinzufügen
                </button>
              )}
            </div>
          );
        })}
      </div>
      </FieldReviewProvider>
      {!isAdmin && allRequiredDone && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate({ to: "/signaturen" })}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 sm:py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            Weiter zum Onboarding-Abschluss
          </button>
        </div>
      )}
      {isAdmin && (
        <div className="mt-10">
          <div className="mb-3">
            <h3 className="font-display text-lg font-semibold">Weitere Dokumente</h3>
            <p className="text-sm text-secondary">Nur für Admins sichtbar, der Kunde sieht diese Sektion nicht.</p>
          </div>
          <div className="space-y-3">
            {ADMIN_ONLY_DOCS.map((doc) => {
              const uploaded = state.uploadedDocs[doc.id];
              return (
                <div key={doc.id}>
                  <DocumentRow
                    docId={doc.id}
                    label={doc.label}
                    hint={doc.hint}
                    required={false}
                    uploaded={uploaded}
                    isActive={false}
                    onSelect={() => {}}
                    onRemove={() => removeDoc(doc.id)}
                    onFileNow={(f) => uploadDoc(doc.id, f)}
                  />
                  {!uploaded && <UploadDropZone onFile={(f) => uploadDoc(doc.id, f)} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function DocumentRow({
  docId,
  label,
  hint,
  required,
  uploaded,
  isActive,
  onSelect,
  onRemove,
  onFileNow,
}: {
  docId: string;
  label: string;
  hint?: string;
  required: boolean;
  uploaded?: { fileName: string; size: number; uploadedAt: string; storagePath: string };
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onFileNow?: (file: File) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className={[
        "w-full rounded-xl border p-4 flex items-center gap-4 text-left transition-all cursor-pointer",
        isActive
          ? "border-upload bg-upload-active"
          : uploaded
          ? "border-success/50 bg-card"
          : "border-border bg-card hover:border-primary/40",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          uploaded
            ? "bg-success-soft text-success"
            : isActive
            ? "bg-primary/15 text-primary"
            : "bg-popover text-secondary",
        ].join(" ")}
      >
        {uploaded ? <FileCheck2 className="h-5 w-5" /> : isActive ? <CloudUpload className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{label}</p>
        {hint && !uploaded && (
          <p className="text-xs text-secondary mt-0.5 leading-relaxed line-clamp-2">{hint}</p>
        )}
        {uploaded && (
          <p className="text-xs text-secondary truncate">
            <span className="text-foreground/80">{uploaded.fileName}</span>
            <span className="mx-1.5">·</span>
            {formatBytes(uploaded.size)}
          </p>
        )}
        {!uploaded && !hint && (
          <p className="text-xs text-secondary truncate">
            {isActive ? "Aktuell · jetzt hochladen" : <>Noch nicht hochgeladen{!required && " · optional"}</>}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <FieldFlag fieldId={docId} />
        {uploaded ? (
          <span className="rounded-md bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            Hochgeladen
          </span>
        ) : isActive ? (
          <span className="rounded-md border border-primary/50 px-2.5 py-1 text-xs font-medium text-primary">
            Aktuell
          </span>
        ) : (
          <span className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-secondary">
            {required ? "Ausstehend" : "Optional"}
          </span>
        )}

        {uploaded && (
          <span className="text-xs text-muted hidden md:inline">
            {new Date(uploaded.uploadedAt).toLocaleDateString("de-DE")},{" "}
            {new Date(uploaded.uploadedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
          </span>
        )}

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Aktionen"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-1.5 text-secondary hover:bg-popover hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 z-10 w-44 rounded-md border border-border bg-popover py-1 shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {uploaded ? (
                <>
                  <MenuItem icon={RefreshCcw} label="Ersetzen" onClick={() => { onRemove(); onSelect(); setMenuOpen(false); }} />
                  <MenuItem
                    icon={Download}
                    label="Herunterladen"
                    onClick={async () => {
                      setMenuOpen(false);
                      const url = await getDownloadUrl(uploaded.storagePath);
                      if (!url) {
                        alert("Die Datei konnte nicht geladen werden. Bitte versuchen Sie es erneut.");
                        return;
                      }
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  />
                  <MenuItem icon={Trash2} label="Löschen" destructive onClick={() => { onRemove(); setMenuOpen(false); }} />
                </>
              ) : (
                <MenuItem icon={CloudUpload} label="Jetzt hochladen" onClick={() => { onSelect(); setMenuOpen(false); quickInputRef.current?.click(); }} />
              )}
            </div>
          )}
        </div>
      </div>
      <input
        ref={quickInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            alert("Die Datei überschreitet die maximale Größe von 10 MB.");
            return;
          }
          onFileNow?.(file);
          e.target.value = "";
        }}
      />
      <span className="sr-only">{docId}</span>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof CloudUpload;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 px-3 py-2 text-sm",
        destructive ? "text-destructive hover:bg-destructive-soft" : "text-foreground hover:bg-background/40",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function UploadDropZone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Die Datei überschreitet die maximale Größe von 10 MB.");
      return;
    }
    onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files[0]);
      }}
      className={[
        "mt-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-primary bg-upload-active" : "border-upload bg-upload-active",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <CloudUpload className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm text-foreground">
        Datei hier ablegen oder{" "}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary underline underline-offset-4"
        >
          auswählen
        </button>
      </p>
      <p className="mt-1 text-xs text-secondary">PDF, JPG, PNG · max. 10 MB</p>
    </div>
  );
}