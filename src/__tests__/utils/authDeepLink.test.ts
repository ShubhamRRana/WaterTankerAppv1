import {
  parseRecoveryTokensFromUrl,
  getPasswordResetRedirectUrl,
} from '../../utils/authDeepLink';

describe('authDeepLink', () => {
  describe('parseRecoveryTokensFromUrl', () => {
    it('should parse valid recovery tokens from URL hash', () => {
      const url =
        'wta://reset-password#access_token=abc123&refresh_token=def456&type=recovery';

      const result = parseRecoveryTokensFromUrl(url);

      expect(result).toEqual({
        access_token: 'abc123',
        refresh_token: 'def456',
      });
    });

    it('should return null when hash is missing', () => {
      expect(parseRecoveryTokensFromUrl('wta://reset-password')).toBeNull();
    });

    it('should return null when type is not recovery', () => {
      const url =
        'wta://reset-password#access_token=abc&refresh_token=def&type=signup';

      expect(parseRecoveryTokensFromUrl(url)).toBeNull();
    });

    it('should return null when tokens are missing', () => {
      const url = 'wta://reset-password#type=recovery';

      expect(parseRecoveryTokensFromUrl(url)).toBeNull();
    });
  });

  describe('getPasswordResetRedirectUrl', () => {
    const original = process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL;
      } else {
        process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL = original;
      }
    });

    it('should use env var when set', () => {
      process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL = 'wta://custom-reset';
      expect(getPasswordResetRedirectUrl()).toBe('wta://custom-reset');
    });

    it('should fall back to default scheme URL', () => {
      delete process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL;
      expect(getPasswordResetRedirectUrl()).toBe('wta://reset-password');
    });
  });
});
