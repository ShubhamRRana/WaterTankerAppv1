/**
 * Pending email verification screen
 */

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PendingEmailVerificationScreen from '../../../screens/auth/PendingEmailVerificationScreen';
import { VERIFY_EMAIL_MESSAGES } from '../../../constants/config';
import { renderWithProviders } from '../../renderWithProviders';

const mockResend = jest.fn().mockResolvedValue({ error: null });

jest.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resend: (...args: unknown[]) => mockResend(...args),
    },
  },
}));

describe('PendingEmailVerificationScreen', () => {
  const navigation = { navigate: jest.fn(), replace: jest.fn() };
  const baseRoute = {
    key: 'k',
    name: 'PendingEmailVerification' as const,
    params: { email: 'test@example.com', preferredRole: 'admin' as const },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResend.mockResolvedValue({ error: null });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to Login with initialEmail and preferredRole', () => {
    const { getByText } = renderWithProviders(
      <PendingEmailVerificationScreen
        navigation={navigation as never}
        route={baseRoute as never}
      />
    );
    fireEvent.press(getByText(VERIFY_EMAIL_MESSAGES.continueToSignIn));
    expect(navigation.navigate).toHaveBeenCalledWith('Login', {
      preferredRole: 'admin',
      initialEmail: 'test@example.com',
    });
  });

  it('calls resend and applies cooldown label after success', async () => {
    const { getByText } = renderWithProviders(
      <PendingEmailVerificationScreen
        navigation={navigation as never}
        route={baseRoute as never}
      />
    );
    fireEvent.press(getByText(VERIFY_EMAIL_MESSAGES.resend));
    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      });
    });
    expect(getByText(VERIFY_EMAIL_MESSAGES.resendCooldown(60))).toBeTruthy();
  });
});
