export class PricingUtils {
  // Format number according to Indian numbering system (groups: last 3 digits, then groups of 2)
  // Example: 1234567 -> 12,34,567
  private static formatIndianNumber(num: number): string {
    const numStr = num.toString();
    const parts = numStr.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '';

    // Indian numbering: first 3 digits from right, then groups of 2
    if (integerPart.length <= 3) {
      return integerPart + (decimalPart ? '.' + decimalPart : '');
    }

    // Get last 3 digits
    let result = integerPart.slice(-3);
    integerPart = integerPart.slice(0, -3);

    // Process remaining digits in groups of 2
    while (integerPart.length > 0) {
      const group = integerPart.slice(-2);
      result = group + ',' + result;
      integerPart = integerPart.slice(0, -2);
    }

    return result + (decimalPart ? '.' + decimalPart : '');
  }

  // Format price for display (Indian numbering system)
  static formatPrice(amount: number): string {
    const formatted = this.formatIndianNumber(amount);
    return `₹${formatted}`;
  }

  // Format number according to Indian numbering system (for quantities)
  static formatNumber(num: number): string {
    return this.formatIndianNumber(num);
  }

  // Calculate estimated delivery time based on distance
  static calculateDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }
}
