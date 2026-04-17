/**
 * Pricing Utilities Tests
 */

import { PricingUtils } from '../../utils/pricing';

describe('PricingUtils', () => {
  describe('formatPrice', () => {
    it('should format price with Indian numbering system', () => {
      const result = PricingUtils.formatPrice(1234567);
      
      expect(result).toContain('₹');
      expect(result).toContain(',');
    });

    it('should format small amounts correctly', () => {
      const result = PricingUtils.formatPrice(500);
      expect(result).toBe('₹500');
    });

    it('should format amounts with thousands correctly', () => {
      const result = PricingUtils.formatPrice(5000);
      expect(result).toBe('₹5,000');
    });

    it('should format amounts with lakhs correctly', () => {
      const result = PricingUtils.formatPrice(123456);
      // Indian numbering: 1,23,456
      expect(result).toContain('1,23,456');
    });

    it('should handle decimal amounts', () => {
      const result = PricingUtils.formatPrice(1234.56);
      expect(result).toContain('₹');
      expect(result).toContain('1,234');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Indian numbering system', () => {
      const result = PricingUtils.formatNumber(1234567);
      
      expect(result).toContain(',');
      expect(result).not.toContain('₹');
    });

    it('should format small numbers correctly', () => {
      const result = PricingUtils.formatNumber(500);
      expect(result).toBe('500');
    });

    it('should format numbers with thousands correctly', () => {
      const result = PricingUtils.formatNumber(5000);
      expect(result).toBe('5,000');
    });
  });

  describe('calculateDeliveryTime', () => {
    it('should calculate delivery time based on distance', () => {
      const result = PricingUtils.calculateDeliveryTime(30);
      
      // At 30 km/h average speed, 30 km = 1 hour = 60 minutes
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should round up to nearest minute', () => {
      const result = PricingUtils.calculateDeliveryTime(15);
      
      // 15 km at 30 km/h = 0.5 hours = 30 minutes, should round up
      expect(result).toBeGreaterThanOrEqual(30);
    });

    it('should handle very short distances', () => {
      const result = PricingUtils.calculateDeliveryTime(1);
      
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should handle long distances', () => {
      const result = PricingUtils.calculateDeliveryTime(100);
      
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});

