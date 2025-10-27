# Water Tanker Booking App

A React Native mobile application for booking water tankers, built with Expo and local storage.

## Project Structure

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts
│   ├── customer/        # Customer-specific components
│   ├── driver/          # Driver-specific components
│   └── admin/           # Admin-specific components
├── screens/
│   ├── auth/            # Authentication screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── OTPScreen.tsx
│   ├── customer/        # Customer screens
│   │   ├── CustomerHomeScreen.tsx
│   │   ├── BookingScreen.tsx
│   │   ├── OrderTrackingScreen.tsx
│   │   ├── OrderHistoryScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── SavedAddressesScreen.tsx
│   ├── driver/          # Driver screens
│   │   ├── DriverDashboardScreen.tsx
│   │   ├── AvailableOrdersScreen.tsx
│   │   ├── ActiveOrderScreen.tsx
│   │   ├── DriverEarningsScreen.tsx
│   │   └── DriverProfileScreen.tsx
│   └── admin/           # Admin screens
│       ├── AdminDashboardScreen.tsx
│       ├── AllBookingsScreen.tsx
│       ├── DriverManagementScreen.tsx
│       ├── CustomerManagementScreen.tsx
│       ├── PricingManagementScreen.tsx
│       └── ReportsScreen.tsx
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
│   ├── location.service.ts
│   └── index.ts
├── store/
│   ├── authStore.ts
│   ├── bookingStore.ts
│   ├── userStore.ts
│   └── index.ts
├── types/
│   └── index.ts         # TypeScript interfaces
├── utils/
│   ├── pricing.ts
│   ├── distance.ts
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
- Dashboard with key metrics
- Manage all bookings
- Approve/suspend drivers
- View customer list
- Update pricing rules
- Generate reports

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install dependencies and start the development server:
   ```bash
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

## Database Schema

The app uses Firestore with the following collections:

- `users` - User accounts (customers, drivers, admins)
- `bookings` - Water tanker bookings
- `tankerSizes` - Available tanker sizes and pricing
- `pricing` - Distance-based pricing configuration
- `driverApplications` - Driver registration requests
- `notifications` - In-app notifications

## MVP Scope

This MVP includes:
- ✅ All three user roles in single mobile app
- ✅ Phone + password authentication
- ✅ Scheduled bookings with date/time picker
- ✅ Cash on delivery payment
- ✅ Saved addresses for customers
- ✅ Order tracking with status updates
- ✅ Complete order history
- ✅ Admin dashboard for managing everything
- ✅ Driver earnings tracking
- ✅ Distance-based pricing using Haversine formula

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

The app structure has been implemented according to the plan. All core directories, files, and basic components are in place. The next steps would be to:

1. Install dependencies
2. Implement authentication flow
3. Build out individual screen components
4. Integrate with local storage services
5. Add maps and location services
6. Test and polish the application
# WaterTankerAppv1
