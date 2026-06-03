import { Construction } from "lucide-react";

export function SectionPlaceholder({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-popover">
        <Construction className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold">{name} – in Vorbereitung</h3>
      <p className="mt-2 text-sm text-secondary">
        Diese Sektion wird im nächsten Schritt implementiert. Layout, Tokens und Checkliste sind bereits aktiv.
      </p>
    </div>
  );
}