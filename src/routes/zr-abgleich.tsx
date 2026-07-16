import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Tag, Upload, Loader2 } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-state";
import { UnitexLogo } from "@/components/ui/UnitexLogo";
import { fetchSuppliers } from "@/lib/zr-suppliers";
import { getSessions } from "@/lib/zr-sessions";

export const Route = createFileRoute("/zr-abgleich")({
  head: () => ({ meta: [{ title: "ZR-Abgleich | unitex Onboarding" }] }),
  component: ZrAbgleichPage,
});

function ZrAbgleichPage() {
  const navigate = useNavigate();
  const { state } = useOnboarding();

  useEffect(() => {
    if (!state.loading && (!state.signedIn || state.role !== "admin")) {
      navigate({ to: "/intern" });
    }
  }, [state.loading, state.signedIn, state.role, navigate]);

  const [supplierCount, setSupplierCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);

  useEffect(() => {
    fetchSuppliers().then((s) => setSupplierCount(s.length)).catch(() => setSupplierCount(null));
    getSessions().then((s) => setSessionCount(s.length)).catch(() => setSessionCount(null));
  }, []);

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
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück zu ZR-Accounts
          </Link>
        </div>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary font-medium">
          🔁 ZR-Abgleich
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-10 py-14">
        <h1 className="font-display text-2xl font-semibold mb-1">ZR-Abgleich</h1>
        <p className="text-sm text-secondary mb-10">
          Marken-Stammdaten pflegen und Kreditorenlisten der Händler gegen die ZR-Marken abgleichen.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          <Link
            to="/zr-lieferanten"
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-lg font-semibold mb-1.5">Lieferanten-Stammdaten</h2>
            <p className="text-sm text-secondary mb-4">
              Marken-Lieferanten pflegen, aktivieren/deaktivieren, aus dem Master-Dokument importieren.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {supplierCount === null ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : `${supplierCount} Lieferanten`}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-1.5 transition-all">
                Öffnen <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          <Link
            to="/zr-upload"
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-display text-lg font-semibold mb-1.5">Kreditorenlisten &amp; Sessions</h2>
            <p className="text-sm text-secondary mb-4">
              Kreditorenlisten hochladen, automatisches Matching starten, Review, Stichprobe und Ergebnis je Batch.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">
                {sessionCount === null ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : `${sessionCount} Batch(es)`}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-1.5 transition-all">
                Öffnen <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
