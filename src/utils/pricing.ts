// Pricing utility functions

import { Pricing, TankerSize } from '../types';

export class PricingUtils {
  // Calculate total price based on tanker size, distance, and pricing rules
  static calculatePrice(
    tankerSize: TankerSize,
    distance: number,
    pricing: Pricing
  ): { basePrice: number; distanceCharge: number; totalPrice: number } {
    const basePrice = tankerSize.basePrice;
    const distanceCharge = Math.max(
      distance * pricing.pricePerKm,
      pricing.minimumCharge - basePrice
    );
    const totalPrice = basePrice + distanceCharge;

    return {
      basePrice,
      distanceCharge,
      totalPrice: Math.round(totalPrice),
    };
  }

  // Get price breakdown for display
  static getPriceBreakdown(
    tankerSize: TankerSize,
    distance: number,
    pricing: Pricing
  ): {
    tankerSize: string;
    basePrice: number;
    distance: number;
    distanceCharge: number;
    totalPrice: number;
  } {
    const price = this.calculatePrice(tankerSize, distance, pricing);
    
    return {
      tankerSize: tankerSize.displayName,
      basePrice: price.basePrice,
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      distanceCharge: price.distanceCharge,
      totalPrice: price.totalPrice,
    };
  }

  // Format price for display
  static formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Calculate estimated delivery time based on distance
  static calculateDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }

  // Validate pricing configuration
  static validatePricing(pricing: Partial<Pricing>): string[] {
    const errors: string[] = [];

    if (!pricing.pricePerKm || pricing.pricePerKm <= 0) {
      errors.push('Price per kilometer must be greater than 0');
    }

    if (!pricing.minimumCharge || pricing.minimumCharge <= 0) {
      errors.push('Minimum charge must be greater than 0');
    }

    if (pricing.minimumCharge && pricing.pricePerKm && pricing.minimumCharge < pricing.pricePerKm) {
      errors.push('Minimum charge should be at least equal to price per kilometer');
    }

    return errors;
  }

  // Get default pricing configuration
  static getDefaultPricing(): Pricing {
    return {
      pricePerKm: 5, // ₹5 per km
      minimumCharge: 50, // ₹50 minimum charge
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }
}
