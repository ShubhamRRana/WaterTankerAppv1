import { Link, Section, Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { BaseLayout, buttonStyle, paragraph } from "./base-layout.tsx";

export interface AuthActionEmailProps {
  preview: string;
  title: string;
  body: string;
  buttonLabel: string;
  confirmationUrl: string;
}

export function AuthActionEmail({
  preview,
  title,
  body,
  buttonLabel,
  confirmationUrl,
}: AuthActionEmailProps) {
  return (
    <BaseLayout preview={preview} title={title}>
      <Text style={paragraph}>{body}</Text>
      <Section style={{ textAlign: "center" as const, margin: "32px 0" }}>
        <Link href={confirmationUrl} style={buttonStyle}>
          {buttonLabel}
        </Link>
      </Section>
      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={{ ...paragraph, fontSize: "12px", wordBreak: "break-all" as const }}>
        {confirmationUrl}
      </Text>
    </BaseLayout>
  );
}

export default AuthActionEmail;
