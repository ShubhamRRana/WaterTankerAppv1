import { Section, Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { BaseLayout, codeStyle, paragraph } from "./base-layout.tsx";

export interface OtpEmailProps {
  preview: string;
  title: string;
  body: string;
  token: string;
}

export function OtpEmail({ preview, title, body, token }: OtpEmailProps) {
  return (
    <BaseLayout preview={preview} title={title}>
      <Text style={paragraph}>{body}</Text>
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Text style={codeStyle}>{token}</Text>
      </Section>
      <Text style={paragraph}>This code expires shortly.</Text>
    </BaseLayout>
  );
}

export default OtpEmail;
