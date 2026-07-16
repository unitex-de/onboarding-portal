import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft, Search, Plus, Upload, Pencil, Trash2, X, Check, Loader2,
} from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import {
  type ZrSupplier, fetchSuppliers, upsertSupplier, setSupplierActive,
  deleteSupplier, importSuppliersFromMaster,
} from "@/lib/zr-suppliers";

export const Route = createFileRoute("/zr-lieferanten")({
  head: () => ({ meta: [{ title: "ZR-Lieferanten | unitex Onboarding" }] }),
  component: ZrLieferantenPage,
});

type EditState = {
  liefNr: string;
  firmierung: string;
  marke: string;
  aliases: string;
  sortiment: string;
  active: boolean;
  isNew: boolean;
};

const emptyEdit: EditState = {
  liefNr: "", firmierung: "", marke: "", aliases: "", sortiment: "", active: true, isNew: true,
};

function ZrLieferantenPage() {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [suppliers, setSuppliers] = useState<ZrSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"active" | "inactive" | "all">("active");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setSuppliers(await fetchSuppliers());
    } catch (err) {
      console.error("Fehler beim Laden der Lieferanten:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (show === "active") list = list.filter((s) => s.active);
    if (show === "inactive") list = list.filter((s) => !s.active);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.firmierung.toLowerCase().includes(q) ||
          s.marke.toLowerCase().includes(q) ||
          s.liefNr.includes(q)
      );
    }
    return list;
  }, [suppliers, show, query]);

  const handleSave = async () => {
    if (!editing || !editing.liefNr.trim()) return;
    setSaving(true);
    try {
      await upsertSupplier({
        liefNr: editing.liefNr.trim(),
        firmierung: editing.firmierung.trim(),
        marke: editing.marke.trim(),
        aliases: editing.aliases.trim(),
        sortiment: editing.sortiment.trim(),
        active: editing.active,
      });
      setEditing(null);
      await load();
    } catch (err: any) {
      alert(`Fehler beim Speichern: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: ZrSupplier) => {
    try {
      await setSupplierActive(s.liefNr, !s.active);
      setSuppliers((prev) => prev.map((x) => (x.liefNr === s.liefNr ? { ...x, active: !x.active } : x)));
    } catch (err: any) {
      alert(`Fehler: ${err.message ?? err}`);
    }
  };

  const handleDelete = async (s: ZrSupplier) => {
    if (!confirm(`Lieferant "${s.firmierung || s.liefNr}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    try {
      await deleteSupplier(s.liefNr);
      setSuppliers((prev) => prev.filter((x) => x.liefNr !== s.liefNr));
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message ?? err}`);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportMsg(null);
    try {
      const n = await importSuppliersFromMaster(file);
      setImportMsg(`${n} Lieferanten importiert/aktualisiert.`);
      await load();
    } catch (err: any) {
      setImportMsg(`Fehler beim Import: ${err.message ?? err}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (state.loading || !state.signedIn || state.role !== "admin") {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-row items-end gap-3">
            <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
              <UnitexLogo className="h-4 w-[60px] text-slate-900" />
            </div>
          </div>
          <Link to="/zr-abgleich" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück zum ZR-Abgleich
          </Link>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          🏷 ZR-Lieferanten
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-10">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold">Lieferanten-Stammdaten (ZR)</h1>
            <p className="mt-1 text-sm text-secondary">
              Basis für das Matching der Kreditorenlisten. {suppliers.length} Lieferanten insgesamt.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-popover disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Master-Dokument importieren
            </button>
            <button
              type="button"
              onClick={() => setEditing({ ...emptyEdit })}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Neuer Lieferant
            </button>
          </div>
        </div>

        {importMsg && (
          <div className="mb-6 rounded-md border border-border bg-card px-4 py-3 text-sm">{importMsg}</div>
        )}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche nach Firmierung, Marke oder Lief.-Nr."
              className="w-full rounded-md border border-border bg-popover pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-popover">
            {([
              { value: "active", label: "Aktiv" },
              { value: "inactive", label: "Inaktiv" },
              { value: "all", label: "Alle" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShow(opt.value)}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  show === opt.value ? "bg-primary text-primary-foreground" : "text-secondary hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-popover text-secondary text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Lief.-Nr</th>
                <th className="text-left px-4 py-3">Firmierung</th>
                <th className="text-left px-4 py-3">Marke(n)</th>
                <th className="text-left px-4 py-3">Sortiment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-secondary">Lädt…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                    {suppliers.length === 0
                      ? 'Noch keine Lieferanten. Über "Master-Dokument importieren" starten.'
                      : "Keine Treffer für die aktuelle Suche/den Filter."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.liefNr} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{s.liefNr}</td>
                    <td className="px-4 py-3">{s.firmierung || "–"}</td>
                    <td className="px-4 py-3 text-secondary">{s.marke || "–"}</td>
                    <td className="px-4 py-3 text-secondary">{s.sortiment || "–"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          s.active ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary/20 text-secondary",
                        ].join(" ")}
                      >
                        {s.active ? "Aktiv" : "Inaktiv"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing({
                            liefNr: s.liefNr, firmierung: s.firmierung, marke: s.marke,
                            aliases: s.aliases, sortiment: s.sortiment, active: s.active, isNew: false,
                          })}
                          className="p-1.5 rounded-md hover:bg-popover text-secondary hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-md hover:bg-popover text-secondary hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {editing.isNew ? "Neuer Lieferant" : `Lieferant ${editing.liefNr} bearbeiten`}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1 rounded-md hover:bg-popover">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Lieferantennummer</label>
                <input
                  type="text"
                  value={editing.liefNr}
                  disabled={!editing.isNew}
                  onChange={(e) => setEditing({ ...editing, liefNr: e.target.value })}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Firmierung</label>
                <input
                  type="text"
                  value={editing.firmierung}
                  onChange={(e) => setEditing({ ...editing, firmierung: e.target.value })}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Marke(n) — kommagetrennt</label>
                <input
                  type="text"
                  value={editing.marke}
                  onChange={(e) => setEditing({ ...editing, marke: e.target.value })}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Aliases — kommagetrennt</label>
                <input
                  type="text"
                  value={editing.aliases}
                  onChange={(e) => setEditing({ ...editing, aliases: e.target.value })}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-secondary uppercase tracking-wide">Sortiment</label>
                <input
                  type="text"
                  value={editing.sortiment}
                  onChange={(e) => setEditing({ ...editing, sortiment: e.target.value })}
                  className="w-full rounded-md border border-border bg-popover px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Aktiv (fließt ins Matching neuer Uploads ein)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-popover"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editing.liefNr.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}