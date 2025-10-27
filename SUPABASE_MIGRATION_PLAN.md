# Water Tanker App - Supabase Migration Plan

## Overview
This document outlines the complete migration strategy from AsyncStorage to Supabase for the Water Tanker Booking App. The migration will transform the app from a local-only storage system to a cloud-based, real-time enabled platform.

## Table of Contents
1. [Migration Rationale](#migration-rationale)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Supabase Setup](#supabase-setup)
4. [Database Schema Design](#database-schema-design)
5. [Service Layer Migration](#service-layer-migration)
6. [Authentication Migration](#authentication-migration)
7. [Real-time Features Implementation](#real-time-features-implementation)
8. [Data Migration Strategy](#data-migration-strategy)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Timeline & Milestones](#timeline--milestones)
12. [Risk Assessment](#risk-assessment)
13. [Post-Migration Optimization](#post-migration-optimization)

## Migration Rationale

### Why Supabase Over Firebase?
- **Cost-Effectiveness**: Better free tier and predictable pricing
- **Real-time Features**: Built-in PostgreSQL triggers for instant updates
- **Relational Database**: Better fit for structured data relationships
- **Row Level Security**: Perfect for multi-role authentication
- **SQL-based**: Easier migration from current TypeScript interfaces
- **Developer Experience**: Simpler setup and better TypeScript support

### Benefits of Migration
1. **Real-time Updates**: Instant booking status changes across devices
2. **Data Persistence**: No data loss on app reinstall
3. **Multi-device Sync**: Users can access data from any device
4. **Scalability**: Handle growth from local to thousands of users
5. **Security**: Cloud-level security with RLS policies
6. **Analytics**: Built-in analytics and monitoring

## Current Architecture Analysis

### Current Data Storage
- **LocalStorageService**: Generic CRUD operations
- **AuthService**: User authentication and management
- **BookingService**: Booking lifecycle management
- **Zustand Stores**: State management (authStore, bookingStore, userStore)

### Data Entities
1. **Users**: Multi-role system (customer, driver, admin)
2. **Bookings**: Core business entity with status tracking
3. **Addresses**: User saved addresses
4. **Pricing**: Dynamic pricing configuration

### Current Limitations
- Data lost on app reinstall
- No real-time updates
- No multi-device sync
- Limited scalability
- No cloud backup

## Supabase Setup

### 1. Project Creation
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Start local development
supabase start
```

### 2. Environment Configuration
```typescript
// src/config/supabase.ts
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-side only
};
```

### 3. Dependencies Installation
```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react-native
```

## Database Schema Design

### 1. Users Table
```sql
-- Users table with multi-role support
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Driver specific fields
  vehicle_number TEXT,
  license_number TEXT,
  driver_license_image TEXT,
  vehicle_registration_image TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  
  -- Indexes for performance
  CONSTRAINT valid_phone CHECK (phone ~ '^[0-9]{10}$')
);

-- Indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_driver_available ON users(role, is_available) WHERE role = 'driver';
```

### 2. Addresses Table
```sql
-- User saved addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one default address per user
  CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses(latitude, longitude);
```

### 3. Bookings Table
```sql
-- Core booking entity
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled')),
  tanker_size INTEGER NOT NULL CHECK (tanker_size > 0),
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  distance_charge DECIMAL(10,2) NOT NULL CHECK (distance_charge >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  delivery_address JSONB NOT NULL,
  distance DECIMAL(8,2) NOT NULL CHECK (distance >= 0),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  is_immediate BOOLEAN DEFAULT TRUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_id TEXT,
  cancellation_reason TEXT,
  can_cancel BOOLEAN DEFAULT TRUE,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_scheduled_time CHECK (scheduled_for IS NULL OR scheduled_for > created_at),
  CONSTRAINT valid_delivery_time CHECK (delivered_at IS NULL OR delivered_at >= accepted_at)
);

-- Indexes for performance
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_pending ON bookings(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_bookings_driver_active ON bookings(driver_id, status) WHERE status IN ('accepted', 'in_transit');
```

### 4. Pricing Configuration Table
```sql
-- Dynamic pricing configuration
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_km DECIMAL(6,2) NOT NULL CHECK (price_per_km >= 0),
  minimum_charge DECIMAL(8,2) NOT NULL CHECK (minimum_charge >= 0),
  tanker_sizes JSONB NOT NULL, -- Array of tanker sizes with base prices
  is_active BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one active configuration
  CONSTRAINT unique_active_config UNIQUE (is_active) DEFERRABLE INITIALLY DEFERRED
);
```

### 5. Notifications Table
```sql
-- User notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'payment', 'system', 'driver')),
  is_read BOOLEAN DEFAULT FALSE,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at) WHERE is_read = FALSE;
```

### 6. Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Address policies
CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Booking policies
CREATE POLICY "Customers can view own bookings" ON bookings
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view assigned bookings" ON bookings
  FOR SELECT USING (
    driver_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  ));
```

## Service Layer Migration

### 1. Supabase Client Setup
```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/supabase';
import { Database } from '../types/database';

export const supabase = createClient<Database>(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 2. New AuthService Implementation
```typescript
// src/services/auth.service.ts
import { supabase } from './supabase';
import { User, AuthResult } from '../types';

export class AuthService {
  static async register(
    phone: string,
    password: string,
    name: string,
    role: 'customer' | 'driver' | 'admin',
    additionalData?: Partial<User>
  ): Promise<AuthResult> {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .eq('role', role)
        .single();

      if (existingUser) {
        return {
          success: false,
          error: `User already exists with this phone number as ${role}`
        };
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone,
        password,
      });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      // Create user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user!.id,
          role,
          phone,
          name,
          ...additionalData,
        })
        .select()
        .single();

      if (userError) {
        // Cleanup auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user!.id);
        return {
          success: false,
          error: userError.message
        };
      }

      return {
        success: true,
        user: userData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  static async login(phone: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      // Check for multiple roles
      const { data: allRoles } = await supabase
        .from('users')
        .select('role')
        .eq('phone', phone);

      if (allRoles && allRoles.length > 1) {
        return {
          success: true,
          requiresRoleSelection: true,
          availableRoles: allRoles.map(r => r.role),
          user: undefined
        };
      }

      return {
        success: true,
        user: userProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  static async loginWithRole(
    phone: string, 
    role: 'customer' | 'driver' | 'admin'
  ): Promise<AuthResult> {
    try {
      // First authenticate
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        phone,
        password: 'temp', // This will be handled by the auth system
      });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      // Get specific role profile
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .eq('role', role)
        .single();

      if (!userProfile) {
        return {
          success: false,
          error: 'User not found with selected role'
        };
      }

      return {
        success: true,
        user: userProfile
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  static async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  static async getCurrentUserData(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    return userProfile;
  }

  static async updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', uid);

    if (error) throw error;
  }
}
```

### 3. New BookingService Implementation
```typescript
// src/services/booking.service.ts
import { supabase } from './supabase';
import { Booking, BookingStatus } from '../types';

export class BookingService {
  static async createBooking(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    additionalData?: Partial<Booking>
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date(),
      ...additionalData,
    };

    if (status === 'accepted') {
      updateData.accepted_at = new Date();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date();
    }

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (error) throw error;
  }

  static async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAvailableBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getBookingsByDriver(driverId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAllBookings(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  }

  static subscribeToBookingUpdates(
    bookingId: string,
    callback: (booking: Booking | null) => void
  ): () => void {
    const subscription = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          callback(payload.new as Booking);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  static async cancelBooking(bookingId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date(),
      })
      .eq('id', bookingId);

    if (error) throw error;
  }
}
```

## Authentication Migration

### 1. Supabase Auth Integration
```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { User } from '../types';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUserId: string) => {
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      setUser(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  };
};
```

### 2. Phone Authentication Setup
```typescript
// src/services/phoneAuth.service.ts
import { supabase } from './supabase';

export class PhoneAuthService {
  static async sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      };
    }
  }

  static async verifyOTP(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify OTP',
      };
    }
  }
}
```

## Real-time Features Implementation

### 1. Booking Status Updates
```typescript
// src/hooks/useBookingUpdates.ts
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Booking } from '../types';

export const useBookingUpdates = (bookingId: string) => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      setBooking(data);
      setLoading(false);
    };

    fetchBooking();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          setBooking(payload.new as Booking);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [bookingId]);

  return { booking, loading };
};
```

### 2. Driver Location Tracking
```typescript
// src/services/location.service.ts
import { supabase } from './supabase';

export class LocationService {
  static async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude,
        longitude,
        updated_at: new Date(),
      });

    if (error) throw error;
  }

  static subscribeToDriverLocation(
    driverId: string,
    callback: (location: { latitude: number; longitude: number }) => void
  ): () => void {
    const subscription = supabase
      .channel('driver-location')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          callback({
            latitude: payload.new.latitude,
            longitude: payload.new.longitude,
          });
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }
}
```

### 3. Push Notifications Integration
```typescript
// src/services/notification.service.ts
import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export class NotificationService {
  static async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'booking' | 'payment' | 'system' | 'driver',
    relatedBookingId?: string
  ): Promise<void> {
    // Save to database
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        related_booking_id: relatedBookingId,
      });

    if (error) throw error;

    // Send push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data: { type, relatedBookingId },
      },
      trigger: null, // Send immediately
    });
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  static subscribeToNotifications(
    userId: string,
    callback: (notification: any) => void
  ): () => void {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }
}
```

## Data Migration Strategy

### 1. Migration Script
```typescript
// scripts/migrateData.ts
import { supabase } from '../src/services/supabase';
import { LocalStorageService } from '../src/services/localStorage';

export class DataMigrationService {
  static async migrateAllData(): Promise<void> {
    console.log('Starting data migration...');

    try {
      // Migrate users
      await this.migrateUsers();
      
      // Migrate bookings
      await this.migrateBookings();
      
      // Migrate addresses
      await this.migrateAddresses();
      
      console.log('Data migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  static async migrateUsers(): Promise<void> {
    const users = await LocalStorageService.getUsers();
    
    for (const user of users) {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: user.phone,
        password: 'temp_password', // Users will need to reset
      });

      if (authError) {
        console.error(`Failed to create auth user for ${user.phone}:`, authError);
        continue;
      }

      // Create user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          role: user.role,
          phone: user.phone,
          name: user.name,
          email: user.email,
          profile_image: user.profileImage,
          vehicle_number: user.vehicleNumber,
          license_number: user.licenseNumber,
          driver_license_image: user.driverLicenseImage,
          vehicle_registration_image: user.vehicleRegistrationImage,
          is_approved: user.isApproved,
          is_available: user.isAvailable,
          total_earnings: user.totalEarnings,
          completed_orders: user.completedOrders,
          created_at: user.createdAt,
        });

      if (userError) {
        console.error(`Failed to migrate user ${user.phone}:`, userError);
      }
    }
  }

  static async migrateBookings(): Promise<void> {
    const bookings = await LocalStorageService.getBookings();
    
    for (const booking of bookings) {
      // Get customer and driver IDs from Supabase
      const { data: customer } = await supabase
        .from('users')
        .select('id')
        .eq('phone', booking.customerPhone)
        .eq('role', 'customer')
        .single();

      let driverId = null;
      if (booking.driverPhone) {
        const { data: driver } = await supabase
          .from('users')
          .select('id')
          .eq('phone', booking.driverPhone)
          .eq('role', 'driver')
          .single();
        driverId = driver?.id;
      }

      const { error } = await supabase
        .from('bookings')
        .insert({
          id: booking.id,
          customer_id: customer?.id,
          driver_id: driverId,
          status: booking.status,
          tanker_size: booking.tankerSize,
          base_price: booking.basePrice,
          distance_charge: booking.distanceCharge,
          total_price: booking.totalPrice,
          delivery_address: booking.deliveryAddress,
          distance: booking.distance,
          scheduled_for: booking.scheduledFor,
          is_immediate: booking.isImmediate,
          payment_status: booking.paymentStatus,
          payment_id: booking.paymentId,
          cancellation_reason: booking.cancellationReason,
          can_cancel: booking.canCancel,
          special_instructions: booking.specialInstructions,
          created_at: booking.createdAt,
          updated_at: booking.updatedAt,
          accepted_at: booking.acceptedAt,
          delivered_at: booking.deliveredAt,
        });

      if (error) {
        console.error(`Failed to migrate booking ${booking.id}:`, error);
      }
    }
  }

  static async migrateAddresses(): Promise<void> {
    const users = await LocalStorageService.getUsers();
    
    for (const user of users) {
      if (user.savedAddresses && user.savedAddresses.length > 0) {
        // Get user ID from Supabase
        const { data: supabaseUser } = await supabase
          .from('users')
          .select('id')
          .eq('phone', user.phone)
          .eq('role', user.role)
          .single();

        if (!supabaseUser) continue;

        for (const address of user.savedAddresses) {
          const { error } = await supabase
            .from('addresses')
            .insert({
              user_id: supabaseUser.id,
              street: address.street,
              city: address.city,
              state: address.state,
              pincode: address.pincode,
              landmark: address.landmark,
              latitude: address.latitude,
              longitude: address.longitude,
              is_default: address.isDefault,
            });

          if (error) {
            console.error(`Failed to migrate address for user ${user.phone}:`, error);
          }
        }
      }
    }
  }
}
```

### 2. Migration Execution
```bash
# Run migration script
npx ts-node scripts/migrateData.ts
```

## Testing Strategy

### 1. Unit Tests
```typescript
// __tests__/services/auth.service.test.ts
import { AuthService } from '../../src/services/auth.service';
import { supabase } from '../../src/services/supabase';

describe('AuthService', () => {
  beforeEach(async () => {
    // Clean up test data
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  it('should register a new user', async () => {
    const result = await AuthService.register(
      '9876543210',
      'password123',
      'Test User',
      'customer'
    );

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.phone).toBe('9876543210');
  });

  it('should handle duplicate phone numbers', async () => {
    // Register first user
    await AuthService.register('9876543210', 'password123', 'User 1', 'customer');
    
    // Try to register second user with same phone
    const result = await AuthService.register('9876543210', 'password123', 'User 2', 'customer');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});
```

### 2. Integration Tests
```typescript
// __tests__/integration/bookingFlow.test.ts
import { AuthService } from '../../src/services/auth.service';
import { BookingService } from '../../src/services/booking.service';

describe('Booking Flow Integration', () => {
  it('should complete full booking flow', async () => {
    // 1. Register customer
    const customerResult = await AuthService.register(
      '9876543210',
      'password123',
      'Test Customer',
      'customer'
    );
    expect(customerResult.success).toBe(true);

    // 2. Register driver
    const driverResult = await AuthService.register(
      '9876543211',
      'password123',
      'Test Driver',
      'driver'
    );
    expect(driverResult.success).toBe(true);

    // 3. Create booking
    const bookingId = await BookingService.createBooking({
      customerId: customerResult.user!.id,
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      status: 'pending',
      tankerSize: 1000,
      basePrice: 500,
      distanceCharge: 100,
      totalPrice: 600,
      deliveryAddress: {
        street: 'Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        latitude: 28.6139,
        longitude: 77.2090,
      },
      distance: 10,
      isImmediate: true,
      paymentStatus: 'pending',
      canCancel: true,
    });

    expect(bookingId).toBeDefined();

    // 4. Driver accepts booking
    await BookingService.updateBookingStatus(bookingId, 'accepted', {
      driverId: driverResult.user!.id,
      driverName: 'Test Driver',
      driverPhone: '9876543211',
    });

    // 5. Verify booking status
    const booking = await BookingService.getBookingById(bookingId);
    expect(booking?.status).toBe('accepted');
    expect(booking?.driverId).toBe(driverResult.user!.id);
  });
});
```

### 3. Real-time Testing
```typescript
// __tests__/realtime/bookingUpdates.test.ts
import { BookingService } from '../../src/services/booking.service';

describe('Real-time Booking Updates', () => {
  it('should receive real-time updates', async (done) => {
    const bookingId = 'test-booking-id';
    let updateReceived = false;

    // Subscribe to updates
    const unsubscribe = BookingService.subscribeToBookingUpdates(
      bookingId,
      (booking) => {
        if (booking && booking.status === 'accepted') {
          updateReceived = true;
          unsubscribe();
          done();
        }
      }
    );

    // Simulate status update
    setTimeout(async () => {
      await BookingService.updateBookingStatus(bookingId, 'accepted');
    }, 1000);

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!updateReceived) {
        unsubscribe();
        done(new Error('Real-time update not received'));
      }
    }, 5000);
  });
});
```

## Deployment Plan

### 1. Environment Setup
```bash
# Production environment variables
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Migration
```bash
# Run migrations in production
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
```

### 3. App Deployment
```bash
# Build for production
expo build:android
expo build:ios

# Or use EAS Build
eas build --platform all
```

### 4. Monitoring Setup
```typescript
// src/services/analytics.service.ts
import { supabase } from './supabase';

export class AnalyticsService {
  static async trackEvent(
    event: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_name: event,
        properties,
        created_at: new Date(),
      });

    if (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  static async trackBookingCreated(bookingId: string, customerId: string): Promise<void> {
    await this.trackEvent('booking_created', {
      booking_id: bookingId,
      customer_id: customerId,
    });
  }

  static async trackBookingCompleted(bookingId: string, driverId: string): Promise<void> {
    await this.trackEvent('booking_completed', {
      booking_id: bookingId,
      driver_id: driverId,
    });
  }
}
```

## Timeline & Milestones

### Week 1: Foundation Setup
- [ ] **Day 1-2**: Supabase project setup and configuration
- [ ] **Day 3-4**: Database schema creation and RLS policies
- [ ] **Day 5**: Basic Supabase client setup and testing

### Week 2: Core Services Migration
- [ ] **Day 1-2**: AuthService migration to Supabase Auth
- [ ] **Day 3-4**: BookingService migration with real-time features
- [ ] **Day 5**: UserStore and BookingStore updates

### Week 3: Advanced Features
- [ ] **Day 1-2**: Real-time subscriptions implementation
- [ ] **Day 3-4**: Push notifications integration
- [ ] **Day 5**: Location tracking service

### Week 4: Data Migration & Testing
- [ ] **Day 1-2**: Data migration scripts and execution
- [ ] **Day 3-4**: Comprehensive testing (unit, integration, real-time)
- [ ] **Day 5**: Performance optimization and bug fixes

### Week 5: Deployment & Monitoring
- [ ] **Day 1-2**: Production deployment
- [ ] **Day 3-4**: Monitoring and analytics setup
- [ ] **Day 5**: Documentation and team training

## Risk Assessment

### High Risk
1. **Data Loss During Migration**
   - **Mitigation**: Complete backup before migration, rollback plan
   - **Testing**: Dry run with test data

2. **Authentication Issues**
   - **Mitigation**: Gradual migration, fallback to local auth
   - **Testing**: Multiple device testing

### Medium Risk
1. **Real-time Performance**
   - **Mitigation**: Connection pooling, error handling
   - **Testing**: Load testing with multiple users

2. **Cost Overruns**
   - **Mitigation**: Usage monitoring, alerts setup
   - **Testing**: Cost estimation with projected usage

### Low Risk
1. **UI/UX Changes**
   - **Mitigation**: Minimal UI changes, user education
   - **Testing**: User acceptance testing

## Post-Migration Optimization

### 1. Performance Optimization
```sql
-- Add additional indexes based on usage patterns
CREATE INDEX CONCURRENTLY idx_bookings_customer_status ON bookings(customer_id, status);
CREATE INDEX CONCURRENTLY idx_bookings_driver_status ON bookings(driver_id, status);
CREATE INDEX CONCURRENTLY idx_users_phone_role ON users(phone, role);
```

### 2. Caching Strategy
```typescript
// src/services/cache.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheService {
  static async cacheUserData(userId: string, data: any): Promise<void> {
    await AsyncStorage.setItem(`user_${userId}`, JSON.stringify(data));
  }

  static async getCachedUserData(userId: string): Promise<any | null> {
    const cached = await AsyncStorage.getItem(`user_${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    await AsyncStorage.removeItem(`user_${userId}`);
  }
}
```

### 3. Analytics Implementation
```typescript
// src/services/analytics.service.ts
export class AnalyticsService {
  static async trackUserEngagement(): Promise<void> {
    // Track user behavior patterns
    await supabase
      .from('user_analytics')
      .insert({
        user_id: getCurrentUserId(),
        event: 'app_opened',
        timestamp: new Date(),
      });
  }

  static async trackBookingMetrics(): Promise<void> {
    // Track booking success rates, completion times, etc.
  }
}
```

### 4. Backup Strategy
```bash
# Automated daily backups
pg_dump -h your-supabase-host -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

## Success Metrics

### Technical Metrics
- [ ] **Migration Success Rate**: 100% data integrity
- [ ] **Performance**: < 2s response time for all operations
- [ ] **Uptime**: 99.9% availability
- [ ] **Real-time Latency**: < 500ms for status updates

### Business Metrics
- [ ] **User Adoption**: 100% users successfully migrated
- [ ] **Feature Usage**: Real-time features adopted by 80%+ users
- [ ] **Error Rate**: < 0.1% error rate
- [ ] **User Satisfaction**: Maintained or improved user experience

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning from AsyncStorage to Supabase. The phased approach ensures minimal disruption while maximizing the benefits of cloud-based, real-time functionality. The detailed implementation guides, testing strategies, and risk mitigation plans provide a solid foundation for successful migration.

**Key Success Factors:**
1. Thorough testing at each phase
2. Gradual rollout to minimize risk
3. Comprehensive monitoring and analytics
4. User education and support
5. Continuous optimization post-migration

The migration will transform the Water Tanker App into a scalable, real-time enabled platform ready for growth and enhanced user experience.
