import { Text } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { BaseLayout, paragraph } from "./base-layout.tsx";

export interface NotificationEmailProps {
  preview: string;
  title: string;
  body: string;
}

export function NotificationEmail({ preview, title, body }: NotificationEmailProps) {
  return (
    <BaseLayout preview={preview} title={title}>
      <Text style={paragraph}>{body}</Text>
    </BaseLayout>
  );
}

export default NotificationEmail;
