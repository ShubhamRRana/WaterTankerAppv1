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
- ✅ **Dashboard with key metrics** - Real-time platform overview with statistics
- ✅ **Quick navigation** - Easy access to all management sections
- ✅ **Recent activity feed** - Monitor latest bookings and platform activity
- ✅ **Pull-to-refresh** - Update data in real-time
- Manage all bookings
- Approve/suspend drivers
- View customer list
- Update pricing rules
- Generate reports

## Admin Dashboard Features

The Admin Dashboard provides a comprehensive overview of the platform with the following features:

### 📊 **Real-time Statistics**
- **Total Bookings**: Complete count of all platform bookings
- **Pending Orders**: Orders awaiting driver assignment
- **Completed Orders**: Successfully delivered orders
- **Total Revenue**: Sum of all completed order payments
- **Active Drivers**: Currently available drivers
- **Total Customers**: Registered customer count

### 🚀 **Quick Actions**
- **All Bookings**: Navigate to complete booking management
- **Driver Management**: Access driver approval and management tools
- **Customer Management**: View and manage customer accounts
- **Pricing Management**: Configure pricing rules and tanker sizes
- **Reports & Analytics**: Access detailed reporting tools

### 📱 **Recent Activity Feed**
- Shows the latest 5 bookings with key details
- Displays customer name, tanker size, status, price, and location
- Includes timestamps for easy tracking
- Empty state handling when no bookings exist

### 🎨 **Modern UI Design**
- iOS-style interface with clean, professional appearance
- Color-coded statistics cards with intuitive icons
- Pull-to-refresh functionality for real-time updates
- Responsive layout optimized for mobile devices
- Consistent spacing and typography following design system

### 🔧 **Technical Implementation**
- **State Management**: Integrated with Zustand stores for real-time data
- **TypeScript**: Fully typed components with proper error handling
- **Performance**: Optimized rendering with React hooks and memoization
- **Navigation**: Seamless tab-based navigation between admin sections
- **Error Handling**: Comprehensive error states and loading indicators

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
- ✅ Admin dashboard with comprehensive metrics and navigation
- ✅ Driver earnings tracking
- ✅ Distance-based pricing using Haversine formula
- ✅ Modern UI with proper TypeScript support
- ✅ State management with Zustand stores

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
- **Admin Dashboard**: Fully implemented with real-time metrics, navigation cards, and activity feed
- **Navigation System**: Complete tab-based navigation for all user roles
- **TypeScript Support**: All components properly typed with no compilation errors
- **State Management**: Zustand stores for authentication, bookings, and users
- **UI Components**: Reusable components (Button, Card, Input, Typography, LoadingSpinner)
- **Project Structure**: Complete directory structure with all core files

### 🚧 **In Progress:**
- Individual screen implementations for customer and driver flows
- Authentication flow integration
- Local storage service implementation
- Maps and location services integration

### 📋 **Next Steps:**
1. Implement customer booking flow
2. Build driver management screens
3. Add maps integration for location selection
4. Implement real-time order tracking
5. Add comprehensive testing
6. Polish UI/UX and add animations
