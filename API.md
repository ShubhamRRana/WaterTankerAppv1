# Water Tanker Booking App - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication Service](#authentication-service)
3. [Booking Service](#booking-service)
4. [User Service](#user-service)
5. [Vehicle Service](#vehicle-service)
6. [Payment Service](#payment-service)
7. [Location Service](#location-service)
8. [Location Tracking Service](#location-tracking-service)
9. [Notification Service](#notification-service)
10. [Migration Service](#migration-service)
11. [Utility Functions](#utility-functions)

---

## Overview

This document provides comprehensive API documentation for all services in the Water Tanker Booking App. All services are stateless classes with static methods that interact with Supabase backend.

### Common Patterns

- **Error Handling**: All methods throw errors that should be caught by calling code
- **Type Safety**: All methods are fully typed with TypeScript
- **Data Transformation**: Services use transformers to convert between app types and Supabase format
- **Real-time Support**: Many services support real-time subscriptions via Supabase Realtime

---

## Authentication Service

**File**: `src/services/auth.service.ts`

Handles user authentication, registration, and session management with Supabase Auth.

### Methods

#### `register(phone, password, name, role, additionalData?)`

Register a new user with Supabase Auth and create profile in users table.

**Parameters:**
- `phone: string` - User's phone number (sanitized automatically)
- `password: string` - User's password (hashed by Supabase)
- `name: string` - User's name (sanitized automatically)
- `role: UserRole` - User role ('customer' | 'driver' | 'admin')
- `additionalData?: Partial<User>` - Optional additional user data

**Returns:** `Promise<AuthResult>`

**AuthResult Interface:**
```typescript
interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  availableRoles?: UserRole[];
  requiresRoleSelection?: boolean;
}
```

**Security Features:**
- Input sanitization (phone, name)
- Rate limiting (3 registrations per hour per phone)
- Brute force protection
- Security event logging

**Example:**
```typescript
const result = await AuthService.register(
  '9876543210',
  'password123',
  'John Doe',
  'customer'
);

if (result.success) {
  console.log('User registered:', result.user);
} else {
  console.error('Registration failed:', result.error);
}
```

---

#### `login(phone, password, role?)`

Authenticate user with phone and password.

**Parameters:**
- `phone: string` - User's phone number
- `password: string` - User's password
- `role?: UserRole` - Optional role to login as (if user has multiple roles)

**Returns:** `Promise<AuthResult>`

**Security Features:**
- Input sanitization
- Rate limiting (5 login attempts per 15 minutes)
- Brute force detection (alerts after 5 failed attempts)
- Security event logging

**Example:**
```typescript
const result = await AuthService.login('9876543210', 'password123', 'customer');

if (result.success && result.user) {
  // User logged in successfully
} else if (result.requiresRoleSelection) {
  // User has multiple roles, need to select
  const roles = result.availableRoles || [];
} else {
  console.error('Login failed:', result.error);
}
```

---

#### `logout()`

Sign out current user from Supabase Auth.

**Returns:** `Promise<void>`

**Example:**
```typescript
await AuthService.logout();
```

---

#### `getCurrentUserData()`

Get current authenticated user data from Supabase.

**Returns:** `Promise<User | null>`

**Example:**
```typescript
const user = await AuthService.getCurrentUserData();
if (user) {
  console.log('Current user:', user);
}
```

---

#### `updateUserProfile(updates)`

Update current user's profile.

**Parameters:**
- `updates: Partial<User>` - User profile updates

**Returns:** `Promise<void>`

**Example:**
```typescript
await AuthService.updateUserProfile({
  name: 'John Updated',
  email: 'john@example.com'
});
```

---

#### `initializeApp()`

Initialize the app and check Supabase connection.

**Returns:** `Promise<void>`

**Example:**
```typescript
await AuthService.initializeApp();
```

---

## Booking Service

**File**: `src/services/booking.service.ts`

Handles booking CRUD operations and real-time subscriptions.

### Methods

#### `createBooking(bookingData)`

Create a new booking in Supabase.

**Parameters:**
- `bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>` - Booking data

**Returns:** `Promise<string>` - Booking ID

**Example:**
```typescript
const bookingId = await BookingService.createBooking({
  customerId: 'user-123',
  customerName: 'John Doe',
  customerPhone: '9876543210',
  status: 'pending',
  tankerSize: 10000,
  quantity: 1,
  basePrice: 600,
  distanceCharge: 50,
  totalPrice: 650,
  deliveryAddress: { /* Address object */ },
  scheduledDate: new Date(),
  scheduledTime: '14:00',
  paymentMethod: 'cod',
  paymentStatus: 'pending'
});
```

---

#### `updateBookingStatus(bookingId, status, additionalData?)`

Update booking status and optional additional data.

**Parameters:**
- `bookingId: string` - Booking ID
- `status: BookingStatus` - New status ('pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled')
- `additionalData?: Partial<Booking>` - Optional additional booking data

**Returns:** `Promise<void>`

**Example:**
```typescript
await BookingService.updateBookingStatus(
  'booking-123',
  'accepted',
  {
    driverId: 'driver-456',
    driverName: 'Driver Name',
    driverPhone: '9876543211'
  }
);
```

---

#### `getBookingsByCustomer(customerId)`

Get all bookings for a customer.

**Parameters:**
- `customerId: string` - Customer user ID

**Returns:** `Promise<Booking[]>` - Array of bookings ordered by creation date (newest first)

**Example:**
```typescript
const bookings = await BookingService.getBookingsByCustomer('customer-123');
```

---

#### `getBookingsByDriver(driverId)`

Get all bookings assigned to a driver.

**Parameters:**
- `driverId: string` - Driver user ID

**Returns:** `Promise<Booking[]>` - Array of bookings ordered by creation date (newest first)

**Example:**
```typescript
const bookings = await BookingService.getBookingsByDriver('driver-456');
```

---

#### `getAvailableBookings()`

Get all available bookings (pending status, no driver assigned).

**Returns:** `Promise<Booking[]>` - Array of available bookings

**Example:**
```typescript
const availableBookings = await BookingService.getAvailableBookings();
```

---

#### `getBookingById(bookingId)`

Get a single booking by ID.

**Parameters:**
- `bookingId: string` - Booking ID

**Returns:** `Promise<Booking | null>`

**Example:**
```typescript
const booking = await BookingService.getBookingById('booking-123');
```

---

#### `cancelBooking(bookingId)`

Cancel a booking.

**Parameters:**
- `bookingId: string` - Booking ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await BookingService.cancelBooking('booking-123');
```

---

#### `subscribeToBooking(bookingId, callback)`

Subscribe to real-time updates for a specific booking.

**Parameters:**
- `bookingId: string` - Booking ID
- `callback: (booking: Booking | null) => void` - Callback function

**Returns:** `() => void` - Cleanup function to unsubscribe

**Example:**
```typescript
const unsubscribe = BookingService.subscribeToBooking(
  'booking-123',
  (booking) => {
    console.log('Booking updated:', booking);
  }
);

// Later, to unsubscribe:
unsubscribe();
```

---

## User Service

**File**: `src/services/user.service.ts`

Handles user management operations (admin operations).

### Methods

#### `getAllUsers()`

Get all users from Supabase.

**Returns:** `Promise<User[]>` - Array of all users ordered by creation date (newest first)

**Example:**
```typescript
const users = await UserService.getAllUsers();
```

---

#### `getUsersByRole(role)`

Get users filtered by role.

**Parameters:**
- `role: UserRole` - User role ('customer' | 'driver' | 'admin')

**Returns:** `Promise<User[]>` - Array of users with specified role

**Example:**
```typescript
const drivers = await UserService.getUsersByRole('driver');
```

---

#### `getUserById(userId)`

Get a single user by ID.

**Parameters:**
- `userId: string` - User ID

**Returns:** `Promise<User | null>`

**Example:**
```typescript
const user = await UserService.getUserById('user-123');
```

---

#### `createUser(userData)`

Create a new user (typically used by admin to create drivers).

**Parameters:**
- `userData: Omit<User, 'uid' | 'createdAt'>` - User data

**Returns:** `Promise<User>` - Created user

**Note:** This creates the user profile only. Auth account should be created via `AuthService.register()`.

**Example:**
```typescript
const user = await UserService.createUser({
  phone: '9876543210',
  password: 'hashed-password',
  name: 'Driver Name',
  role: 'driver',
  isApproved: true,
  isAvailable: true
});
```

---

#### `updateUser(userId, updates)`

Update user profile.

**Parameters:**
- `userId: string` - User ID
- `updates: Partial<User>` - User updates

**Returns:** `Promise<void>`

**Example:**
```typescript
await UserService.updateUser('user-123', {
  name: 'Updated Name',
  isAvailable: false
});
```

---

#### `deleteUser(userId)`

Delete a user (admin only).

**Parameters:**
- `userId: string` - User ID

**Returns:** `Promise<void>`

**Note:** This will cascade delete related records due to foreign key constraints.

**Example:**
```typescript
await UserService.deleteUser('user-123');
```

---

#### `subscribeToUserUpdates(userId, callback)`

Subscribe to real-time updates for a specific user.

**Parameters:**
- `userId: string` - User ID
- `callback: (user: User | null) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = UserService.subscribeToUserUpdates(
  'user-123',
  (user) => {
    console.log('User updated:', user);
  }
);
```

---

#### `subscribeToAllUsersUpdates(callback)`

Subscribe to real-time updates for all users (admin only).

**Parameters:**
- `callback: (users: User[]) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = UserService.subscribeToAllUsersUpdates(
  (users) => {
    console.log('Users updated:', users);
  }
);
```

---

## Vehicle Service

**File**: `src/services/vehicle.service.ts`

Handles vehicle CRUD operations.

### Methods

#### `getAllVehicles()`

Get all vehicles from Supabase.

**Returns:** `Promise<Vehicle[]>` - Array of all vehicles ordered by creation date (newest first)

**Example:**
```typescript
const vehicles = await VehicleService.getAllVehicles();
```

---

#### `getVehiclesByAgency(agencyId)`

Get vehicles filtered by agency ID.

**Parameters:**
- `agencyId: string` - Agency (admin) user ID

**Returns:** `Promise<Vehicle[]>` - Array of agency vehicles

**Example:**
```typescript
const vehicles = await VehicleService.getVehiclesByAgency('agency-123');
```

---

#### `getVehicleById(vehicleId)`

Get a single vehicle by ID.

**Parameters:**
- `vehicleId: string` - Vehicle ID

**Returns:** `Promise<Vehicle | null>`

**Example:**
```typescript
const vehicle = await VehicleService.getVehicleById('vehicle-123');
```

---

#### `createVehicle(vehicleData)`

Create a new vehicle.

**Parameters:**
- `vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>` - Vehicle data

**Returns:** `Promise<Vehicle>` - Created vehicle

**Example:**
```typescript
const vehicle = await VehicleService.createVehicle({
  agencyId: 'agency-123',
  vehicleNumber: 'MH-12-AB-1234',
  capacity: 10000,
  vehicleType: 'tanker',
  insuranceExpiry: new Date('2025-12-31'),
  isActive: true
});
```

---

#### `updateVehicle(vehicleId, updates)`

Update a vehicle.

**Parameters:**
- `vehicleId: string` - Vehicle ID
- `updates: Partial<Vehicle>` - Vehicle updates

**Returns:** `Promise<void>`

**Example:**
```typescript
await VehicleService.updateVehicle('vehicle-123', {
  isActive: false,
  insuranceExpiry: new Date('2026-12-31')
});
```

---

#### `deleteVehicle(vehicleId)`

Delete a vehicle.

**Parameters:**
- `vehicleId: string` - Vehicle ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await VehicleService.deleteVehicle('vehicle-123');
```

---

#### `subscribeToVehicleUpdates(vehicleId, callback)`

Subscribe to real-time updates for a specific vehicle.

**Parameters:**
- `vehicleId: string` - Vehicle ID
- `callback: (vehicle: Vehicle | null) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = VehicleService.subscribeToVehicleUpdates(
  'vehicle-123',
  (vehicle) => {
    console.log('Vehicle updated:', vehicle);
  }
);
```

---

#### `subscribeToAgencyVehiclesUpdates(agencyId, callback)`

Subscribe to real-time updates for all vehicles in an agency.

**Parameters:**
- `agencyId: string` - Agency ID
- `callback: (vehicles: Vehicle[]) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = VehicleService.subscribeToAgencyVehiclesUpdates(
  'agency-123',
  (vehicles) => {
    console.log('Agency vehicles updated:', vehicles);
  }
);
```

---

## Payment Service

**File**: `src/services/payment.service.ts`

Handles payment processing (currently COD only).

### Methods

#### `processCODPayment(bookingId, amount)`

Process Cash on Delivery payment - marks payment as pending in Supabase.

**Parameters:**
- `bookingId: string` - Booking ID
- `amount: number` - Payment amount

**Returns:** `Promise<PaymentResult>`

**PaymentResult Interface:**
```typescript
interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}
```

**Example:**
```typescript
const result = await PaymentService.processCODPayment('booking-123', 650);

if (result.success) {
  console.log('Payment processed:', result.paymentId);
} else {
  console.error('Payment failed:', result.error);
}
```

---

#### `confirmCODPayment(bookingId)`

Mark payment as completed when driver confirms delivery.

**Parameters:**
- `bookingId: string` - Booking ID

**Returns:** `Promise<PaymentResult>`

**Example:**
```typescript
const result = await PaymentService.confirmCODPayment('booking-123');

if (result.success) {
  console.log('Payment confirmed:', result.paymentId);
}
```

---

## Location Service

**File**: `src/services/location.service.ts`

Handles location operations and distance calculations.

### Methods

#### `calculateDistance(point1, point2)`

Calculate distance between two points using Haversine formula.

**Parameters:**
- `point1: Location` - First location point
- `point2: Location` - Second location point

**Returns:** `number` - Distance in kilometers (rounded to 2 decimal places)

**Location Interface:**
```typescript
interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}
```

**Example:**
```typescript
const distance = LocationService.calculateDistance(
  { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
  { latitude: 18.5204, longitude: 73.8567 }  // Pune
);
console.log(`Distance: ${distance} km`);
```

---

#### `requestPermissions()`

Request location permissions.

**Returns:** `Promise<boolean>` - True if permissions granted

**Example:**
```typescript
const granted = await LocationService.requestPermissions();
if (granted) {
  console.log('Location permissions granted');
}
```

---

#### `hasPermissions()`

Check if location permissions are granted.

**Returns:** `Promise<boolean>`

**Example:**
```typescript
const hasPermission = await LocationService.hasPermissions();
```

---

#### `getCurrentLocation()`

Get current location using device GPS (React Native compatible).

**Returns:** `Promise<Location>`

**Throws:** Error if permissions denied or location unavailable

**Example:**
```typescript
try {
  const location = await LocationService.getCurrentLocation();
  console.log('Current location:', location);
} catch (error) {
  console.error('Failed to get location:', error);
}
```

---

#### `watchPositionAsync(callback, options?)`

Watch position changes continuously.

**Parameters:**
- `callback: (location: Location) => void` - Callback function for location updates
- `options?: LocationOptions` - Optional location options

**Returns:** `Promise<LocationSubscription>` - Subscription object with remove() method

**Example:**
```typescript
const subscription = await LocationService.watchPositionAsync(
  (location) => {
    console.log('Location updated:', location);
  },
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10
  }
);

// Later, to stop watching:
subscription.remove();
```

---

## Location Tracking Service

**File**: `src/services/locationTracking.service.ts`

Handles real-time location tracking for drivers during active bookings.

### Methods

#### `startTracking(driverId, bookingId?, updateInterval?)`

Start tracking location for a driver.

**Parameters:**
- `driverId: string` - Driver's user ID
- `bookingId?: string | null` - Optional booking ID if tracking for a specific booking
- `updateInterval?: number` - How often to update location (in milliseconds, default: 10000)

**Returns:** `Promise<void>`

**Example:**
```typescript
await LocationTrackingService.startTracking(
  'driver-123',
  'booking-456',
  10000 // Update every 10 seconds
);
```

---

#### `stopTracking(driverId)`

Stop tracking location for a driver.

**Parameters:**
- `driverId: string` - Driver's user ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await LocationTrackingService.stopTracking('driver-123');
```

---

#### `getDriverLocation(driverId, bookingId?)`

Get current driver location.

**Parameters:**
- `driverId: string` - Driver's user ID
- `bookingId?: string | null` - Optional booking ID

**Returns:** `Promise<DriverLocation | null>`

**DriverLocation Interface:**
```typescript
interface DriverLocation {
  id: string;
  driverId: string;
  bookingId: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}
```

**Example:**
```typescript
const location = await LocationTrackingService.getDriverLocation(
  'driver-123',
  'booking-456'
);
```

---

#### `subscribeToLocation(driverId, bookingId, callback)`

Subscribe to real-time location updates for a driver.

**Parameters:**
- `driverId: string` - Driver's user ID
- `bookingId: string | null` - Booking ID
- `callback: (location: DriverLocation | null) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = LocationTrackingService.subscribeToLocation(
  'driver-123',
  'booking-456',
  (location) => {
    console.log('Driver location updated:', location);
  }
);
```

---

## Notification Service

**File**: `src/services/notification.service.ts`

Handles push notifications and in-app notifications.

### Methods

#### `requestPermissions()`

Request notification permissions.

**Returns:** `Promise<boolean>` - True if permissions granted

**Example:**
```typescript
const granted = await NotificationService.requestPermissions();
```

---

#### `registerForPushNotifications(userId)`

Register device for push notifications.

**Parameters:**
- `userId: string` - User ID

**Returns:** `Promise<string | null>` - Push token or null if failed

**Example:**
```typescript
const token = await NotificationService.registerForPushNotifications('user-123');
if (token) {
  console.log('Push token:', token);
}
```

---

#### `sendLocalNotification(title, body, data?)`

Send a local notification.

**Parameters:**
- `title: string` - Notification title
- `body: string` - Notification body
- `data?: Record<string, any>` - Optional notification data

**Returns:** `Promise<void>`

**Example:**
```typescript
await NotificationService.sendLocalNotification(
  'Booking Accepted',
  'Your booking has been accepted by a driver',
  { bookingId: 'booking-123' }
);
```

---

#### `createNotification(userId, title, message, type, relatedBookingId?)`

Create an in-app notification in Supabase.

**Parameters:**
- `userId: string` - User ID
- `title: string` - Notification title
- `message: string` - Notification message
- `type: 'booking' | 'payment' | 'system'` - Notification type
- `relatedBookingId?: string` - Optional related booking ID

**Returns:** `Promise<Notification | null>`

**Example:**
```typescript
const notification = await NotificationService.createNotification(
  'user-123',
  'Booking Accepted',
  'Your booking has been accepted',
  'booking',
  'booking-456'
);
```

---

#### `getNotifications(userId, limit?)`

Get notifications for a user.

**Parameters:**
- `userId: string` - User ID
- `limit?: number` - Maximum number of notifications (default: 50)

**Returns:** `Promise<Notification[]>` - Array of notifications ordered by creation date (newest first)

**Example:**
```typescript
const notifications = await NotificationService.getNotifications('user-123', 20);
```

---

#### `markAsRead(notificationId)`

Mark notification as read.

**Parameters:**
- `notificationId: string` - Notification ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await NotificationService.markAsRead('notification-123');
```

---

#### `markAllAsRead(userId)`

Mark all notifications as read for a user.

**Parameters:**
- `userId: string` - User ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await NotificationService.markAllAsRead('user-123');
```

---

#### `getUnreadCount(userId)`

Get unread notification count.

**Parameters:**
- `userId: string` - User ID

**Returns:** `Promise<number>`

**Example:**
```typescript
const count = await NotificationService.getUnreadCount('user-123');
console.log(`Unread notifications: ${count}`);
```

---

#### `deleteNotification(notificationId)`

Delete a notification.

**Parameters:**
- `notificationId: string` - Notification ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await NotificationService.deleteNotification('notification-123');
```

---

#### `subscribeToNotifications(userId, callback)`

Subscribe to real-time notification updates.

**Parameters:**
- `userId: string` - User ID
- `callback: (notification: Notification) => void` - Callback function

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const unsubscribe = NotificationService.subscribeToNotifications(
  'user-123',
  (notification) => {
    console.log('New notification:', notification);
  }
);
```

---

#### `setupNotificationListeners(onNotificationReceived?, onNotificationTapped?)`

Set up notification listeners for foreground notifications and user taps.

**Parameters:**
- `onNotificationReceived?: (notification: Notification) => void` - Callback for received notifications
- `onNotificationTapped?: (response: NotificationResponse) => void` - Callback for tapped notifications

**Returns:** `() => void` - Cleanup function

**Example:**
```typescript
const cleanup = NotificationService.setupNotificationListeners(
  (notification) => {
    console.log('Notification received:', notification);
  },
  (response) => {
    console.log('Notification tapped:', response);
  }
);
```

---

## Migration Service

**File**: `src/services/migration.service.ts`

Handles data migration from localStorage to Supabase.

### Methods

#### `migrateAll(options?)`

Migrate all data from localStorage to Supabase.

**Parameters:**
- `options?: MigrationOptions` - Optional migration options

**MigrationOptions Interface:**
```typescript
interface MigrationOptions {
  skipExisting?: boolean; // Skip records that already exist
  createAuthAccounts?: boolean; // Create Supabase Auth accounts for users
  dryRun?: boolean; // Preview migration without executing
}
```

**Returns:** `Promise<MigrationResult>`

**MigrationResult Interface:**
```typescript
interface MigrationResult {
  success: boolean;
  users: { migrated: number; errors: number; warnings: string[] };
  addresses: { migrated: number; errors: number; warnings: string[] };
  vehicles: { migrated: number; errors: number; warnings: string[] };
  bookings: { migrated: number; errors: number; warnings: string[] };
  errors: string[];
  warnings: string[];
}
```

**Example:**
```typescript
const result = await MigrationService.migrateAll({
  skipExisting: true,
  createAuthAccounts: true,
  dryRun: false
});

console.log(`Migrated ${result.users.migrated} users`);
console.log(`Migrated ${result.bookings.migrated} bookings`);
```

---

#### `validateData()`

Validate data integrity before migration.

**Returns:** `Promise<ValidationResult>`

**Example:**
```typescript
const validation = await MigrationService.validateData();
if (validation.isValid) {
  console.log('Data is valid for migration');
} else {
  console.error('Validation errors:', validation.errors);
}
```

---

## Utility Functions

### Validation Utilities

**File**: `src/utils/validation.ts`

#### `ValidationUtils.validatePhone(phone, required?)`

Validate phone number (10 digits, Indian format).

#### `ValidationUtils.validatePassword(password, required?)`

Validate password (min 6 characters).

#### `ValidationUtils.validateEmail(email, required?)`

Validate email address.

#### `ValidationUtils.validateName(name, required?)`

Validate name (2-50 characters, letters and spaces only).

---

### Sanitization Utilities

**File**: `src/utils/sanitization.ts`

#### `SanitizationUtils.sanitizeString(input)`

Sanitize string input (removes XSS, dangerous characters).

#### `SanitizationUtils.sanitizePhone(phone)`

Sanitize phone number (removes non-digits).

#### `SanitizationUtils.sanitizeEmail(email)`

Sanitize email address.

---

### Pricing Utilities

**File**: `src/utils/pricing.ts`

#### `PricingUtils.calculatePrice(basePrice, distance, pricePerKm)`

Calculate total price based on base price and distance.

#### `PricingUtils.formatPrice(amount)`

Format price in Indian numbering system (₹12,34,567).

---

### Rate Limiter

**File**: `src/utils/rateLimiter.ts`

#### `rateLimiter.isAllowed(action, identifier)`

Check if action is allowed (not rate limited).

#### `rateLimiter.record(action, identifier)`

Record an action for rate limiting.

---

### Subscription Manager

**File**: `src/utils/subscriptionManager.ts`

#### `SubscriptionManager.subscribe(config, callback)`

Subscribe to Supabase Realtime with automatic reconnection.

**Returns:** `() => void` - Cleanup function

---

## Error Handling

All service methods throw errors that should be caught:

```typescript
try {
  const result = await AuthService.login(phone, password);
  // Handle success
} catch (error) {
  // Handle error
  console.error('Login error:', error);
}
```

## Type Definitions

All types are defined in `src/types/index.ts`. Key types:

- `User` - Discriminated union (CustomerUser | DriverUser | AdminUser)
- `Booking` - Booking entity
- `Vehicle` - Vehicle entity
- `Address` - Address entity
- `Notification` - Notification entity
- `UserRole` - 'customer' | 'driver' | 'admin'
- `BookingStatus` - 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'

---

*Last Updated: 2024-12-19*
*Document Version: 1.0*

