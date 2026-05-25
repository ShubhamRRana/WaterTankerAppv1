import { Section, Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { WtaLayout } from "./wta-layout.tsx";

export interface OtpEmailProps {
  preview: string;
  heading: string;
  bodyText: string;
  otp: string;
}

export function OtpEmail({ preview, heading, bodyText, otp }: OtpEmailProps) {
  return (
    <WtaLayout preview={preview} heading={heading}>
      <Text style={text}>{bodyText}</Text>
      <Section style={codeSection}>
        <Text style={code}>{otp}</Text>
      </Section>
      <Text style={hint}>This code expires shortly. Do not share it with anyone.</Text>
    </WtaLayout>
  );
}

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const codeSection = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const code = {
  display: "inline-block",
  padding: "16px 32px",
  backgroundColor: "#f4f7fb",
  borderRadius: "8px",
  border: "1px solid #e8ecf0",
  color: "#1a1a2e",
  fontSize: "28px",
  fontWeight: "700" as const,
  letterSpacing: "0.2em",
  margin: "0",
};

const hint = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0",
};
