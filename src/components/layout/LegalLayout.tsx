import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { UnitexLogo } from "@/components/ui/UnitexLogo";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex flex-row items-end gap-3 text-foreground"
            aria-label="Zur Startseite"
          >
            <div className="bg-white px-0.5 pt-10 pb-0.5 shadow-sm flex items-end justify-center shrink-0">
              <UnitexLogo className="h-4 w-[60px] text-slate-900" />
            </div>
            <span className="text-[10px] leading-tight font-medium">
              VERTRAUEN.<br />
              KOMPETENZ.<br />
              <span className="text-[#FACBBA]">INNOVATION.</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>
    </div>
  );
}