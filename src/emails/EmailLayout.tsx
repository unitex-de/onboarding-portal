import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
const baseURL = process.env.NODE_ENV === "production" ? "https://onboarding.unitex.de/email-assets" : "";

export const colors = {
  pageBg: "#F5F2EE",
  cardBg: "#0D1B2A",
  cardBorder: "#294b69",
  foreground: "#FFFFFF",
  bodyText: "#bdcddf",
  muted: "#8DA5BE",
  primary: "#FACBBA",
};

export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.pageBg,
          margin: 0,
          padding: "32px 0",
          fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Section style={{ backgroundColor: colors.cardBg, borderRadius: "12px", padding: "40px 36px" }}>
            <Img
              src={`${baseURL}/static/unitex-logo.png`}
              alt="unitex"
              width="110"
              style={{ margin: "0 0 28px 0" }}
            />
            {children}
          </Section>
          <Section style={{ padding: "24px 12px 0" }}>
            <Text style={{ fontSize: "12px", color: "#9CA3AF", margin: 0, textAlign: "center" as const }}>
              unitex GmbH · Onboarding-Portal · Diese Mail wurde automatisch versendet.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}