import { Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, colors } from "./EmailLayout";

export function AccessCodeEmail({ token = "123456" }: { token?: string }) {
  return (
    <EmailLayout preview={`Ihr Zugangscode: ${token}`}>
      <Text style={{ color: colors.foreground, fontSize: "16px", lineHeight: "24px", margin: "0 0 8px 0" }}>
        Ihr Zugangscode
      </Text>
      <Text style={{ color: colors.bodyText, fontSize: "14px", lineHeight: "22px", margin: "0 0 24px 0" }}>
        Geben Sie diesen Code auf{" "}
        <a href="https://onboarding.unitex.de" style={{ color: colors.primary, textDecoration: "underline" }}>
          onboarding.unitex.de
        </a>{" "}
        ein, um sich anzumelden:
      </Text>
      <Section
        style={{
          border: `1.5px dashed ${colors.primary}`,
          borderRadius: "8px",
          padding: "18px 0",
          textAlign: "center" as const,
          margin: "0 0 24px 0",
        }}
      >
        <Text
          style={{
            fontFamily: "'DM Sans', Georgia, serif",
            fontSize: "30px",
            fontWeight: 700,
            letterSpacing: "6px",
            color: colors.primary,
            margin: 0,
          }}
        >
          {token}
        </Text>
      </Section>
      <Text style={{ color: colors.muted, fontSize: "13px", lineHeight: "20px", margin: 0 }}>
        Der Code ist 1 Stunde gültig.
      </Text>
    </EmailLayout>
  );
}

export default function Preview() {
  return <AccessCodeEmail token="{{ .Token }}" />;
}