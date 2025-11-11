// src/utils/supabaseTransformers.ts

/**
 * Data transformation utilities for converting between app types and Supabase database types
 * 
 * These utilities handle:
 * - Date serialization/deserialization
 * - JSONB field transformations
 * - Type mapping between app and database schemas
 */

import { User, Booking, Address, BookingStatus, PaymentStatus, Vehicle } from '../types/index';

/**
 * Transform Supabase user record to app User type
 */
export function transformSupabaseUserToAppUser(dbUser: any): User {
  const baseUser = {
    uid: dbUser.id,
    phone: dbUser.phone,
    password: '', // Password is handled by Supabase Auth, not stored in users table
    name: dbUser.name,
    email: dbUser.email || undefined,
    profileImage: dbUser.profile_image || undefined,
    createdAt: new Date(dbUser.created_at),
  };

  switch (dbUser.role) {
    case 'customer':
      return {
        ...baseUser,
        role: 'customer',
        savedAddresses: [], // Will be loaded separately from addresses table
      };

    case 'driver':
      return {
        ...baseUser,
        role: 'driver',
        vehicleNumber: dbUser.vehicle_number || undefined,
        licenseNumber: dbUser.license_number || undefined,
        licenseExpiry: dbUser.license_expiry ? new Date(dbUser.license_expiry) : undefined,
        driverLicenseImage: dbUser.driver_license_image || undefined,
        vehicleRegistrationImage: dbUser.vehicle_registration_image || undefined,
        isApproved: dbUser.is_approved ?? false,
        isAvailable: dbUser.is_available ?? true,
        totalEarnings: dbUser.total_earnings ? Number(dbUser.total_earnings) : 0,
        completedOrders: dbUser.completed_orders ?? 0,
        createdByAdmin: dbUser.created_by_admin ?? false,
        emergencyContactName: dbUser.emergency_contact_name || undefined,
        emergencyContactPhone: dbUser.emergency_contact_phone || undefined,
      };

    case 'admin':
      return {
        ...baseUser,
        role: 'admin',
        businessName: dbUser.business_name || undefined,
      };

    default:
      throw new Error(`Unknown user role: ${dbUser.role}`);
  }
}

/**
 * Transform app User type to Supabase user record format
 */
export function transformAppUserToSupabaseUser(user: User): any {
  const baseData: any = {
    phone: user.phone,
    name: user.name,
    email: user.email || null,
    profile_image: user.profileImage || null,
    role: user.role,
  };

  // Add role-specific fields
  if (user.role === 'driver') {
    baseData.vehicle_number = user.vehicleNumber || null;
    baseData.license_number = user.licenseNumber || null;
    baseData.license_expiry = user.licenseExpiry ? user.licenseExpiry.toISOString().split('T')[0] : null;
    baseData.driver_license_image = user.driverLicenseImage || null;
    baseData.vehicle_registration_image = user.vehicleRegistrationImage || null;
    baseData.is_approved = user.isApproved ?? false;
    baseData.is_available = user.isAvailable ?? true;
    baseData.total_earnings = user.totalEarnings ?? 0;
    baseData.completed_orders = user.completedOrders ?? 0;
    baseData.created_by_admin = user.createdByAdmin ?? false;
    baseData.emergency_contact_name = user.emergencyContactName || null;
    baseData.emergency_contact_phone = user.emergencyContactPhone || null;
  } else if (user.role === 'admin') {
    baseData.business_name = user.businessName || null;
  }

  return baseData;
}

/**
 * Transform Supabase address record to app Address type
 */
export function transformSupabaseAddressToAppAddress(dbAddress: any): Address {
  return {
    id: dbAddress.id,
    street: dbAddress.street,
    city: dbAddress.city,
    state: dbAddress.state,
    pincode: dbAddress.pincode,
    landmark: dbAddress.landmark || undefined,
    latitude: Number(dbAddress.latitude),
    longitude: Number(dbAddress.longitude),
    isDefault: dbAddress.is_default ?? false,
  };
}

/**
 * Transform app Address type to Supabase address record format
 */
export function transformAppAddressToSupabaseAddress(address: Address, userId: string): any {
  return {
    user_id: userId,
    street: address.street,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark || null,
    latitude: address.latitude,
    longitude: address.longitude,
    is_default: address.isDefault ?? false,
  };
}

/**
 * Transform Supabase booking record to app Booking type
 */
export function transformSupabaseBookingToAppBooking(dbBooking: any): Booking {
  // Parse delivery_address JSONB field
  const deliveryAddressJson = typeof dbBooking.delivery_address === 'string' 
    ? JSON.parse(dbBooking.delivery_address) 
    : dbBooking.delivery_address;

  return {
    id: dbBooking.id,
    customerId: dbBooking.customer_id,
    customerName: dbBooking.customer_name,
    customerPhone: dbBooking.customer_phone,
    agencyId: dbBooking.agency_id || undefined,
    agencyName: dbBooking.agency_name || undefined,
    driverId: dbBooking.driver_id || undefined,
    driverName: dbBooking.driver_name || undefined,
    driverPhone: dbBooking.driver_phone || undefined,
    status: dbBooking.status as BookingStatus,
    tankerSize: dbBooking.tanker_size,
    quantity: dbBooking.quantity ?? 1,
    basePrice: Number(dbBooking.base_price),
    distanceCharge: Number(dbBooking.distance_charge),
    totalPrice: Number(dbBooking.total_price),
    deliveryAddress: {
      street: deliveryAddressJson.street,
      city: deliveryAddressJson.city,
      state: deliveryAddressJson.state,
      pincode: deliveryAddressJson.pincode,
      landmark: deliveryAddressJson.landmark,
      latitude: Number(deliveryAddressJson.latitude),
      longitude: Number(deliveryAddressJson.longitude),
    },
    distance: Number(dbBooking.distance),
    scheduledFor: dbBooking.scheduled_for ? new Date(dbBooking.scheduled_for) : undefined,
    isImmediate: dbBooking.is_immediate ?? true,
    paymentStatus: dbBooking.payment_status as PaymentStatus,
    paymentId: dbBooking.payment_id || undefined,
    cancellationReason: dbBooking.cancellation_reason || undefined,
    canCancel: dbBooking.can_cancel ?? true,
    createdAt: new Date(dbBooking.created_at),
    updatedAt: new Date(dbBooking.updated_at),
    acceptedAt: dbBooking.accepted_at ? new Date(dbBooking.accepted_at) : undefined,
    deliveredAt: dbBooking.delivered_at ? new Date(dbBooking.delivered_at) : undefined,
  };
}

/**
 * Transform app Booking type to Supabase booking record format
 */
export function transformAppBookingToSupabaseBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): any {
  return {
    customer_id: booking.customerId,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    agency_id: booking.agencyId || null,
    agency_name: booking.agencyName || null,
    driver_id: booking.driverId || null,
    driver_name: booking.driverName || null,
    driver_phone: booking.driverPhone || null,
    status: booking.status,
    tanker_size: booking.tankerSize,
    quantity: booking.quantity ?? 1,
    base_price: booking.basePrice,
    distance_charge: booking.distanceCharge,
    total_price: booking.totalPrice,
    delivery_address: {
      street: booking.deliveryAddress.street,
      city: booking.deliveryAddress.city,
      state: booking.deliveryAddress.state,
      pincode: booking.deliveryAddress.pincode,
      landmark: booking.deliveryAddress.landmark,
      latitude: booking.deliveryAddress.latitude,
      longitude: booking.deliveryAddress.longitude,
    },
    distance: booking.distance,
    scheduled_for: booking.scheduledFor ? booking.scheduledFor.toISOString() : null,
    is_immediate: booking.isImmediate ?? true,
    payment_status: booking.paymentStatus,
    payment_id: booking.paymentId || null,
    cancellation_reason: booking.cancellationReason || null,
    can_cancel: booking.canCancel ?? true,
    accepted_at: booking.acceptedAt ? booking.acceptedAt.toISOString() : null,
    delivered_at: booking.deliveredAt ? booking.deliveredAt.toISOString() : null,
  };
}

/**
 * Transform Supabase vehicle record to app Vehicle type
 */
export function transformSupabaseVehicleToAppVehicle(dbVehicle: any): Vehicle {
  return {
    id: dbVehicle.id,
    agencyId: dbVehicle.agency_id,
    vehicleNumber: dbVehicle.vehicle_number,
    insuranceCompanyName: dbVehicle.insurance_company_name,
    insuranceExpiryDate: new Date(dbVehicle.insurance_expiry_date),
    vehicleCapacity: Number(dbVehicle.vehicle_capacity),
    amount: Number(dbVehicle.amount),
    createdAt: new Date(dbVehicle.created_at),
    updatedAt: new Date(dbVehicle.updated_at),
  };
}

/**
 * Transform app Vehicle type to Supabase vehicle record format
 */
export function transformAppVehicleToSupabaseVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): any {
  return {
    agency_id: vehicle.agencyId,
    vehicle_number: vehicle.vehicleNumber,
    insurance_company_name: vehicle.insuranceCompanyName,
    insurance_expiry_date: vehicle.insuranceExpiryDate.toISOString().split('T')[0],
    vehicle_capacity: vehicle.vehicleCapacity,
    amount: vehicle.amount,
  };
}

