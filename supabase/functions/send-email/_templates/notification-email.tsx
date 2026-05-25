import { Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { WtaLayout } from "./wta-layout.tsx";

export interface NotificationEmailProps {
  preview: string;
  heading: string;
  bodyText: string;
}

export function NotificationEmail({
  preview,
  heading,
  bodyText,
}: NotificationEmailProps) {
  return (
    <WtaLayout preview={preview} heading={heading}>
      <Text style={text}>{bodyText}</Text>
    </WtaLayout>
  );
}

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
};
