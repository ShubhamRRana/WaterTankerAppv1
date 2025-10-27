# Water Tanker Booking App - Implementation Plan

## Tech Stack

- **Frontend**: React Native with Expo (TypeScript)
- **Backend**: Local Storage (AsyncStorage)
- **Payment**: Cash on Delivery (COD) only in MVP - payment gateway in v2
- **Maps**: Google Maps API for location selection, Haversine formula for distance
- **State Management**: Zustand (lightweight, perfect for solo dev)
- **Navigation**: React Navigation v6

## MVP Scope & Simplifications

**What's INCLUDED in MVP:**

- All three user roles (Customer, Driver, Admin) in single mobile app
- Phone + password authentication
- Scheduled bookings with date/time picker
- Cash on delivery payment
- Saved addresses for customers
- Full profile editing with photo upload
- Order tracking with status updates
- Complete order history
- Admin dashboard for managing everything
- Driver earnings tracking
- Distance-based pricing using Haversine formula

**What's EXCLUDED from MVP (v2 features):**

- Online payment gateway (Razorpay/Stripe)
- Immediate/ASAP bookings
- Driver self-registration and approval workflow
- Push notifications (in-app notifications only)
- Ratings and reviews
- Real-time GPS tracking
- Google Distance Matrix API (using Haversine instead)
- Automated driver assignment

**Why these simplifications:**

- Reduces development time from 26-34 days to ~18-22 days
- Focuses on core booking workflow validation
- Cash payment reduces payment gateway complexity and costs
- Scheduled-only bookings simplify driver coordination
- Admin-created drivers ensure quality control from start

## Project Architecture

### Database Schema (Firestore Collections)

**users**

```typescript
{
  uid: string;
  role: 'customer' | 'driver' | 'admin';
  phone: string;
  password: string; // hashed
  name: string;
  email?: string;
  profileImage?: string;
  createdAt: timestamp;
  // Customer specific
  savedAddresses?: Address[];
  // Driver specific
  vehicleNumber?: string;
  licenseNumber?: string;
  driverLicenseImage?: string;
  vehicleRegistrationImage?: string;
  isApproved?: boolean; // Admin approval required
  isAvailable?: boolean;
  totalEarnings?: number;
  completedOrders?: number;
}
```

**bookings**

```typescript
{
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';
  tankerSize: number; // in liters (custom sizes)
  basePrice: number;
  distanceCharge: number;
  totalPrice: number;
  deliveryAddress: Address;
  distance: number; // in km
  scheduledFor?: timestamp; // null for immediate, date/time for scheduled
  isImmediate: boolean;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentId?: string;
  cancellationReason?: string;
  canCancel: boolean; // false once driver accepts
  createdAt: timestamp;
  updatedAt: timestamp;
  acceptedAt?: timestamp;
  deliveredAt?: timestamp;
}
```

**tankerSizes**

```typescript
{
  id: string;
  size: number; // in liters
  basePrice: number;
  isActive: boolean;
  displayName: string; // e.g., "1000 Liters", "Small Tanker"
}
```

**pricing**

```typescript
{
  pricePerKm: number;
  minimumCharge: number;
  updatedAt: timestamp;
  updatedBy: string; // admin uid
}
```

**driverApplications** (for driver registration requests)

```typescript
{
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber: string;
  licenseNumber: string;
  driverLicenseImage: string;
  vehicleRegistrationImage: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: timestamp;
  reviewedBy?: string; // admin uid
  reviewedAt?: timestamp;
  rejectionReason?: string;
}
```

**notifications** (in-app only)

```typescript
{
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'system';
  isRead: boolean;
  relatedBookingId?: string;
  createdAt: timestamp;
}
```

### App Structure

```
src/
├── components/
│   ├── common/          # Shared components
│   ├── customer/        # Customer-specific components
│   ├── driver/          # Driver-specific components
│   └── admin/           # Admin-specific components
├── screens/
│   ├── auth/            # Login, Register, OTP
│   ├── customer/        # Customer booking flow
│   ├── driver/          # Driver dashboard, orders
│   └── admin/           # Admin dashboard, analytics
├── navigation/
│   ├── AuthNavigator.tsx
│   ├── CustomerNavigator.tsx
│   ├── DriverNavigator.tsx
│   └── AdminNavigator.tsx
├── services/
│   ├── localStorage.ts    # Local storage service
│   ├── auth.service.ts
│   ├── booking.service.ts
│   ├── payment.service.ts
│   └── location.service.ts
├── store/
│   ├── authStore.ts
│   ├── bookingStore.ts
│   └── userStore.ts
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   ├── pricing.ts
│   ├── distance.ts
│   └── validation.ts
└── constants/
    └── config.ts
```

## Implementation Phases

### Phase 1: Project Setup & Authentication

1. Initialize Expo project with TypeScript template
2. Set up local storage service with AsyncStorage
3. Create authentication screens (Login, Register with phone + password)
4. Implement role-based navigation (Customer/Driver/Admin)
6. Set up Zustand stores for auth state

### Phase 2: Customer Module

1. Customer home screen with booking form
2. Location picker with Google Maps integration
3. Tanker size selection (e.g., 1000L, 2000L, 5000L)
4. Distance calculation and price estimation
5. Order confirmation screen
6. Payment integration (Razorpay/Stripe)
7. Order tracking screen with status updates
8. Order history screen
9. Profile management

### Phase 3: Driver Module

1. Driver dashboard showing available orders
2. Accept/reject order functionality
3. Active order details screen
4. Update order status (in_transit, delivered)
5. Order history for driver
6. Earnings summary
7. Availability toggle

### Phase 4: Admin Module

1. Admin dashboard with analytics
2. View all bookings (pending, active, completed)
3. Manage drivers (approve, suspend)
4. Manage customers
5. Update pricing configuration
6. Revenue reports
7. Driver performance metrics

### Phase 5: Core Services & Integration

1. Local Storage CRUD operations
2. Simulated real-time updates with polling
3. Google Maps Distance Matrix API integration
4. Dynamic pricing calculation
5. Payment gateway integration
6. Push notifications setup (Expo Notifications)
7. Error handling and loading states

### Phase 6: Testing & Polish

1. Test all user flows (customer, driver, admin)
2. Handle edge cases and error scenarios
3. Optimize performance
4. Add loading skeletons and animations
5. Implement proper form validation
6. Add confirmation dialogs for critical actions

### Phase 7: Deployment Preparation

1. Configure app.json for production
2. Set up environment variables
3. Create app icons and splash screens
4. Prepare store listings
5. Build with EAS Build
6. Submit to App Store and Google Play

## Key Features by Role

### Customer Features

- Phone + password authentication
- Browse tanker sizes and prices
- Select delivery location on map
- View price estimate based on distance
- Book tanker with online payment
- Track order status in real-time
- View order history
- Save multiple delivery addresses
- Rate and review completed orders

### Driver Features

- Phone + password authentication
- View available booking requests
- Accept/reject bookings
- Update order status
- View earnings and completed orders
- Toggle availability status
- View customer location and contact

### Admin Features

- Dashboard with key metrics
- Manage all bookings
- Approve/suspend drivers
- View customer list
- Update pricing rules
- Generate reports
- Monitor system health

## Required External Services

1. **Google Cloud Platform**

   - Maps JavaScript API
   - Distance Matrix API
   - Places API

2. **Payment Gateway**

   - Razorpay (recommended for India) or Stripe

3. **Expo Account** (for builds and notifications)

## Environment Variables Needed

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

GOOGLE_MAPS_API_KEY=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

## Estimated Timeline (Solo Developer)

- Phase 1: 3-4 days
- Phase 2: 5-7 days
- Phase 3: 4-5 days
- Phase 4: 4-5 days
- Phase 5: 5-6 days
- Phase 6: 3-4 days
- Phase 7: 2-3 days

**Total: 26-34 days** of focused development

## Next Steps After Plan Approval

1. Create Expo project with TypeScript template
2. Set up local storage service
3. Install required dependencies
4. Create folder structure
5. Begin with authentication implementation