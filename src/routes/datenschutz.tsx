import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LegalLayout } from "@/components/layout/LegalLayout";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({ meta: [{ title: "Datenschutzerklärung | unitex Onboarding" }] }),
  component: DatenschutzPage,
});

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p>
        Diese Datenschutzerklärung informiert Sie über die Verarbeitung
        personenbezogener Daten bei der Nutzung des unitex Onboarding-Portals
        (nachfolgend „Portal"). Das Portal dient der digitalen Aufnahme neuer
        Mitglieder und Lieferanten der unitex GmbH: Sie reichen darüber
        Unternehmens- und Kontaktdaten sowie Unterlagen ein und bereiten die für
        die Zentralregulierung erforderlichen Verträge und Signaturen vor.
      </p>

      <section>
        <H2>1. Verantwortliche Stelle</H2>
        <p className="mt-2">Verantwortlich für die Datenverarbeitung in diesem Portal ist:</p>
        <p className="mt-2">
          unitex GmbH<br />
          Albrecht-Berblinger-Str. 11<br />
          89231 Neu-Ulm<br />
          Vertreten durch den Geschäftsführer Xaver Albrecht
        </p>
        <p className="mt-2">
          Telefon: +49 (0)731 70794-0<br />
          E-Mail:{" "}
          <a href="mailto:info@unitex.de" className="text-primary underline underline-offset-2">
            info@unitex.de
          </a>
        </p>
      </section>

      <section>
        <H2>2. Datenschutzbeauftragter</H2>
        <p className="mt-2">Wir haben einen externen Datenschutzbeauftragten benannt:</p>
        <p className="mt-2">
          Gesellschaft für Personaldienstleistungen mbH<br />
          Pestalozzistraße 27<br />
          34119 Kassel<br />
          Telefon: 0561 78968-93<br />
          E-Mail:{" "}
          <a href="mailto:datenschutz@gfp24.de" className="text-primary underline underline-offset-2">
            datenschutz@gfp24.de
          </a>
        </p>
      </section>

      <section>
        <H2>3. Zweck der Verarbeitung und Rechtsgrundlagen</H2>
        <p className="mt-2">
          Wir verarbeiten die im Portal eingegebenen personenbezogenen Daten, um das Aufnahme-
          bzw. Onboarding-Verfahren durchzuführen, die erforderlichen Verträge (u. a. ZR-Vertrag,
          SEPA-Mandat) vorzubereiten und die Geschäftsbeziehung zu begründen.
        </p>
        <p className="mt-2">
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines Vertrags bzw.
          Durchführung vorvertraglicher Maßnahmen), soweit die betroffene Person selbst
          Vertragspartei oder deren gesetzlicher Vertreter ist. Für Angaben zu weiteren im
          Unternehmen benannten Ansprechpartnern verarbeiten wir die Daten auf Grundlage unseres
          berechtigten Interesses an einer effizienten Abwicklung des Aufnahmeverfahrens (Art. 6
          Abs. 1 lit. f DSGVO). Soweit wir gesetzlich zur Verarbeitung verpflichtet sind (z. B.
          handels- oder steuerrechtliche Pflichten), erfolgt diese auf Grundlage von Art. 6 Abs. 1
          lit. c DSGVO.
        </p>
      </section>

      <section>
        <H2>4. Welche Daten wir verarbeiten</H2>
        <p className="mt-2">Im Rahmen des Onboardings verarbeiten wir insbesondere:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Unternehmensdaten (Firma, Anschrift, Rechtsform, Register- und Steuernummern, Bankverbindung)</li>
          <li>Kontaktdaten der handelnden Personen (Name, Funktion, E-Mail, Telefon)</li>
          <li>von Ihnen hochgeladene Unterlagen und in die Formulare eingegebene Angaben</li>
          <li>Daten im Zusammenhang mit der digitalen Signatur (z. B. Zeitstempel, IP-Adresse und E-Mail-Adresse zum Nachweis der Unterzeichnung)</li>
          <li>technische Zugriffsdaten, die zur sicheren Bereitstellung des Portals erforderlich sind</li>
        </ul>
      </section>

      <section>
        <H2>5. Registrierung und Anmeldung</H2>
        <p className="mt-2">
          Für die Nutzung des Portals ist eine Anmeldung erforderlich. Die Anmeldung erfolgt über
          Ihre E-Mail-Adresse, an die wir einen einmaligen Bestätigungscode senden. Für die Dauer
          Ihrer Sitzung wird ein technisch notwendiges Cookie gesetzt, das Sie angemeldet hält.
          Die Verarbeitung erfolgt zur Durchführung des durch die Registrierung begründeten
          Nutzungsverhältnisses (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
      </section>

      <section>
        <H2>6. Cookies</H2>
        <p className="mt-2">
          Das Portal verwendet ausschließlich technisch notwendige Cookies, die für den Betrieb
          und insbesondere für die Anmeldung erforderlich sind. Solche Cookies sind nach § 25
          Abs. 2 Nr. 2 TDDDG nicht einwilligungspflichtig; ihre Verarbeitung stützt sich auf
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer technisch fehlerfreien und
          sicheren Bereitstellung des Portals). Ein Einsatz von Analyse- oder Tracking-Cookies
          findet nicht statt.
        </p>
      </section>

      <section>
        <H2>7. Hosting und eingesetzte Auftragsverarbeiter</H2>
        <p className="mt-2">
          Zum Betrieb des Portals setzen wir die nachfolgend genannten Dienstleister ein, mit
          denen wir jeweils einen Vertrag zur Auftragsverarbeitung (AVV) nach Art. 28 DSGVO
          geschlossen haben. Soweit dabei Daten in Länder außerhalb der EU/des EWR übermittelt
          werden, erfolgt dies auf Grundlage der Standardvertragsklauseln der EU-Kommission (SCC)
          bzw. – wo einschlägig – einer Zertifizierung nach dem EU-U.S. Data Privacy Framework.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-semibold text-foreground">Supabase (Datenbank &amp; Speicher)</h3>
            <p className="mt-1">
              Anbieter: Supabase, Inc., 548 Market Street, San Francisco, CA 94104, USA. Supabase
              betreibt die Datenbank und den Dokumentenspeicher des Portals in der Region Frankfurt
              (EU). Da es sich beim Anbieter um ein Unternehmen mit Sitz in den USA handelt, ist
              für etwaige Zugriffe aus einem Drittland ein AVV mit Standardvertragsklauseln
              geschlossen. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Datenschutzerklärung:{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">supabase.com/privacy</a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Vercel (Hosting)</h3>
            <p className="mt-1">
              Anbieter: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA. Vercel stellt
              die Anwendung bereit. Die Übermittlung in die USA wird auf die
              Standardvertragsklauseln der EU-Kommission gestützt; Vercel ist zudem nach dem
              EU-U.S. Data Privacy Framework zertifiziert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f
              DSGVO. Datenschutzerklärung:{" "}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">vercel.com/legal/privacy-policy</a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Resend (E-Mail-Versand)</h3>
            <p className="mt-1">
              Anbieter: Plus Five Five, Inc. (Resend), San Francisco, CA, USA. Über Resend
              versenden wir die im Rahmen des Onboardings erforderlichen E-Mails (z. B.
              Anmeldecodes und Benachrichtigungen). Die Übermittlung in die USA wird auf die
              Standardvertragsklauseln gestützt; Resend ist nach dem EU-U.S. Data Privacy Framework
              zertifiziert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Datenschutzerklärung:{" "}
              <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">resend.com/legal/privacy-policy</a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">HubSpot (CRM)</h3>
            <p className="mt-1">
              Anbieter: HubSpot, Inc., 2 Canal Park, Cambridge, MA 02141, USA. Nach Freigabe eines
              Onboardings übertragen wir die Unternehmens- und Kontaktdaten in unser CRM-System
              HubSpot, um die Geschäftsbeziehung zu verwalten. Die Übermittlung in die USA wird auf
              die Standardvertragsklauseln gestützt; HubSpot ist nach dem EU-U.S. Data Privacy
              Framework zertifiziert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
              Datenschutzerklärung:{" "}
              <a href="https://legal.hubspot.com/de/privacy-policy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">legal.hubspot.com/de/privacy-policy</a>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">PandaDoc (digitale Signatur)</h3>
            <p className="mt-1">
              Anbieter: PandaDoc, Inc., 548 Market St PMB 185308, San Francisco, CA 94104-5401,
              USA. Über PandaDoc werden die im Abschluss-Schritt zu unterzeichnenden Dokumente
              bereitgestellt und rechtssicher signiert. Verarbeitet werden dabei u. a. Name,
              E-Mail-Adresse und technische Nachweisdaten (Audit-Trail). Die Übermittlung in die USA
              wird auf die Standardvertragsklauseln gestützt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b
              DSGVO. Datenschutzerklärung:{" "}
              <a href="https://www.pandadoc.com/privacy-notice/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">pandadoc.com/privacy-notice</a>.
            </p>
          </div>
        </div>
      </section>

      <section>
        <H2>8. Datenübermittlung in die USA und sonstige Drittstaaten</H2>
        <p className="mt-2">
          Wie unter Ziffer 7 dargestellt, setzen wir teils Dienstleister mit Sitz in den USA ein.
          Wir weisen darauf hin, dass in Drittstaaten kein mit der EU vergleichbares
          Datenschutzniveau garantiert werden kann. Die Übermittlung erfolgt auf Grundlage der
          Standardvertragsklauseln der EU-Kommission und – soweit einschlägig – einer
          Zertifizierung nach dem EU-U.S. Data Privacy Framework.
        </p>
      </section>

      <section>
        <H2>9. Speicherdauer</H2>
        <p className="mt-2">
          Wir verarbeiten Ihre Daten, solange dies für die genannten Zwecke erforderlich ist. Nach
          Abschluss oder Abbruch des Aufnahmeverfahrens werden die Daten gelöscht, sofern keine
          gesetzlichen Aufbewahrungspflichten (insbesondere handels- und steuerrechtlicher Art)
          entgegenstehen; in diesem Fall erfolgt die Löschung nach Ablauf der jeweiligen Fristen.
        </p>
      </section>

      <section>
        <H2>10. Ihre Rechte</H2>
        <p className="mt-2">
          Sie haben im Rahmen der gesetzlichen Vorgaben das Recht auf Auskunft (Art. 15 DSGVO),
          Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung
          (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie ein Widerspruchsrecht gegen
          Verarbeitungen, die auf Art. 6 Abs. 1 lit. f DSGVO beruhen (Art. 21 DSGVO). Eine erteilte
          Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Zur Ausübung
          dieser Rechte genügt eine Mitteilung an die unter Ziffer 1 genannten Kontaktdaten.
        </p>
        <p className="mt-2">
          Ihnen steht ferner ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu,
          insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes
          oder des Orts des mutmaßlichen Verstoßes.
        </p>
      </section>

      <section>
        <H2>11. Datensicherheit (SSL-/TLS-Verschlüsselung)</H2>
        <p className="mt-2">
          Das Portal nutzt zum Schutz der Übertragung Ihrer Daten eine SSL- bzw. TLS-Verschlüsselung.
          Eine verschlüsselte Verbindung erkennen Sie an der Zeichenfolge „https://" in der
          Adresszeile Ihres Browsers und am Schloss-Symbol.
        </p>
      </section>
    </LegalLayout>
  );
}
