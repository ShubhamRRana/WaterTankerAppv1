// Distance calculation utilities using Haversine formula

export interface Location {
  latitude: number;
  longitude: number;
}

export class DistanceUtils {
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

  // Calculate estimated delivery time based on distance
  static calculateDeliveryTime(distance: number): number {
    // Assuming average speed of 30 km/h in city traffic
    const averageSpeed = 30; // km/h
    const timeInHours = distance / averageSpeed;
    return Math.ceil(timeInHours * 60); // Convert to minutes and round up
  }

  // Format distance for display
  static formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  // Format time for display
  static formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  // Validate if location is within service area
  static isWithinServiceArea(
    location: Location,
    serviceCenter: Location = { latitude: 28.6139, longitude: 77.2090 }, // Delhi coordinates
    maxDistance: number = 50 // 50km radius
  ): boolean {
    const distance = this.calculateDistance(location, serviceCenter);
    return distance <= maxDistance;
  }

  // Get service area boundary
  static getServiceAreaBoundary(
    center: Location,
    radius: number
  ): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const latRange = radius / 111; // Approximate km per degree latitude
    const lonRange = radius / (111 * Math.cos(this.toRadians(center.latitude))); // Adjust for longitude

    return {
      north: center.latitude + latRange,
      south: center.latitude - latRange,
      east: center.longitude + lonRange,
      west: center.longitude - lonRange,
    };
  }

  // Calculate route distance (simplified - would use Google Maps API in production)
  static calculateRouteDistance(
    origin: Location,
    destination: Location,
    waypoints?: Location[]
  ): number {
    // For MVP, we'll use straight-line distance
    // In production, this would use Google Maps Distance Matrix API
    let totalDistance = this.calculateDistance(origin, destination);
    
    if (waypoints && waypoints.length > 0) {
      // Add waypoint distances (simplified calculation)
      totalDistance += waypoints.length * 2; // Assume 2km per waypoint
    }
    
    return totalDistance;
  }
}
