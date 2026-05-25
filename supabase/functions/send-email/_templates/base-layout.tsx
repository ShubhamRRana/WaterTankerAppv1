import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

export interface BaseLayoutProps {
  preview: string;
  title: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, title, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brandHeading}>WTA</Heading>
          <Heading style={h1}>{title}</Heading>
          {children}
          <Section style={footerSection}>
            <Text style={footerText}>
              If you did not request this email, you can safely ignore it.
            </Text>
            <Text style={footerText}>Water Tanker App (WTA)</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export const paragraph = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

export const codeStyle = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  color: "#0f172a",
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: "28px",
  fontWeight: "700" as const,
  letterSpacing: "4px",
  padding: "16px 24px",
};

const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  margin: "40px auto",
  maxWidth: "560px",
  padding: "32px 24px",
};

const brandHeading = {
  color: "#2563eb",
  fontSize: "14px",
  fontWeight: "700" as const,
  letterSpacing: "2px",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
};

const h1 = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "700" as const,
  lineHeight: "32px",
  margin: "0 0 24px",
};

const footerSection = {
  borderTop: "1px solid #e2e8f0",
  marginTop: "32px",
  paddingTop: "16px",
};

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "4px 0",
};
