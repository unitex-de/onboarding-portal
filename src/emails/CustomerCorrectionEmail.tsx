import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, colors } from "./EmailLayout";

type Correction = { label: string; comment?: string };

export function CustomerCorrectionEmail({
  companyName,
  firstName,
  lastName,
  note,
  corrections = [],
}: {
  companyName: string;
  firstName: string;
  lastName: string;
  note?: string;
  corrections?: Correction[];
}) {
  return (
    <EmailLayout preview={`Bitte korrigieren Sie einige Angaben für ${companyName}`}>
      <Text style={{ color: colors.foreground, fontSize: "14px", lineHeight: "22px", margin: "0 0 16px 0" }}>
        Guten Tag {firstName} {lastName},
      </Text>
      <Text style={{ color: colors.bodyText, fontSize: "14px", lineHeight: "22px", margin: "0 0 16px 0" }}>
        vielen Dank für die Einreichung Ihrer Onboarding-Unterlagen für{" "}
        <strong style={{ color: colors.foreground }}>{companyName}</strong>. Bei der Prüfung ist uns aufgefallen,
        dass noch etwas korrigiert werden muss:
      </Text>

      {note && (
        <Section
          style={{
            backgroundColor: colors.headerBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "0px",
            padding: "14px 16px",
            margin: "0 0 20px 0",
          }}
        >
          <Text style={{ color: colors.foreground, fontSize: "14px", lineHeight: "20px", margin: 0 }}>{note}</Text>
        </Section>
      )}

      {corrections.length > 0 && (
        <Section style={{ margin: "0 0 24px 0" }}>
          {corrections.map((c, i) => (
            <div
              key={i}
              style={{
                borderBottom: `1px solid ${colors.cardBorder}`,
                padding: "14px 0",
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: "14px", fontWeight: 700, margin: 0 }}>{c.label}</Text>
              {c.comment && (
                <Text style={{ color: colors.muted, fontSize: "13px", fontStyle: "italic", margin: "2px 0 0 0" }}>
                  {c.comment}
                </Text>
              )}
            </div>
          ))}
        </Section>
      )}

      <Text style={{ color: colors.bodyText, fontSize: "14px", lineHeight: "22px", margin: 0 }}>
        Bitte loggen Sie sich im{" "}
        <a href="https://onboarding.unitex.de" style={{ color: colors.primary, textDecoration: "underline", fontWeight: 700 }}>
          Portal
        </a>{" "}
        ein, um die Korrektur vorzunehmen und erneut einzureichen.
      </Text>
    </EmailLayout>
  );
}

export default function Preview() {
  return (
    <CustomerCorrectionEmail
      companyName="Beispiel GmbH"
      firstName="Max"
      lastName="Mustermann"
      note="Bitte prüfen Sie die folgenden Angaben, bevor Sie erneut einreichen."
      corrections={[
        { label: "IBAN", comment: "Bitte vollständige IBAN angeben" },
        { label: "Ansprechpartner Buchhaltung" },
      ]}
    />
  );
}