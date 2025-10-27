// Location service for handling maps and distance calculations
// Using Haversine formula for distance calculation in MVP

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration?: number; // in minutes (if available)
}

export class LocationService {
  // Calculate distance between two points using Haversine formula
  static calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get current location using device GPS
  static async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }

  // Reverse geocoding - get address from coordinates
  static async getAddressFromCoordinates(location: Location): Promise<string> {
    try {
      // This would typically use Google Maps Geocoding API
      // For MVP, we'll return a placeholder
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    } catch (error) {
      throw new Error('Failed to get address from coordinates');
    }
  }

  // Get coordinates from address (geocoding)
  static async getCoordinatesFromAddress(address: string): Promise<Location> {
    try {
      // This would typically use Google Maps Geocoding API
      // For MVP, we'll return a placeholder
      throw new Error('Address geocoding not implemented in MVP');
    } catch (error) {
      throw new Error('Failed to get coordinates from address');
    }
  }

  // Calculate estimated delivery time based on distance
  static calculateEstimatedDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }

  // Validate if location is within service area
  static isWithinServiceArea(location: Location): boolean {
    // Define service area boundaries (example: within 50km of city center)
    const serviceCenter: Location = {
      latitude: 28.6139, // Delhi coordinates as example
      longitude: 77.2090,
    };
    
    const distance = this.calculateDistance(location, serviceCenter);
    return distance <= 50; // 50km radius
  }
}
