import { Button, Section, Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { WtaLayout } from "./wta-layout.tsx";

export interface ConfirmationEmailProps {
  preview: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
  confirmationUrl: string;
}

export function ConfirmationEmail({
  preview,
  heading,
  bodyText,
  ctaLabel,
  confirmationUrl,
}: ConfirmationEmailProps) {
  return (
    <WtaLayout preview={preview} heading={heading}>
      <Text style={text}>{bodyText}</Text>
      <Section style={buttonSection}>
        <Button style={button} href={confirmationUrl}>
          {ctaLabel}
        </Button>
      </Section>
      <Text style={hint}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkText}>{confirmationUrl}</Text>
    </WtaLayout>
  );
}

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const buttonSection = {
  margin: "24px 0",
};

const button = {
  backgroundColor: "#1565c0",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const hint = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "16px 0 4px",
};

const linkText = {
  color: "#1565c0",
  fontSize: "12px",
  wordBreak: "break-all" as const,
  margin: "0",
};
