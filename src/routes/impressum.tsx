import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/layout/LegalLayout";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [{ title: "Impressum | unitex Onboarding" }] }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2 className="text-base font-semibold text-foreground">Angaben gemäß § 5 DDG</h2>
        <p className="mt-2">
          unitex GmbH<br />
          Albrecht-Berblinger-Str. 11<br />
          89231 Neu-Ulm
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Handelsregister</h2>
        <p className="mt-2">
          Handelsregister: HRB 11606<br />
          Registergericht: Amtsgericht Memmingen
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Vertreten durch</h2>
        <p className="mt-2">Xaver Albrecht</p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Kontakt</h2>
        <p className="mt-2">
          Telefon: +49 (0)731 70794-0<br />
          E-Mail:{" "}
          <a href="mailto:info@unitex.de" className="text-primary underline underline-offset-2">
            info@unitex.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Umsatzsteuer-ID</h2>
        <p className="mt-2">
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE 223204247
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Verbraucherstreitbeilegung / Universalschlichtungsstelle
        </h2>
        <p className="mt-2">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalLayout>
  );
}