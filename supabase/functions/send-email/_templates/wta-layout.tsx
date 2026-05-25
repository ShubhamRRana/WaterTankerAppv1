import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

const APP_NAME = "WTA";

export interface WtaLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

export function WtaLayout({ preview, heading, children }: WtaLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>{APP_NAME}</Text>
          <Heading style={h1}>{heading}</Heading>
          {children}
          <Section style={footerSection}>
            <Text style={footer}>
              If you did not request this email, you can safely ignore it.
            </Text>
            <Text style={footer}>— {APP_NAME} Water Tanker</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f7fb",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
};

const brand = {
  color: "#1565c0",
  fontSize: "14px",
  fontWeight: "700" as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: "0 0 8px",
};

const h1 = {
  color: "#1a1a2e",
  fontSize: "22px",
  fontWeight: "600" as const,
  margin: "0 0 24px",
  padding: "0",
};

const footerSection = {
  marginTop: "32px",
  borderTop: "1px solid #e8ecf0",
  paddingTop: "16px",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "4px 0",
};
