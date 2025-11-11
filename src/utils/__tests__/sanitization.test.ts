import { SanitizationUtils } from '../sanitization';

describe('SanitizationUtils', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });

    it('should remove HTML tags', () => {
      const input = '<div>Hello</div>World';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = SanitizationUtils.sanitizeString(input);
      expect(result).toBe('Hello World');
    });

    it('should return empty string for non-string input', () => {
      const result = SanitizationUtils.sanitizeString(null as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should keep only digits', () => {
      const input = '+91 98765-43210';
      const result = SanitizationUtils.sanitizePhone(input);
      expect(result).toBe('919876543210');
    });

    it('should handle phone with spaces', () => {
      const input = '98765 43210';
      const result = SanitizationUtils.sanitizePhone(input);
      expect(result).toBe('9876543210');
    });

    it('should return empty string for non-string input', () => {
      const result = SanitizationUtils.sanitizePhone(null as any);
      expect(result).toBe('');
    });
  });

  describe('sanitizeName', () => {
    it('should keep letters, spaces, hyphens, and apostrophes', () => {
      const input = "Mary-Jane O'Brien";
      const result = SanitizationUtils.sanitizeName(input);
      expect(result).toBe("Mary-Jane O'Brien");
    });

    it('should remove numbers and special characters', () => {
      const input = 'John123@Doe';
      const result = SanitizationUtils.sanitizeName(input);
      expect(result).toBe('JohnDoe');
    });

    it('should remove multiple consecutive spaces', () => {
      const input = 'John    Doe';
      const result = SanitizationUtils.sanitizeName(input);
      expect(result).toBe('John Doe');
    });
  });

  describe('sanitizeEmail', () => {
    it('should convert to lowercase', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = SanitizationUtils.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should remove dangerous characters', () => {
      const input = 'test<script>@example.com';
      const result = SanitizationUtils.sanitizeEmail(input);
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const input = '  test@example.com  ';
      const result = SanitizationUtils.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizeAddress', () => {
    it('should keep alphanumeric and common address characters', () => {
      const input = '123 Main St., Apt #4';
      const result = SanitizationUtils.sanitizeAddress(input);
      expect(result).toBe('123 Main St., Apt #4');
    });

    it('should remove dangerous characters', () => {
      const input = '123 Main St<script>';
      const result = SanitizationUtils.sanitizeAddress(input);
      expect(result).not.toContain('<script>');
    });

    it('should remove multiple consecutive spaces', () => {
      const input = '123    Main    St';
      const result = SanitizationUtils.sanitizeAddress(input);
      expect(result).toBe('123 Main St');
    });
  });

  describe('sanitizeNumber', () => {
    it('should keep only digits and decimal point', () => {
      const input = '123.45';
      const result = SanitizationUtils.sanitizeNumber(input);
      expect(result).toBe('123.45');
    });

    it('should remove non-numeric characters', () => {
      const input = '123abc.45def';
      const result = SanitizationUtils.sanitizeNumber(input);
      expect(result).toBe('123.45');
    });

    it('should ensure only one decimal point', () => {
      const input = '123.45.67';
      const result = SanitizationUtils.sanitizeNumber(input);
      expect(result).toBe('123.4567');
    });
  });

  describe('sanitizeVehicleNumber', () => {
    it('should convert to uppercase', () => {
      const input = 'dl01ab1234';
      const result = SanitizationUtils.sanitizeVehicleNumber(input);
      expect(result).toBe('DL01AB1234');
    });

    it('should keep only letters and numbers', () => {
      const input = 'DL-01 AB-1234';
      const result = SanitizationUtils.sanitizeVehicleNumber(input);
      expect(result).toBe('DL01AB1234');
    });
  });

  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello<script>alert("xss")</script>World';
      const result = SanitizationUtils.sanitizeText(input);
      expect(result).not.toContain('<script>');
    });

    it('should limit length to maxLength', () => {
      const input = 'a'.repeat(2000);
      const result = SanitizationUtils.sanitizeText(input, 1000);
      expect(result.length).toBe(1000);
    });

    it('should preserve text content', () => {
      const input = 'This is a test message';
      const result = SanitizationUtils.sanitizeText(input);
      expect(result).toBe('This is a test message');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: '  TEST@EXAMPLE.COM  ',
        age: 30
      };
      const result = SanitizationUtils.sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(30);
    });

    it('should use custom sanitizers when provided', () => {
      const input = {
        phone: '+91 98765-43210',
        name: 'John Doe'
      };
      const sanitizers = {
        phone: (val: string) => val.replace(/\D/g, '')
      };
      const result = SanitizationUtils.sanitizeObject(input, sanitizers);
      expect(result.phone).toBe('919876543210');
      expect(result.name).toBe('John Doe');
    });
  });
});

