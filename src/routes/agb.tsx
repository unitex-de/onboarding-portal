import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/layout/LegalLayout";

export const Route = createFileRoute("/agb")({
  head: () => ({ meta: [{ title: "AGB | unitex Onboarding" }] }),
  component: AgbPage,
});

const h2 = "text-base font-semibold text-foreground";
const h3 = "font-medium text-foreground";
const list = "mt-2 list-disc space-y-1 pl-5";

function AgbPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen">
      <section>
        <p>
          RSB Retail+Service Bank GmbH
          <br />
          Kornbühlstr. 2
          <br />
          70806 Kornwestheim
        </p>
        <p className="mt-2">Stand: Juli 2025</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">
          Grundregeln für die Beziehung zwischen Kunde und Bank
        </h2>
      </section>

      {/* ───────── 1. Geltungsbereich und Änderungen ───────── */}
      <section>
        <h2 className={h2}>
          1. Geltungsbereich und Änderungen dieser Geschäftsbedingungen und der
          Sonderbedingungen für einzelne Geschäftsbeziehungen
        </h2>

        <h3 className={`${h3} mt-3`}>(1) Geltungsbereich</h3>
        <p className="mt-1">
          Die Allgemeinen Geschäftsbedingungen gelten für die gesamte Geschäftsverbindung
          zwischen dem Kunden und den inländischen Geschäftsstellen der Bank (im Folgenden
          Bank genannt). Daneben gelten für einzelne Geschäftsbeziehungen (zum Beispiel für
          das Wertpapiergeschäft, den Zahlungsverkehr und für den Sparverkehr)
          Sonderbedingungen, die Abweichungen oder Ergänzungen zu diesen Allgemeinen
          Geschäftsbedingungen enthalten; sie werden bei der Kontoeröffnung oder bei Erteilung
          eines Auftrages mit dem Kunden vereinbart. Unterhält der Kunde auch
          Geschäftsverbindungen zu ausländischen Geschäftsstellen, sichert das Pfandrecht der
          Bank (Nummer 14 dieser Geschäftsbedingungen) auch die Ansprüche dieser ausländischen
          Geschäftsstellen.
        </p>

        <h3 className={`${h3} mt-3`}>(2) Änderungen</h3>

        <p className="mt-2 font-medium text-foreground">a) Änderungsangebot</p>
        <p className="mt-1">
          Änderungen dieser Geschäftsbedingungen und der Sonderbedingungen werden dem Kunden
          spätestens zwei Monate vor dem vorgeschlagenen Zeitpunkt ihres Wirksamwerdens in
          Textform angeboten. Hat der Kunde mit der Bank im Rahmen der Geschäftsbeziehung einen
          elektronischen Kommunikationsweg vereinbart (zum Beispiel das Online-Banking), können
          die Änderungen auch auf diesem Wege angeboten werden.
        </p>

        <p className="mt-2 font-medium text-foreground">b) Annahme durch den Kunden</p>
        <p className="mt-1">
          Die von der Bank angebotenen Änderungen werden nur wirksam, wenn der Kunde diese
          annimmt, gegebenenfalls im Wege der nachfolgend geregelten Zustimmungsfiktion.
        </p>

        <p className="mt-2 font-medium text-foreground">
          c) Annahme durch den Kunden im Wege der Zustimmungsfiktion
        </p>
        <p className="mt-1">
          Das Schweigen des Kunden gilt nur dann als Annahme des Änderungsangebots
          (Zustimmungsfiktion), wenn
        </p>
        <p className="mt-2">
          (aa) das Änderungsangebot der Bank erfolgt, um die Übereinstimmung der vertraglichen
          Bestimmungen mit einer veränderten Rechtslage wiederherzustellen, weil eine
          Bestimmung dieser Geschäftsbedingungen oder der Sonderbedingungen
        </p>
        <ul className={list}>
          <li>
            aufgrund einer Änderung von Gesetzen, einschließlich unmittelbar geltender
            Rechtsvorschriften der Europäischen Union, nicht mehr der Rechtslage entspricht
            oder
          </li>
          <li>
            durch eine rechtskräftige gerichtliche Entscheidung, auch durch ein Gericht erster
            Instanz, unwirksam wird oder nicht mehr verwendet werden darf oder
          </li>
          <li>
            aufgrund einer verbindlichen Verfügung einer für die Bank zuständigen nationalen
            oder internationalen Behörde (z. B. der Bundesanstalt für
            Finanzdienstleistungsaufsicht oder der Europäischen Zentralbank) nicht mehr mit
            den aufsichtsrechtlichen Verpflichtungen der Bank in Einklang zu bringen ist
          </li>
        </ul>
        <p className="mt-2">und</p>
        <p className="mt-2">
          (bb) der Kunde das Änderungsangebot der Bank nicht vor dem vorgeschlagenen Zeitpunkt
          des Wirksamwerdens der Änderungen abgelehnt hat.
        </p>
        <p className="mt-2">
          Die Bank wird den Kunden im Änderungsangebot auf die Folgen seines Schweigens
          hinweisen.
        </p>

        <p className="mt-2 font-medium text-foreground">d) Ausschluss der Zustimmungsfiktion</p>
        <p className="mt-1">Die Zustimmungsfiktion findet keine Anwendung</p>
        <ul className={list}>
          <li>
            bei Änderungen der Nummern 1 Absatz 2 und 12 Absatz 5 der Geschäftsbedingungen und
            der entsprechenden Regelungen in den Sonderbedingungen oder
          </li>
          <li>
            bei Änderungen, die die Hauptleistungspflichten des Vertrages und die Entgelte für
            Hauptleistungen betreffen, oder
          </li>
          <li>
            bei Änderungen von Entgelten, die auf eine über das vereinbarte Entgelt für die
            Hauptleistung hinausgehende Zahlung des Verbrauchers gerichtet sind, oder
          </li>
          <li>bei Änderungen, die dem Abschluss eines neuen Vertrages gleichkommen, oder</li>
          <li>
            bei Änderungen, die das bisher vereinbarte Verhältnis von Leistung und Gegenleistung
            erheblich zugunsten der Bank verschieben würden.
          </li>
        </ul>
        <p className="mt-2">
          In diesen Fällen wird die Bank die Zustimmung des Kunden zu den Änderungen auf andere
          Weise einholen.
        </p>

        <p className="mt-2 font-medium text-foreground">
          e) Kündigungsrecht des Kunden bei der Zustimmungsfiktion
        </p>
        <p className="mt-1">
          Macht die Bank von der Zustimmungsfiktion Gebrauch, kann der Kunde den von der
          Änderung betroffenen Vertrag vor dem vorgeschlagenen Zeitpunkt des Wirksamwerdens der
          Änderungen auch fristlos und kostenfrei kündigen. Auf dieses Kündigungsrecht wird die
          Bank den Kunden in ihrem Änderungsangebot besonders hinweisen.
        </p>
      </section>

      {/* ───────── 2. Bankgeheimnis und Bankauskunft ───────── */}
      <section>
        <h2 className={h2}>2. Bankgeheimnis und Bankauskunft</h2>

        <h3 className={`${h3} mt-3`}>(1) Bankgeheimnis</h3>
        <p className="mt-1">
          Die Bank ist zur Verschwiegenheit über alle kundenbezogenen Tatsachen und Wertungen
          verpflichtet, von denen sie Kenntnis erlangt (Bankgeheimnis). Informationen über den
          Kunden darf die Bank nur weitergeben, wenn gesetzliche Bestimmungen dies gebieten oder
          der Kunde eingewilligt hat oder die Bank zur Erteilung einer Bankauskunft befugt ist.
        </p>

        <h3 className={`${h3} mt-3`}>(2) Bankauskunft</h3>
        <p className="mt-1">
          Eine Bankauskunft enthält allgemein gehaltene Feststellungen und Bemerkungen über die
          wirtschaftlichen Verhältnisse des Kunden, seine Kreditwürdigkeit und Zahlungsfähigkeit;
          betragsmäßige Angaben über Kontostände, Sparguthaben, Depot- oder sonstige der Bank
          anvertraute Vermögenswerte sowie Angaben über die Höhe von Kreditinanspruchnahmen
          werden nicht gemacht.
        </p>

        <h3 className={`${h3} mt-3`}>(3) Voraussetzungen für die Erteilung einer Bankauskunft</h3>
        <p className="mt-1">
          Die Bank ist befugt, über juristische Personen und im Handelsregister eingetragene
          Kaufleute Bankauskünfte zu erteilen, sofern sich die Anfrage auf ihre geschäftliche
          Tätigkeit bezieht. Die Bank erteilt jedoch keine Auskünfte, wenn ihr eine anders
          lautende Weisung des Kunden vorliegt. Bankauskünfte über andere Personen,
          insbesondere über Privatkunden und Vereinigungen, erteilt die Bank nur dann, wenn
          diese generell oder im Einzelfall ausdrücklich zugestimmt haben. Eine Bankauskunft
          wird nur erteilt, wenn der Anfragende ein berechtigtes Interesse an der gewünschten
          Auskunft glaubhaft dargelegt hat und kein Grund zu der Annahme besteht, dass
          schutzwürdige Belange des Kunden der Auskunftserteilung entgegenstehen.
        </p>

        <h3 className={`${h3} mt-3`}>(4) Empfänger von Bankauskünften</h3>
        <p className="mt-1">
          Bankauskünfte erteilt die Bank nur eigenen Kunden sowie anderen Kreditinstituten für
          deren Zwecke oder die ihrer Kunden.
        </p>
      </section>

      {/* ───────── 3. Haftung der Bank; Mitverschulden des Kunden ───────── */}
      <section>
        <h2 className={h2}>3. Haftung der Bank; Mitverschulden des Kunden</h2>

        <h3 className={`${h3} mt-3`}>(1) Haftungsgrundsätze</h3>
        <p className="mt-1">
          Die Bank haftet bei der Erfüllung ihrer Verpflichtungen für jedes Verschulden ihrer
          Mitarbeiter und der Personen, die sie zur Erfüllung ihrer Verpflichtungen hinzuzieht.
          Soweit die Sonderbedingungen für einzelne Geschäftsbeziehungen oder sonstige
          Vereinbarungen etwas Abweichendes regeln, gehen diese Regelungen vor. Hat der Kunde
          durch ein schuldhaftes Verhalten (zum Beispiel durch Verletzung der in Nr. 11 dieser
          Geschäftsbedingungen aufgeführten Mitwirkungspflichten) zu der Entstehung eines
          Schadens beigetragen, bestimmt sich nach den Grundsätzen des Mitverschuldens, in
          welchem Umfang Bank und Kunde den Schaden zu tragen haben.
        </p>

        <h3 className={`${h3} mt-3`}>(2) Weitergeleitete Aufträge</h3>
        <p className="mt-1">
          Wenn ein Auftrag seinem Inhalt nach typischerweise in der Form ausgeführt wird, dass
          die Bank einen Dritten mit der weiteren Erledigung betraut, erfüllt die Bank den
          Auftrag dadurch, dass sie ihn im eigenen Namen an den Dritten weiterleitet
          (weitergeleiteter Auftrag). Dies betrifft zum Beispiel die Einholung von
          Bankauskünften bei anderen Kreditinstituten oder die Verwahrung und Verwaltung von
          Wertpapieren im Ausland. In diesen Fällen beschränkt sich die Haftung der Bank auf die
          sorgfältige Auswahl und Unterweisung des Dritten.
        </p>

        <h3 className={`${h3} mt-3`}>(3) Störung des Betriebs</h3>
        <p className="mt-1">
          Die Bank haftet nicht für Schäden, die durch höhere Gewalt, Aufruhr, Kriegs- und
          Naturereignisse oder durch sonstige von ihr nicht zu vertretende Vorkommnisse (zum
          Beispiel Streik, Aussperrung, Verkehrsstörung, Verfügungen von hoher Hand im In- oder
          Ausland) eintreten.
        </p>
      </section>

      {/* TODO: Fortsetzung mit Seite 2 der PDF (ab Nr. 4) */}
    </LegalLayout>
  );
}