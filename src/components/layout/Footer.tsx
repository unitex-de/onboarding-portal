import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-sidebar border-t border-sidebar-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>&copy; {new Date().getFullYear()} unitex GmbH</span>
        <nav className="flex gap-4">
          <Link
            to="/impressum"
            className="text-primary transition-opacity hover:opacity-80 hover:underline underline-offset-2"
          >
            Impressum
          </Link>
          <Link
            to="/datenschutz"
            className="text-primary transition-opacity hover:opacity-80 hover:underline underline-offset-2"
          >
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
