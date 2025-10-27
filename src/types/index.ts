// Core types for the Water Tanker Booking App

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface User {
  uid: string;
  role: 'customer' | 'driver' | 'admin';
  phone: string;
  password: string; // hashed
  name: string;
  email?: string;
  profileImage?: string;
  createdAt: Date;
  
  // Customer specific
  savedAddresses?: Address[];
  
  // Driver specific
  vehicleNumber?: string;
  licenseNumber?: string;
  driverLicenseImage?: string;
  vehicleRegistrationImage?: string;
  isApproved?: boolean;
  isAvailable?: boolean;
  totalEarnings?: number;
  completedOrders?: number;
}

// Extended user interface for multi-role support
export interface UserAccount {
  uid: string;
  role: 'customer' | 'driver' | 'admin';
  phone: string;
  password: string; // hashed
  name: string;
  email?: string;
  profileImage?: string;
  createdAt: Date;
  
  // Customer specific
  savedAddresses?: Address[];
  
  // Driver specific
  vehicleNumber?: string;
  licenseNumber?: string;
  driverLicenseImage?: string;
  vehicleRegistrationImage?: string;
  isApproved?: boolean;
  isAvailable?: boolean;
  totalEarnings?: number;
  completedOrders?: number;
}

export type BookingStatus = 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: BookingStatus;
  tankerSize: number; // in liters
  basePrice: number;
  distanceCharge: number;
  totalPrice: number;
  deliveryAddress: Address;
  distance: number; // in km
  scheduledFor?: Date; // null for immediate, date/time for scheduled
  isImmediate: boolean;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  cancellationReason?: string;
  canCancel: boolean; // false once driver accepts
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
}

export interface TankerSize {
  id: string;
  size: number; // in liters
  basePrice: number;
  isActive: boolean;
  displayName: string; // e.g., "1000 Liters", "Small Tanker"
}

export interface Pricing {
  pricePerKm: number;
  minimumCharge: number;
  updatedAt: Date;
  updatedBy: string; // admin uid
}

export interface DriverApplication {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber: string;
  licenseNumber: string;
  driverLicenseImage: string;
  vehicleRegistrationImage: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  reviewedBy?: string; // admin uid
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'system';
  isRead: boolean;
  relatedBookingId?: string;
  createdAt: Date;
}

// Navigation types
export interface AuthStackParamList {
  Login: undefined;
  Register: undefined;
  OTP: { phone: string };
  RoleSelection: { phone: string; availableRoles: ('customer' | 'driver' | 'admin')[] };
  [key: string]: undefined | { phone: string } | { phone: string; availableRoles: ('customer' | 'driver' | 'admin')[] };
}

export interface CustomerTabParamList {
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
}

export interface CustomerStackParamList {
  CustomerTabs: undefined;
  Booking: undefined;
  OrderTracking: { orderId: string };
  SavedAddresses: undefined;
}

export interface DriverTabParamList {
  Dashboard: undefined;
  Orders: undefined;
  Earnings: undefined;
  Profile: undefined;
}

export interface DriverStackParamList {
  DriverTabs: undefined;
  ActiveOrder: { orderId: string };
}

export interface AdminTabParamList {
  Dashboard: undefined;
  Bookings: undefined;
  Drivers: undefined;
  Customers: undefined;
  Pricing: undefined;
  Reports: undefined;
}

export interface AdminStackParamList {
  AdminTabs: undefined;
}

// Form types
export interface LoginForm {
  phone: string;
  password: string;
}

export interface RegisterForm {
  phone: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: 'customer' | 'driver' | 'admin';
}

export interface BookingForm {
  tankerSize: number;
  deliveryAddress: Address;
  scheduledFor?: Date;
  isImmediate: boolean;
  specialInstructions?: string;
}

export interface AddressForm {
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DistanceResult {
  distance: number; // in kilometers
  duration?: number; // in minutes (if available)
}

// Payment types
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

// Analytics types
export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  activeDrivers: number;
  totalCustomers: number;
}

export interface DriverEarnings {
  driverId: string;
  driverName: string;
  totalEarnings: number;
  completedOrders: number;
  averageEarningPerOrder: number;
  period: 'daily' | 'weekly' | 'monthly';
}
