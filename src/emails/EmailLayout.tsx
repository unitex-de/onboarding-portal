import { Body, Container, Head, Html, Img, Preview, Text } from "@react-email/components";
import * as React from "react";

const logoSrc =
  process.env.NODE_ENV === "production"
    ? "https://onboarding.unitex.de/email-assets/unitex_Logo_blau.jpg"
    : "/static/unitex_Logo_blau.jpg";

export const fontFamily = "Tahoma, Geneva, Verdana, sans-serif";

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
          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td
                  align="center"
                  {...({ bgcolor: colors.headerBg } as any)}
                  style={{ backgroundColor: colors.headerBg, padding: "28px 20px", textAlign: "center" as const }}
                >
                  <Img src={logoSrc} alt="unitex" width="130" style={{ margin: "0 auto" }} />
                </td>
              </tr>
              <tr>
                <td
                  {...({ bgcolor: colors.headerBg } as any)}
                  style={{ backgroundColor: colors.headerBg, padding: "32px 36px" }}
                >
                  {children}
                </td>
              </tr>
              <tr>
                <td
                  align="center"
                  {...({ bgcolor: colors.pageBg } as any)}
                  style={{ backgroundColor: colors.pageBg, padding: "22px 20px", textAlign: "center" as const }}
                >
                  <Text style={{ fontFamily, fontSize: "11px", lineHeight: "18px", color: colors.foreground, margin: 0 }}>
                    unitex GmbH · Albrecht-Berblinger-Str. 11 · 89231 Neu-Ulm
                  </Text>
                  <Text style={{ fontFamily, fontSize: "11px", lineHeight: "18px", color: colors.foreground, margin: 0 }}>
                    Diese Email wurde automatisch versendet.
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Container>
      </Body>
    </Html>
  );
}