import { ValidationUtils } from '../validation';

describe('ValidationUtils', () => {
  describe('validatePhone', () => {
    it('should validate a valid 10-digit Indian phone number', () => {
      const result = ValidationUtils.validatePhone('9876543210');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject phone numbers with less than 10 digits', () => {
      const result = ValidationUtils.validatePhone('987654321');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });

    it('should reject phone numbers with more than 10 digits', () => {
      const result = ValidationUtils.validatePhone('98765432101');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10 digits');
    });

    it('should reject phone numbers not starting with 6-9', () => {
      const result = ValidationUtils.validatePhone('5876543210');
      expect(result.isValid).toBe(false);
    });

    it('should accept phone numbers with spaces and dashes (cleaned)', () => {
      const result = ValidationUtils.validatePhone('98765 43210');
      expect(result.isValid).toBe(true);
    });

    it('should require phone when required=true', () => {
      const result = ValidationUtils.validatePhone('', true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty phone when required=false', () => {
      const result = ValidationUtils.validatePhone('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate a password with minimum length', () => {
      const result = ValidationUtils.validatePassword('password123');
      expect(result.isValid).toBe(true);
    });

    it('should reject passwords shorter than minimum length', () => {
      const result = ValidationUtils.validatePassword('pass');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject passwords longer than maximum length', () => {
      const longPassword = 'a'.repeat(101);
      const result = ValidationUtils.validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than');
    });

    it('should require password when required=true', () => {
      const result = ValidationUtils.validatePassword('', true);
      expect(result.isValid).toBe(false);
    });

    it('should allow empty password when required=false', () => {
      const result = ValidationUtils.validatePassword('', false);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate a valid email address', () => {
      const result = ValidationUtils.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      const result = ValidationUtils.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
    });

    it('should allow empty email (optional)', () => {
      const result = ValidationUtils.validateEmail('');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateName', () => {
    it('should validate a valid name', () => {
      const result = ValidationUtils.validateName('John Doe');
      expect(result.isValid).toBe(true);
    });

    it('should reject names shorter than minimum length', () => {
      const result = ValidationUtils.validateName('Jo');
      expect(result.isValid).toBe(false);
    });

    it('should reject names with numbers or special characters', () => {
      const result = ValidationUtils.validateName('John123');
      expect(result.isValid).toBe(false);
    });

    it('should allow names with spaces and hyphens', () => {
      const result = ValidationUtils.validateName('Mary-Jane Smith');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validatePincode', () => {
    it('should validate a valid 6-digit pincode', () => {
      const result = ValidationUtils.validatePincode('110001');
      expect(result.isValid).toBe(true);
    });

    it('should reject pincodes with less than 6 digits', () => {
      const result = ValidationUtils.validatePincode('11000');
      expect(result.isValid).toBe(false);
    });

    it('should reject pincodes with non-digits', () => {
      const result = ValidationUtils.validatePincode('11000A');
      expect(result.isValid).toBe(false);
    });

    it('should require pincode', () => {
      const result = ValidationUtils.validatePincode('');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateDateString', () => {
    it('should validate a valid future date in DD-MM-YYYY format', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = `${String(tomorrow.getDate()).padStart(2, '0')}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${tomorrow.getFullYear()}`;
      const result = ValidationUtils.validateDateString(dateStr);
      expect(result.isValid).toBe(true);
    });

    it('should reject past dates', () => {
      const result = ValidationUtils.validateDateString('01-01-2020');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should reject dates more than 30 days in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 31);
      const dateStr = `${String(futureDate.getDate()).padStart(2, '0')}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${futureDate.getFullYear()}`;
      const result = ValidationUtils.validateDateString(dateStr);
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid date formats', () => {
      const result = ValidationUtils.validateDateString('2024-01-01');
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid dates like 32-13-2024', () => {
      const result = ValidationUtils.validateDateString('32-13-2024');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTimeString', () => {
    it('should validate a valid time in HH:MM format', () => {
      const result = ValidationUtils.validateTimeString('10:30');
      expect(result.isValid).toBe(true);
    });

    it('should reject times with invalid hours (outside 1-12)', () => {
      const result = ValidationUtils.validateTimeString('13:30');
      expect(result.isValid).toBe(false);
    });

    it('should reject times with invalid minutes (outside 0-59)', () => {
      const result = ValidationUtils.validateTimeString('10:60');
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid time formats', () => {
      const result = ValidationUtils.validateTimeString('10.30');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate a valid positive amount', () => {
      const result = ValidationUtils.validateAmount(100);
      expect(result.isValid).toBe(true);
    });

    it('should validate a valid amount string', () => {
      const result = ValidationUtils.validateAmount('500.50');
      expect(result.isValid).toBe(true);
    });

    it('should reject negative amounts', () => {
      const result = ValidationUtils.validateAmount(-100);
      expect(result.isValid).toBe(false);
    });

    it('should reject amounts exceeding maximum', () => {
      const result = ValidationUtils.validateAmount(2000000);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateConfirmPassword', () => {
    it('should validate matching passwords', () => {
      const result = ValidationUtils.validateConfirmPassword('password123', 'password123');
      expect(result.isValid).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      const result = ValidationUtils.validateConfirmPassword('password123', 'password456');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('match');
    });
  });
});

