import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { CloudUpload, FileCheck2, FileText, MoreVertical, Trash2, RefreshCcw, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useOnboarding, type LegalForm, getProgressBreakdown } from "@/lib/onboarding-state";
import { REQUIRED_DOCS, REQUIRED_DOCS_LIEFERANT, formatBytes } from "@/lib/required-docs";

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
  const { state, update, uploadDoc, removeDoc } = useOnboarding();
  const legalForm: LegalForm = state.legalForm ?? "GmbH";
  const isLieferant = state.memberType === "lieferant";
  const docs = isLieferant ? REQUIRED_DOCS_LIEFERANT : REQUIRED_DOCS[legalForm];

  // Auto-navigate to signaturen when uploads hit 100% (and stammdaten also done)
  const { uploads, stammdaten } = getProgressBreakdown(state);
  const prevUploads = useRef(uploads);
  useEffect(() => {
    if (prevUploads.current < 100 && uploads === 100 && stammdaten >= 100) {
      setTimeout(() => navigate({ to: "/signaturen" }), 800);
    }
    prevUploads.current = uploads;
  }, [uploads, stammdaten]);

  // First pending doc becomes the active drop target.
  const firstPending = useMemo(() => docs.find((d) => !state.uploadedDocs[d.id])?.id, [docs, state.uploadedDocs]);
  const [activeId, setActiveId] = useState<string | null>(firstPending ?? null);
  const effectiveActive = activeId && docs.some((d) => d.id === activeId) ? activeId : firstPending ?? null;

  const completed = docs.filter((d) => state.uploadedDocs[d.id]).length;
  const isLieferantView = isLieferant;

  return (
    <AppShell
      title="Dokumenten-Upload"
      subtitle={`${state.companyName} · ${isLieferantView ? "Pflichtdokument für Lieferanten" : "Pflichtdokumente für Ihren ZR-Beitritt"}`}
    >
      {/* Header strip */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Ihre Dokumente</h3>
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

      <div className="space-y-3">
        {docs.map((doc) => {
          const uploaded = state.uploadedDocs[doc.id];
          const isActive = effectiveActive === doc.id;
          return (
            <div key={doc.id}>
              <DocumentRow
                docId={doc.id}
                label={doc.label}
                hint={doc.hint}
                description={doc.description}
                required={doc.required}
                uploaded={uploaded}
                isActive={isActive && !uploaded}
                onSelect={() => setActiveId(doc.id)}
                onRemove={() => removeDoc(doc.id)}
              />
              {isActive && !uploaded && (
                <UploadDropZone onFile={(f) => uploadDoc(doc.id, f)} />
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function DocumentRow({
  docId,
  label,
  hint,
  description,
  required,
  uploaded,
  isActive,
  onSelect,
  onRemove,
}: {
  docId: string;
  label: string;
  hint?: string;
  description?: string;
  required: boolean;
  uploaded?: { fileName: string; size: number; uploadedAt: string };
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          ? "border-border bg-card hover:border-success/50"
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
        {description && !uploaded && (
          <p className="text-xs text-secondary/80 mt-0.5 line-clamp-2">{description}</p>
        )}
        <p className="text-xs text-secondary truncate">
          {uploaded ? (
            <>
              <span className="text-foreground/80">{uploaded.fileName}</span>
              <span className="mx-1.5">·</span>
              {formatBytes(uploaded.size)}
            </>
          ) : isActive ? (
            "Aktuell · jetzt hochladen"
          ) : (
            <>Noch nicht hochgeladen{!required && " · optional"}</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
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
            Ausstehend
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
                  <MenuItem icon={Download} label="Herunterladen" onClick={() => setMenuOpen(false)} />
                  <MenuItem icon={Trash2} label="Löschen" destructive onClick={() => { onRemove(); setMenuOpen(false); }} />
                </>
              ) : (
                <MenuItem icon={CloudUpload} label="Jetzt hochladen" onClick={() => { onSelect(); setMenuOpen(false); }} />
              )}
            </div>
          )}
        </div>
      </div>
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

function UploadDropZone({ onFile }: { onFile: (file: { name: string; size: number }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Die Datei überschreitet die maximale Größe von 10 MB.");
      return;
    }
    onFile({ name: file.name, size: file.size });
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