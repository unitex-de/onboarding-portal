import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>&copy; {new Date().getFullYear()} unitex GmbH</span>
        <nav className="flex gap-4">
          <Link
            to="/impressum"
            className="transition-colors hover:text-foreground hover:underline underline-offset-2"
          >
            Impressum
          </Link>
          <Link
            to="/datenschutz"
            className="transition-colors hover:text-foreground hover:underline underline-offset-2"
          >
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
