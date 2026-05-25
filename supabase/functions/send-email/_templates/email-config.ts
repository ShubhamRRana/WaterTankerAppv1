export interface ConfirmationEmailContent {
  subject: string;
  preview: string;
  heading: string;
  bodyText: string;
  ctaLabel: string;
}

export const CONFIRMATION_EMAILS: Record<string, ConfirmationEmailContent> = {
  signup: {
    subject: "Confirm your WTA account",
    preview: "Confirm your email to finish signing up",
    heading: "Confirm your email",
    bodyText:
      "Thanks for signing up for WTA. Tap the button below to verify your email address and activate your account.",
    ctaLabel: "Confirm email",
  },
  recovery: {
    subject: "Reset your WTA password",
    preview: "Reset your password",
    heading: "Reset your password",
    bodyText:
      "We received a request to reset your password. Use the button below to choose a new password.",
    ctaLabel: "Reset password",
  },
  magiclink: {
    subject: "Your WTA sign-in link",
    preview: "Sign in to WTA",
    heading: "Sign in to WTA",
    bodyText: "Use the button below to sign in. This link can only be used once.",
    ctaLabel: "Sign in",
  },
  invite: {
    subject: "You are invited to WTA",
    preview: "Accept your invitation",
    heading: "Accept your invitation",
    bodyText:
      "You have been invited to join WTA. Tap the button below to accept the invitation and set up your account.",
    ctaLabel: "Accept invitation",
  },
  email: {
    subject: "Your WTA verification link",
    preview: "Verify your email",
    heading: "Verify your email",
    bodyText: "Use the button below to verify your email address.",
    ctaLabel: "Verify email",
  },
  email_change: {
    subject: "Confirm your new WTA email",
    preview: "Confirm your email change",
    heading: "Confirm email change",
    bodyText:
      "We received a request to change the email on your account. Confirm this change using the button below.",
    ctaLabel: "Confirm email change",
  },
};

export const NOTIFICATION_EMAILS: Record<
  string,
  { subject: string; preview: string; heading: string; bodyText: string }
> = {
  password_changed_notification: {
    subject: "Your WTA password was changed",
    preview: "Password changed",
    heading: "Password changed",
    bodyText:
      "The password for your WTA account was recently changed. If you did not make this change, contact support immediately.",
  },
  email_changed_notification: {
    subject: "Your WTA email was changed",
    preview: "Email changed",
    heading: "Email address changed",
    bodyText:
      "The email address on your WTA account was recently updated. If you did not make this change, contact support immediately.",
  },
  phone_changed_notification: {
    subject: "Your WTA phone number was changed",
    preview: "Phone changed",
    heading: "Phone number changed",
    bodyText:
      "The phone number on your WTA account was recently updated. If you did not make this change, contact support immediately.",
  },
  identity_linked_notification: {
    subject: "A sign-in method was linked to WTA",
    preview: "Sign-in method linked",
    heading: "Sign-in method linked",
    bodyText:
      "A new sign-in method was linked to your WTA account. If you did not do this, contact support.",
  },
  identity_unlinked_notification: {
    subject: "A sign-in method was removed from WTA",
    preview: "Sign-in method removed",
    heading: "Sign-in method removed",
    bodyText:
      "A sign-in method was removed from your WTA account. If you did not do this, contact support.",
  },
  mfa_factor_enrolled_notification: {
    subject: "Two-factor authentication enabled on WTA",
    preview: "2FA enabled",
    heading: "Two-factor authentication enabled",
    bodyText:
      "Two-factor authentication was enabled on your WTA account. If you did not set this up, contact support.",
  },
  mfa_factor_unenrolled_notification: {
    subject: "Two-factor authentication disabled on WTA",
    preview: "2FA disabled",
    heading: "Two-factor authentication disabled",
    bodyText:
      "Two-factor authentication was disabled on your WTA account. If you did not make this change, contact support.",
  },
};

export const REAUTH_EMAIL = {
  subject: "Your WTA verification code",
  preview: "Your verification code",
  heading: "Verification code",
  bodyText: "Enter this code in the app to continue:",
};
