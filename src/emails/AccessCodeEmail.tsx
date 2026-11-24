import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, colors, fontFamily } from "./EmailLayout";

export function AccessCodeEmail({ token = "123456" }: { token?: string }) {
  return (
    <EmailLayout preview={`Ihr Zugangscode: ${token}`}>
      <Text style={{ color: colors.foreground, fontSize: "20px", fontWeight: 700, margin: "0 0 12px 0" }}>
        Ihr Zugangscode
      </Text>
      <Text style={{ color: colors.bodyText, fontSize: "14px", lineHeight: "22px", margin: "0 0 24px 0" }}>
        Geben Sie diesen Code auf{" "}
        <a href="https://onboarding.unitex.de" style={{ color: colors.primary, textDecoration: "underline", fontWeight: 700 }}>
          onboarding.unitex.de
        </a>{" "}
        ein, um sich anzumelden:
      </Text>

      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "0 0 24px 0" }}>
        <tbody>
          <tr>
            <td align="center" style={{ backgroundColor: colors.footerBg, padding: "20px 0" }}>
              <Text style={{ fontFamily, fontSize: "30px", fontWeight: 700, letterSpacing: "6px", color: "#FFFFFF", margin: 0 }}>
                {token}
              </Text>
            </td>
          </tr>
        </tbody>
      </table>

      <Text style={{ color: colors.muted, fontSize: "13px", lineHeight: "20px", margin: 0, textAlign: "center" as const }}>
        Der Code ist 1 Stunde gültig.
      </Text>
    </EmailLayout>
  );
}

export default function Preview() {
  return <AccessCodeEmail token="{{ .Token }}" />;
}