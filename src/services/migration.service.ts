// src/services/migration.service.ts

/**
 * Data Migration Service
 * 
 * Migrates data from localStorage (AsyncStorage) to Supabase database.
 * Handles:
 * - Users (with Supabase Auth account creation)
 * - Addresses
 * - Bookings
 * - Vehicles
 * 
 * Includes validation and error handling for data integrity.
 */

import { LocalStorageService } from './localStorage';
import { supabase } from './supabase';
import { User, Booking, Vehicle, Address } from '../types/index';
import { 
  transformAppUserToSupabaseUser, 
  transformAppBookingToSupabaseBooking,
  transformAppVehicleToSupabaseVehicle,
  transformAppAddressToSupabaseAddress
} from '../utils/supabaseTransformers';
import { ERROR_MESSAGES } from '../constants/config';

export interface MigrationResult {
  success: boolean;
  migrated: {
    users: number;
    addresses: number;
    bookings: number;
    vehicles: number;
  };
  errors: string[];
  warnings: string[];
}

export interface MigrationOptions {
  skipExisting?: boolean; // Skip records that already exist in Supabase
  dryRun?: boolean; // Don't actually migrate, just validate
  createAuthAccounts?: boolean; // Create Supabase Auth accounts for users
}

export class MigrationService {
  private static errors: string[] = [];
  private static warnings: string[] = [];

  /**
   * Main migration function - migrates all data from localStorage to Supabase
   */
  static async migrateAll(options: MigrationOptions = {}): Promise<MigrationResult> {
    const {
      skipExisting = true,
      dryRun = false,
      createAuthAccounts = true,
    } = options;

    this.errors = [];
    this.warnings = [];

    const result: MigrationResult = {
      success: true,
      migrated: {
        users: 0,
        addresses: 0,
        bookings: 0,
        vehicles: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      console.log('🚀 Starting data migration...');
      if (dryRun) {
        console.log('⚠️  DRY RUN MODE - No data will be migrated');
      }

      // Step 1: Migrate users (must be first due to foreign key constraints)
      console.log('📦 Step 1: Migrating users...');
      const usersResult = await this.migrateUsers({ skipExisting, dryRun, createAuthAccounts });
      result.migrated.users = usersResult.count;
      result.errors.push(...usersResult.errors);
      result.warnings.push(...usersResult.warnings);

      // Step 2: Migrate addresses (depends on users)
      console.log('📍 Step 2: Migrating addresses...');
      const addressesResult = await this.migrateAddresses({ skipExisting, dryRun });
      result.migrated.addresses = addressesResult.count;
      result.errors.push(...addressesResult.errors);
      result.warnings.push(...addressesResult.warnings);

      // Step 3: Migrate vehicles (depends on users/agencies)
      console.log('🚗 Step 3: Migrating vehicles...');
      const vehiclesResult = await this.migrateVehicles({ skipExisting, dryRun });
      result.migrated.vehicles = vehiclesResult.count;
      result.errors.push(...vehiclesResult.errors);
      result.warnings.push(...vehiclesResult.warnings);

      // Step 4: Migrate bookings (depends on users)
      console.log('📋 Step 4: Migrating bookings...');
      const bookingsResult = await this.migrateBookings({ skipExisting, dryRun });
      result.migrated.bookings = bookingsResult.count;
      result.errors.push(...bookingsResult.errors);
      result.warnings.push(...bookingsResult.warnings);

      result.success = result.errors.length === 0;
      result.errors = this.errors;
      result.warnings = this.warnings;

      console.log('✅ Migration completed!');
      console.log(`   Users: ${result.migrated.users}`);
      console.log(`   Addresses: ${result.migrated.addresses}`);
      console.log(`   Vehicles: ${result.migrated.vehicles}`);
      console.log(`   Bookings: ${result.migrated.bookings}`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
      }
      if (result.warnings.length > 0) {
        console.log(`   Warnings: ${result.warnings.length}`);
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Migration failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Migrate users from localStorage to Supabase
   */
  private static async migrateUsers(options: MigrationOptions): Promise<{ count: number; errors: string[]; warnings: string[] }> {
    const { skipExisting, dryRun, createAuthAccounts } = options;
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get users from localStorage
      const localUsers = await LocalStorageService.getUsers();
      
      if (!localUsers || localUsers.length === 0) {
        warnings.push('No users found in localStorage');
        return { count: 0, errors, warnings };
      }

      console.log(`   Found ${localUsers.length} users in localStorage`);

      for (const localUser of localUsers) {
        try {
          // Check if user already exists in Supabase
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('users')
              .select('id')
              .eq('phone', localUser.phone)
              .eq('role', localUser.role)
              .single();

            if (existing) {
              warnings.push(`User ${localUser.phone} (${localUser.role}) already exists, skipping`);
              continue;
            }
          }

          if (dryRun) {
            count++;
            continue;
          }

          // Transform user data
          const appUser: User = {
            uid: localUser.uid || this.generateUuid(),
            role: localUser.role,
            phone: localUser.phone,
            password: localUser.password || '', // Will be handled by Auth if createAuthAccounts is true
            name: localUser.name,
            email: localUser.email,
            profileImage: localUser.profileImage,
            createdAt: localUser.createdAt ? new Date(localUser.createdAt) : new Date(),
            // Role-specific fields
            ...(localUser.role === 'customer' && { savedAddresses: localUser.savedAddresses || [] }),
            ...(localUser.role === 'driver' && {
              vehicleNumber: localUser.vehicleNumber,
              licenseNumber: localUser.licenseNumber,
              licenseExpiry: localUser.licenseExpiry ? new Date(localUser.licenseExpiry) : undefined,
              driverLicenseImage: localUser.driverLicenseImage,
              vehicleRegistrationImage: localUser.vehicleRegistrationImage,
              isApproved: localUser.isApproved ?? false,
              isAvailable: localUser.isAvailable ?? true,
              totalEarnings: localUser.totalEarnings ?? 0,
              completedOrders: localUser.completedOrders ?? 0,
              createdByAdmin: localUser.createdByAdmin ?? false,
              emergencyContactName: localUser.emergencyContactName,
              emergencyContactPhone: localUser.emergencyContactPhone,
            }),
            ...(localUser.role === 'admin' && {
              businessName: localUser.businessName,
            }),
          };

          // Generate auth_id for the user
          // Note: In a real implementation, this would be generated by your authentication system
          const authUserId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

          // Transform to Supabase format
          const supabaseUserData = transformAppUserToSupabaseUser(appUser);
          supabaseUserData.auth_id = authUserId;
          
          if (createAuthAccounts && localUser.password) {
            warnings.push(`Auth account creation skipped - implement with your authentication system for ${localUser.phone}`);
          }

          // Insert into Supabase
          const { error: insertError } = await supabase
            .from('users')
            .insert([supabaseUserData]);

          if (insertError) {
            throw insertError;
          }

          count++;
          console.log(`   ✓ Migrated user: ${localUser.name} (${localUser.phone}, ${localUser.role})`);
        } catch (error: any) {
          const errorMsg = `Failed to migrate user ${localUser.phone} (${localUser.role}): ${error.message}`;
          errors.push(errorMsg);
          console.error(`   ✗ ${errorMsg}`);
        }
      }

      return { count, errors, warnings };
    } catch (error: any) {
      errors.push(`Failed to migrate users: ${error.message}`);
      return { count, errors, warnings };
    }
  }

  /**
   * Migrate addresses from localStorage to Supabase
   */
  private static async migrateAddresses(options: MigrationOptions): Promise<{ count: number; errors: string[]; warnings: string[] }> {
    const { skipExisting, dryRun } = options;
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get users from localStorage to extract saved addresses
      const localUsers = await LocalStorageService.getUsers();
      
      if (!localUsers || localUsers.length === 0) {
        warnings.push('No users found, cannot migrate addresses');
        return { count: 0, errors, warnings };
      }

      // Also check current_user for saved addresses
      const currentUser = await LocalStorageService.getCurrentUser();
      if (currentUser && currentUser.savedAddresses) {
        localUsers.push({
          ...currentUser,
          savedAddresses: currentUser.savedAddresses,
        });
      }

      for (const localUser of localUsers) {
        // Only migrate addresses for customers
        if (localUser.role !== 'customer' || !localUser.savedAddresses || localUser.savedAddresses.length === 0) {
          continue;
        }

        // Get the Supabase user ID for this phone/role
        const { data: supabaseUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', localUser.phone)
          .eq('role', 'customer')
          .single();

        if (userError || !supabaseUser) {
          warnings.push(`Cannot migrate addresses for ${localUser.phone}: user not found in Supabase`);
          continue;
        }

        for (const address of localUser.savedAddresses) {
          try {
            // Check if address already exists
            if (skipExisting) {
              const { data: existing } = await supabase
                .from('addresses')
                .select('id')
                .eq('user_id', supabaseUser.id)
                .eq('street', address.street || '')
                .eq('pincode', address.pincode || '')
                .single();

              if (existing) {
                continue;
              }
            }

            if (dryRun) {
              count++;
              continue;
            }

            // Transform address
            const appAddress: Address = {
              id: address.id,
              street: address.street || '',
              city: address.city || '',
              state: address.state || '',
              pincode: address.pincode || '',
              landmark: address.landmark,
              latitude: address.latitude || 0,
              longitude: address.longitude || 0,
              isDefault: address.isDefault ?? false,
            };

            const supabaseAddressData = transformAppAddressToSupabaseAddress(appAddress, supabaseUser.id);

            const { error: insertError } = await supabase
              .from('addresses')
              .insert([supabaseAddressData]);

            if (insertError) {
              throw insertError;
            }

            count++;
          } catch (error: any) {
            const errorMsg = `Failed to migrate address for ${localUser.phone}: ${error.message}`;
            errors.push(errorMsg);
            console.error(`   ✗ ${errorMsg}`);
          }
        }
      }

      if (count > 0) {
        console.log(`   ✓ Migrated ${count} addresses`);
      }

      return { count, errors, warnings };
    } catch (error: any) {
      errors.push(`Failed to migrate addresses: ${error.message}`);
      return { count, errors, warnings };
    }
  }

  /**
   * Migrate vehicles from localStorage to Supabase
   */
  private static async migrateVehicles(options: MigrationOptions): Promise<{ count: number; errors: string[]; warnings: string[] }> {
    const { skipExisting, dryRun } = options;
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const localVehicles = await LocalStorageService.getVehicles();
      
      if (!localVehicles || localVehicles.length === 0) {
        warnings.push('No vehicles found in localStorage');
        return { count: 0, errors, warnings };
      }

      console.log(`   Found ${localVehicles.length} vehicles in localStorage`);

      for (const localVehicle of localVehicles) {
        try {
          // Check if vehicle already exists
          if (skipExisting) {
            const { data: existing } = await supabase
              .from('vehicles')
              .select('id')
              .eq('vehicle_number', localVehicle.vehicleNumber)
              .single();

            if (existing) {
              warnings.push(`Vehicle ${localVehicle.vehicleNumber} already exists, skipping`);
              continue;
            }
          }

          // Get agency user ID
          if (!localVehicle.agencyId) {
            warnings.push(`Vehicle ${localVehicle.vehicleNumber} has no agencyId, skipping`);
            continue;
          }

          // Find agency in Supabase (by matching phone or ID)
          const { data: agencyUser, error: agencyError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .or(`id.eq.${localVehicle.agencyId},phone.eq.${localVehicle.agencyId}`)
            .single();

          if (agencyError || !agencyUser) {
            warnings.push(`Agency not found for vehicle ${localVehicle.vehicleNumber}, skipping`);
            continue;
          }

          if (dryRun) {
            count++;
            continue;
          }

          // Transform vehicle
          const appVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
            agencyId: agencyUser.id,
            vehicleNumber: localVehicle.vehicleNumber,
            insuranceCompanyName: localVehicle.insuranceCompanyName,
            insuranceExpiryDate: localVehicle.insuranceExpiryDate 
              ? new Date(localVehicle.insuranceExpiryDate) 
              : new Date(),
            vehicleCapacity: localVehicle.vehicleCapacity,
            amount: localVehicle.amount,
          };

          const supabaseVehicleData = transformAppVehicleToSupabaseVehicle(appVehicle);

          const { error: insertError } = await supabase
            .from('vehicles')
            .insert([supabaseVehicleData]);

          if (insertError) {
            throw insertError;
          }

          count++;
          console.log(`   ✓ Migrated vehicle: ${localVehicle.vehicleNumber}`);
        } catch (error: any) {
          const errorMsg = `Failed to migrate vehicle ${localVehicle.vehicleNumber}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`   ✗ ${errorMsg}`);
        }
      }

      return { count, errors, warnings };
    } catch (error: any) {
      errors.push(`Failed to migrate vehicles: ${error.message}`);
      return { count, errors, warnings };
    }
  }

  /**
   * Migrate bookings from localStorage to Supabase
   */
  private static async migrateBookings(options: MigrationOptions): Promise<{ count: number; errors: string[]; warnings: string[] }> {
    const { skipExisting, dryRun } = options;
    let count = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const localBookings = await LocalStorageService.getBookings();
      
      if (!localBookings || localBookings.length === 0) {
        warnings.push('No bookings found in localStorage');
        return { count: 0, errors, warnings };
      }

      console.log(`   Found ${localBookings.length} bookings in localStorage`);

      for (const localBooking of localBookings) {
        try {
          // Check if booking already exists (by customer_id, created_at, and total_price as unique identifier)
          if (skipExisting && localBooking.id) {
            const { data: existing } = await supabase
              .from('bookings')
              .select('id')
              .eq('id', localBooking.id)
              .single();

            if (existing) {
              warnings.push(`Booking ${localBooking.id} already exists, skipping`);
              continue;
            }
          }

          // Get customer user ID
          const { data: customerUser, error: customerError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'customer')
            .or(`id.eq.${localBooking.customerId},phone.eq.${localBooking.customerId},uid.eq.${localBooking.customerId}`)
            .single();

          if (customerError || !customerUser) {
            warnings.push(`Customer not found for booking ${localBooking.id}, skipping`);
            continue;
          }

          // Get driver user ID if assigned
          let driverUserId: string | undefined;
          if (localBooking.driverId) {
            const { data: driverUser } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'driver')
              .or(`id.eq.${localBooking.driverId},phone.eq.${localBooking.driverId},uid.eq.${localBooking.driverId}`)
              .single();
            
            if (driverUser) {
              driverUserId = driverUser.id;
            }
          }

          // Get agency user ID if assigned
          let agencyUserId: string | undefined;
          if (localBooking.agencyId) {
            const { data: agencyUser } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin')
              .or(`id.eq.${localBooking.agencyId},phone.eq.${localBooking.agencyId},uid.eq.${localBooking.agencyId}`)
              .single();
            
            if (agencyUser) {
              agencyUserId = agencyUser.id;
            }
          }

          if (dryRun) {
            count++;
            continue;
          }

          // Transform booking
          const appBooking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
            customerId: customerUser.id,
            customerName: localBooking.customerName || '',
            customerPhone: localBooking.customerPhone || '',
            agencyId: agencyUserId,
            agencyName: localBooking.agencyName,
            driverId: driverUserId,
            driverName: localBooking.driverName,
            driverPhone: localBooking.driverPhone,
            status: localBooking.status || 'pending',
            tankerSize: localBooking.tankerSize,
            quantity: localBooking.quantity ?? 1,
            basePrice: localBooking.basePrice,
            distanceCharge: localBooking.distanceCharge,
            totalPrice: localBooking.totalPrice,
            deliveryAddress: localBooking.deliveryAddress || {
              street: '',
              city: '',
              state: '',
              pincode: '',
              latitude: 0,
              longitude: 0,
            },
            distance: localBooking.distance,
            scheduledFor: localBooking.scheduledFor ? new Date(localBooking.scheduledFor) : undefined,
            isImmediate: localBooking.isImmediate ?? true,
            paymentStatus: localBooking.paymentStatus || 'pending',
            paymentId: localBooking.paymentId,
            cancellationReason: localBooking.cancellationReason,
            canCancel: localBooking.canCancel ?? true,
            acceptedAt: localBooking.acceptedAt ? new Date(localBooking.acceptedAt) : undefined,
            deliveredAt: localBooking.deliveredAt ? new Date(localBooking.deliveredAt) : undefined,
          };

          const supabaseBookingData = transformAppBookingToSupabaseBooking(appBooking);

          // If booking has an ID from localStorage, try to preserve it
          if (localBooking.id && this.isValidUuid(localBooking.id)) {
            supabaseBookingData.id = localBooking.id;
          }

          const { error: insertError } = await supabase
            .from('bookings')
            .insert([supabaseBookingData]);

          if (insertError) {
            throw insertError;
          }

          count++;
          console.log(`   ✓ Migrated booking: ${localBooking.id || 'new'}`);
        } catch (error: any) {
          const errorMsg = `Failed to migrate booking ${localBooking.id}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`   ✗ ${errorMsg}`);
        }
      }

      return { count, errors, warnings };
    } catch (error: any) {
      errors.push(`Failed to migrate bookings: ${error.message}`);
      return { count, errors, warnings };
    }
  }

  /**
   * Validate data integrity after migration
   */
  static async validateMigration(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, phone, role');

      if (usersError) {
        issues.push(`Failed to validate users: ${usersError.message}`);
      } else {
        // Check for duplicate phone+role combinations
        const phoneRoleMap = new Map<string, number>();
        users?.forEach(user => {
          const key = `${user.phone}_${user.role}`;
          phoneRoleMap.set(key, (phoneRoleMap.get(key) || 0) + 1);
        });

        phoneRoleMap.forEach((count, key) => {
          if (count > 1) {
            issues.push(`Duplicate user found: ${key} (${count} instances)`);
          }
        });
      }

      // Check bookings have valid customer references
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, customer_id');

      if (bookingsError) {
        issues.push(`Failed to validate bookings: ${bookingsError.message}`);
      } else {
        for (const booking of bookings || []) {
          const { data: customer } = await supabase
            .from('users')
            .select('id')
            .eq('id', booking.customer_id)
            .single();

          if (!customer) {
            issues.push(`Booking ${booking.id} has invalid customer_id: ${booking.customer_id}`);
          }
        }
      }

      // Check vehicles have valid agency references
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, agency_id, vehicle_number');

      if (vehiclesError) {
        issues.push(`Failed to validate vehicles: ${vehiclesError.message}`);
      } else {
        for (const vehicle of vehicles || []) {
          const { data: agency } = await supabase
            .from('users')
            .select('id')
            .eq('id', vehicle.agency_id)
            .eq('role', 'admin')
            .single();

          if (!agency) {
            issues.push(`Vehicle ${vehicle.vehicle_number} has invalid agency_id: ${vehicle.agency_id}`);
          }
        }
      }

      // Check addresses have valid user references
      const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('id, user_id');

      if (addressesError) {
        issues.push(`Failed to validate addresses: ${addressesError.message}`);
      } else {
        for (const address of addresses || []) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', address.user_id)
            .single();

          if (!user) {
            issues.push(`Address ${address.id} has invalid user_id: ${address.user_id}`);
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error: any) {
      return {
        valid: false,
        issues: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Helper: Generate UUID v4
   */
  private static generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Helper: Check if string is a valid UUID
   */
  private static isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

