import { Body, Container, Head, Html, Img, Preview, Section, Text, Hr } from "@react-email/components";
import * as React from "react";

const logoSrc =
  process.env.NODE_ENV === "production"
    ? "https://onboarding.unitex.de/email-assets/unitex_Logo_blau.jpg"
    : "/static/unitex_Logo_blau.jpg";

export const fontFamily = "Tahoma, Geneva, Verdana, sans-serif";

// Hinweis: Keys bleiben wie bisher (foreground, bodyText, muted, primary, cardBorder),
// damit AccessCodeEmail.tsx und CustomerCorrectionEmail.tsx vorerst unverändert
// kompilieren. Die Werte sind neu auf die helle Farbwelt gemappt.
export const colors = {
  pageBg: "#D0E0E3",
  headerBg: "#FFFFFF",
  footerBg: "#21224B",
  foreground: "#21224B",
  bodyText: "#21224B",
  muted: "#21224B",
  primary: "#21224B",
  cardBorder: "#21224B",
};

export function EmailLayout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="de">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.pageBg, margin: 0, padding: 0, fontFamily }}>
        <Container style={{ maxWidth: "480px", margin: "0 auto" }}>
          <Section style={{ backgroundColor: colors.headerBg, padding: "28px 20px", textAlign: "center" as const }}>
            <Img src={logoSrc} alt="unitex" width="130" style={{ margin: "0 auto" }} />
            <Text style={{ fontFamily, fontSize: "11px", letterSpacing: "0.3px", color: colors.foreground, margin: "10px 0 0 0" }}>
              Vertrauen. Kompetenz. Innovation.
            </Text>
          </Section>

          <Section style={{ backgroundColor: colors.pageBg, padding: "32px 36px" }}>
            {children}
          </Section>

          <Section style={{ backgroundColor: colors.pageBg, padding: "22px 20px", textAlign: "center" as const }}>
            <Text style={{ fontFamily, fontSize: "11px", lineHeight: "18px", color: colors.foreground, margin: 0 }}>
              unitex GmbH · Albrecht-Berblinger-Str. 11 · 89231 Neu-Ulm
            </Text>
              <Text style={{ fontFamily, fontSize: "11px", lineHeight: "18px", color: colors.foreground, margin: 0 }}>
              Diese Mail wurde automatisch versendet.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}