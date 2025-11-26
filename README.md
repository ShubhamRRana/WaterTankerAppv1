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
│   │   ├── CustomerMenuDrawer.tsx
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
│   │   ├── CollectPaymentScreen.tsx
│   │   └── DriverEarningsScreen.tsx
│   └── admin/
│       ├── AllBookingsScreen.tsx
│       ├── DriverManagementScreen.tsx
│       ├── VehicleManagementScreen.tsx
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
│   ├── locationTracking.service.ts
│   ├── notification.service.ts
│   ├── user.service.ts
│   ├── vehicle.service.ts
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
│   ├── pricing.ts          # Pricing calculations and Indian numbering system formatting
│   ├── validation.ts
│   ├── sanitization.ts
│   ├── rateLimiter.ts
│   ├── errorLogger.ts
│   ├── securityLogger.ts
│   ├── securityAudit.ts
│   ├── sessionManager.ts
│   ├── subscriptionManager.ts
│   ├── reportCalculations.ts
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
- **UI Design**: iOS-style design system with centralized color configuration (UI_CONFIG)
- **Icons**: Expo Vector Icons (Ionicons)
- **Number Formatting**: Indian numbering system (lakhs/crores) for amounts and quantities

## Key Features

### Customer Features
- Phone + password authentication
- Burger menu navigation (Home, Orders, Profile) in header
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
- Start delivery and update order status
- Collect payment workflow with dedicated payment screen
- View earnings and completed orders
- Toggle availability status

### Admin Features
- Tab-based navigation (Bookings, Drivers, Vehicles, Reports, Profile)
- **All Bookings Management**: View, filter, and manage all platform bookings
- **Driver Management**: Create, approve, suspend drivers with comprehensive profile management
- **Vehicle Management**: Add, edit, delete vehicles with insurance and capacity tracking
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
- ✅ Customer burger menu navigation with drawer interface
- ✅ Admin tab-based navigation with comprehensive management tools
- ✅ Driver management (create, approve, suspend, edit)
- ✅ Vehicle/agency fleet management
- ✅ Driver earnings tracking
- ✅ Driver payment collection workflow (Collect Payment screen)
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

## Number Formatting

The app implements the **Indian numbering system** for displaying amounts and quantities throughout the application. This ensures proper comma placement according to Indian standards:

- **Format**: Last 3 digits grouped, then groups of 2 digits
- **Example**: `1234567` displays as `12,34,567` (not `1,234,567`)
- **Implementation**: Custom formatter in `PricingUtils.formatPrice()` and `PricingUtils.formatNumber()`
- **Applied to**: All amounts (prices, earnings, revenue) and quantities (tanker quantities, order counts) across all screens

This formatting is applied consistently across:
- Customer screens (booking prices, order history, past orders)
- Driver screens (earnings, order details)
- Admin screens (revenue, bookings, customer stats, vehicle prices)

## Development Status

### ✅ **Completed Features:**
- **Authentication System**: Complete multi-role authentication with role entry, login, register, and role selection
- **Navigation System**: 
  - Customer: Burger menu navigation in header (Home, Orders, Profile)
  - Driver: Bottom tab navigation (Orders, Earnings)
  - Admin: Bottom tab navigation (Bookings, Drivers, Vehicles, Reports, Profile)
- **Customer Screens**: Home, Booking, Order Tracking, Order History, Past Orders, Profile, Saved Addresses
- **Driver Screens**: Orders, Active Order, Collect Payment, Earnings, Profile
- **Admin Screens**: All Bookings, Driver Management, Vehicle Management, Reports, Profile
- **TypeScript Support**: All components properly typed with comprehensive type definitions
- **State Management**: Zustand stores for authentication, bookings, users, and vehicles
- **Services**: Local storage, auth, booking, payment, location, location tracking, notification, user, and vehicle services
- **UI Components**: Reusable common components (Button, Card, Input, Typography, LoadingSpinner, CustomerMenuDrawer)
- **Utils**: Distance calculation, pricing, validation, sanitization, rate limiting, error logging, security logging, security audit, session management, subscription management, and report calculations
- **Number Formatting**: Indian numbering system implementation for all amounts and quantities (e.g., ₹12,34,567 instead of ₹1,234,567)
- **Configuration**: Comprehensive app configuration with constants, error messages, and centralized UI_CONFIG color system

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
8. Performance optimization and animations
