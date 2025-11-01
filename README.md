# Water Tanker Booking App

A React Native mobile application for booking water tankers, built with Expo and local storage.

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Typography.tsx
│   │   └── index.ts
│   ├── customer/
│   ├── driver/
│   └── admin/
├── screens/
│   ├── auth/
│   │   ├── RoleEntryScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── RoleSelectionScreen.tsx
│   ├── customer/
│   │   ├── CustomerHomeScreen.tsx
│   │   ├── BookingScreen.tsx
│   │   ├── OrderTrackingScreen.tsx
│   │   ├── OrderHistoryScreen.tsx
│   │   ├── PastOrdersScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SavedAddressesScreen.tsx
│   ├── driver/
│   │   ├── OrdersScreen.tsx
│   │   ├── AvailableOrdersScreen.tsx
│   │   ├── ActiveOrderScreen.tsx
│   │   ├── DriverEarningsScreen.tsx
│   │   └── DriverProfileScreen.tsx
│   └── admin/
│       ├── AllBookingsScreen.tsx
│       ├── DriverManagementScreen.tsx
│       ├── VehicleManagementScreen.tsx
│       ├── CustomerManagementScreen.tsx
│       ├── ReportsScreen.tsx
│       └── AdminProfileScreen.tsx
├── navigation/
│   ├── AuthNavigator.tsx
│   ├── CustomerNavigator.tsx
│   ├── DriverNavigator.tsx
│   └── AdminNavigator.tsx
├── services/
│   ├── localStorage.ts
│   ├── auth.service.ts
│   ├── booking.service.ts
│   ├── payment.service.ts
│   ├── location.service.ts
│   └── index.ts
├── store/
│   ├── authStore.ts
│   ├── bookingStore.ts
│   ├── userStore.ts
│   ├── vehicleStore.ts
│   └── index.ts
├── types/
│   └── index.ts
├── utils/
│   ├── distance.ts
│   ├── loginRestrictionTest.ts
│   ├── pricing.ts
│   ├── validation.ts
│   └── index.ts
└── constants/
    └── config.ts
```

## Tech Stack

- **Frontend**: React Native with Expo (TypeScript)
- **Backend**: Local Storage (AsyncStorage)
- **State Management**: Zustand
- **Navigation**: React Navigation v6
- **Maps**: React Native Maps
- **Payment**: Cash on Delivery (COD) for MVP
- **UI Design**: iOS-style design system with consistent colors and spacing
- **Icons**: Expo Vector Icons (Ionicons)

## Key Features

### Customer Features
- Phone + password authentication
- Browse tanker sizes and prices
- Select delivery location on map
- View price estimate based on distance
- Book tanker with scheduled delivery
- Track order status in real-time
- View order history
- Save multiple delivery addresses

### Driver Features
- Phone + password authentication
- View available booking requests
- Accept/reject bookings
- Update order status
- View earnings and completed orders
- Toggle availability status

### Admin Features
- Tab-based navigation (Bookings, Drivers, Vehicles, Reports, Profile)
- **All Bookings Management**: View, filter, and manage all platform bookings
- **Driver Management**: Create, approve, suspend drivers with comprehensive profile management
- **Vehicle Management**: Add, edit, delete vehicles with insurance and capacity tracking
- **Customer Management**: View and manage customer accounts
- **Reports & Analytics**: View comprehensive platform statistics and analytics
- **Profile Management**: Admin profile editing with photo upload

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install dependencies and start the development server:
   ```bash
   npm start
   ```

## Auth Flow (Multi-Role)

- Start at Role Entry screen to choose: Customer, Driver, or Admin.
- Login respects the chosen role when multiple accounts exist.
- Sign Up no longer asks for role; it uses the chosen role from Role Entry/Login.

## Environment Variables

For MVP, the app uses local storage (AsyncStorage) and doesn't require external API keys. However, for production enhancements, you may need:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key  # Optional: For enhanced map features
```

**Note**: The app currently works without API keys as it uses:
- Local storage (AsyncStorage) for data persistence
- React Native Maps for map display (works without API key in development)
- Haversine formula for distance calculations (no API calls needed)

## Data Storage

The app uses AsyncStorage (local storage) with the following data structures:

- `users` - User accounts (customers, drivers, admins)
- `bookings` - Water tanker bookings
- `vehicles` - Vehicle/agency fleet management
- `tankerSizes` - Available tanker sizes and pricing
- `pricing` - Distance-based pricing configuration
- `driverApplications` - Driver registration requests
- `notifications` - In-app notifications

## MVP Scope

This MVP includes:
- ✅ All three user roles in single mobile app
- ✅ Phone + password authentication with multi-role support
- ✅ Scheduled bookings with date/time picker
- ✅ Cash on delivery payment
- ✅ Saved addresses for customers
- ✅ Order tracking with status updates
- ✅ Complete order history (current and past orders)
- ✅ Admin tab-based navigation with comprehensive management tools
- ✅ Driver management (create, approve, suspend, edit)
- ✅ Vehicle/agency fleet management
- ✅ Driver earnings tracking
- ✅ Distance-based pricing using Haversine formula
- ✅ Modern iOS-style UI with proper TypeScript support
- ✅ State management with Zustand stores (auth, bookings, users, vehicles)
- ✅ Profile management with photo upload for all roles

## Future Enhancements (v2)

- Online payment gateway integration
- Immediate/ASAP bookings
- Driver self-registration workflow
- Push notifications
- Ratings and reviews
- Real-time GPS tracking
- Google Distance Matrix API integration
- Automated driver assignment

## Development Status

### ✅ **Completed Features:**
- **Authentication System**: Complete multi-role authentication with role entry, login, register, and role selection
- **Navigation System**: Complete tab-based navigation for all user roles (Customer, Driver, Admin)
- **Customer Screens**: Home, Booking, Order Tracking, Order History, Past Orders, Profile, Saved Addresses
- **Driver Screens**: Orders, Active Order, Earnings, Profile
- **Admin Screens**: All Bookings, Driver Management, Vehicle Management, Customer Management, Reports, Profile
- **TypeScript Support**: All components properly typed with comprehensive type definitions
- **State Management**: Zustand stores for authentication, bookings, users, and vehicles
- **Services**: Local storage, auth, booking, payment, and location services
- **UI Components**: Reusable common components (Button, Card, Input, Typography, LoadingSpinner)
- **Utils**: Distance calculation, pricing, validation utilities
- **Configuration**: Comprehensive app configuration with constants and error messages

### 🔧 **Current Implementation Details:**
- **Local Storage**: All data persisted using AsyncStorage
- **Maps**: React Native Maps integration for location selection
- **Image Picker**: Expo Image Picker for profile photo uploads
- **Document Picker**: Support for driver license and vehicle registration documents
- **Location Services**: Expo Location for GPS and location services
- **Notifications**: Expo Notifications setup (in-app notifications)

### 📋 **Future Enhancements:**
1. Online payment gateway integration (Razorpay/Stripe)
2. Push notifications implementation
3. Real-time GPS tracking
4. Google Distance Matrix API integration
5. Driver self-registration workflow
6. Ratings and reviews system
7. Immediate/ASAP bookings
8. Comprehensive testing suite
9. Performance optimization and animations
