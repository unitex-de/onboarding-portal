import { Check, Loader2, CalendarDays } from "lucide-react";
import { useOnboarding, calcZrStartDate, formatDateDe } from "@/lib/onboarding-state";

interface Item { id: string; label: string }
interface Group { title: string; items: Item[] }

const GROUPS: Group[] = [
  {
    title: "Identifikation",
    items: [
      { id: "ausweiskopie", label: "Ausweiskopie" },
      { id: "hr_auszug", label: "Auszug Handelsregister" },
      { id: "gesellschaftsvertrag", label: "Gesellschaftsvertrag" },
      { id: "gesellschafterliste", label: "Gesellschafterliste" },
    ],
  },
  {
    title: "Finanzen",
    items: [
      { id: "steuernummer", label: "Steuernummer" },
      { id: "sepa_mandat", label: "SEPA Mandat" },
    ],
  },
  {
    title: "Formulare",
    items: [
      { id: "neukundenformular", label: "Neukundenformular" },
      { id: "gwg_bogen", label: "GWG Bogen (falls vorhanden)" },
    ],
  },
];

export function RightChecklist() {
  const { state, toggleChecklist } = useOnboarding();
  const all = GROUPS.flatMap((g) => g.items);
  const done = all.filter((i) => state.checklist[i.id]).length;
  const pct = Math.round((done / all.length) * 100);
  const zrDate = calcZrStartDate();

  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="rounded-xl border border-upload bg-card/40 p-5 space-y-5">
        <div>
          <h3 className="font-display text-base font-semibold text-card-foreground">Checkliste</h3>
          <div className="mt-2 flex items-center justify-between text-xs text-secondary">
            <span>{done} von {all.length} abgeschlossen</span>
            <span className="font-medium text-card-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-popover overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {GROUPS.map((g) => (
          <div key={g.title} className="space-y-2">
            <h4 className="font-display text-sm font-semibold text-card-foreground">{g.title}</h4>
            <ul className="space-y-1.5">
              {g.items.map((i) => {
                const checked = !!state.checklist[i.id];
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => toggleChecklist(i.id)}
                      className="group flex w-full items-center gap-3 text-left"
                    >
                      <span
                        className={[
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          checked
                            ? "bg-success border-success"
                            : "border-primary/70 bg-transparent",
                        ].join(" ")}
                      >
                        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-secondary underline decoration-border underline-offset-4 group-hover:text-card-foreground">
                        {i.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
        <h4 className="font-display text-sm font-semibold text-card-foreground">In Bearbeitung</h4>
        <ul className="space-y-2 text-sm text-secondary">
          <li className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
            GLN-Beantragung
          </li>
          <li className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
            RSB-Anmeldung
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Voraussichtlicher ZR-Start</p>
            <p className="mt-1 font-display text-lg font-semibold text-card-foreground">
              ab {formatDateDe(zrDate)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}