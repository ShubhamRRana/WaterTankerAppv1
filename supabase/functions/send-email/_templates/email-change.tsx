import { Link, Section, Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { BaseLayout, buttonStyle, paragraph } from "./base-layout.tsx";

export interface EmailChangeEmailProps {
  preview: string;
  title: string;
  body: string;
  confirmCurrentUrl: string;
  confirmNewUrl?: string | null;
}

export function EmailChangeEmail({
  preview,
  title,
  body,
  confirmCurrentUrl,
  confirmNewUrl,
}: EmailChangeEmailProps) {
  return (
    <BaseLayout preview={preview} title={title}>
      <Text style={paragraph}>{body}</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Link href={confirmCurrentUrl} style={buttonStyle}>
          Confirm email change
        </Link>
      </Section>
      {confirmNewUrl ? (
        <>
          <Text style={paragraph}>
            If you are confirming a new address, use this link:
          </Text>
          <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <Link href={confirmNewUrl} style={buttonStyle}>
              Confirm new email address
            </Link>
          </Section>
        </>
      ) : null}
    </BaseLayout>
  );
}

export default EmailChangeEmail;
