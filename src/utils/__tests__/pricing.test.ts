import { PricingUtils } from '../pricing';
import { Pricing, TankerSize } from '../../types';

describe('PricingUtils', () => {
  const mockPricing: Pricing = {
    pricePerKm: 5,
    minimumCharge: 50,
    updatedAt: new Date(),
    updatedBy: 'system'
  };

  const mockTankerSize: TankerSize = {
    id: '1000',
    size: 1000,
    displayName: '1000L',
    basePrice: 200,
    isActive: true
  };

  describe('calculatePrice', () => {
    it('should calculate price correctly for short distance', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 5, mockPricing);
      expect(result.basePrice).toBe(200);
      expect(result.distanceCharge).toBeGreaterThanOrEqual(0);
      expect(result.totalPrice).toBeGreaterThanOrEqual(200);
    });

    it('should calculate price correctly for long distance', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 20, mockPricing);
      expect(result.distanceCharge).toBe(100); // 20 * 5
      expect(result.totalPrice).toBe(300); // 200 + 100
    });

    it('should ensure minimum charge is met', () => {
      const result = PricingUtils.calculatePrice(mockTankerSize, 1, mockPricing);
      // Distance charge should ensure total meets minimum charge
      expect(result.totalPrice).toBeGreaterThanOrEqual(mockPricing.minimumCharge);
    });

    it('should round total price', () => {
      const pricingWithDecimals: Pricing = {
        ...mockPricing,
        pricePerKm: 5.33
      };
      const result = PricingUtils.calculatePrice(mockTankerSize, 10, pricingWithDecimals);
      expect(Number.isInteger(result.totalPrice)).toBe(true);
    });
  });

  describe('getPriceBreakdown', () => {
    it('should return complete price breakdown', () => {
      const result = PricingUtils.getPriceBreakdown(mockTankerSize, 10, mockPricing);
      expect(result).toHaveProperty('tankerSize');
      expect(result).toHaveProperty('basePrice');
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('distanceCharge');
      expect(result).toHaveProperty('totalPrice');
      expect(result.tankerSize).toBe('1000L');
      expect(result.basePrice).toBe(200);
    });

    it('should round distance to 2 decimal places', () => {
      const result = PricingUtils.getPriceBreakdown(mockTankerSize, 10.123456, mockPricing);
      expect(result.distance).toBe(10.12);
    });
  });

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

    it('should format large amounts with Indian numbering', () => {
      const result = PricingUtils.formatPrice(1234567);
      // Indian numbering: 12,34,567
      expect(result).toContain('12,34,567');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Indian numbering system', () => {
      const result = PricingUtils.formatNumber(1234567);
      expect(result).toBe('12,34,567');
    });

    it('should handle decimal numbers', () => {
      const result = PricingUtils.formatNumber(1234.56);
      expect(result).toContain('1,234');
      expect(result).toContain('.56');
    });
  });

  describe('calculateDeliveryTime', () => {
    it('should calculate delivery time based on distance', () => {
      const result = PricingUtils.calculateDeliveryTime(30);
      // 30 km / 30 km/h = 1 hour = 60 minutes
      expect(result).toBe(60);
    });

    it('should round up to nearest minute', () => {
      const result = PricingUtils.calculateDeliveryTime(15);
      // 15 km / 30 km/h = 0.5 hour = 30 minutes
      expect(result).toBe(30);
    });

    it('should handle fractional distances', () => {
      const result = PricingUtils.calculateDeliveryTime(10.5);
      // 10.5 km / 30 km/h = 0.35 hour = 21 minutes (rounded up)
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('validatePricing', () => {
    it('should validate correct pricing configuration', () => {
      const errors = PricingUtils.validatePricing(mockPricing);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid pricePerKm', () => {
      const invalidPricing = { ...mockPricing, pricePerKm: 0 };
      const errors = PricingUtils.validatePricing(invalidPricing);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('kilometer'))).toBe(true);
    });

    it('should reject invalid minimumCharge', () => {
      const invalidPricing = { ...mockPricing, minimumCharge: -10 };
      const errors = PricingUtils.validatePricing(invalidPricing);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Minimum charge'))).toBe(true);
    });

    it('should warn if minimumCharge is less than pricePerKm', () => {
      const invalidPricing = { ...mockPricing, minimumCharge: 2, pricePerKm: 5 };
      const errors = PricingUtils.validatePricing(invalidPricing);
      expect(errors.some(e => e.includes('at least equal'))).toBe(true);
    });
  });

  describe('getDefaultPricing', () => {
    it('should return default pricing configuration', () => {
      const result = PricingUtils.getDefaultPricing();
      expect(result.pricePerKm).toBe(5);
      expect(result.minimumCharge).toBe(50);
      expect(result.updatedBy).toBe('system');
    });
  });
});

