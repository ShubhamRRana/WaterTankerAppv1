// App configuration constants

export const APP_CONFIG = {
  name: 'Water Tanker Booking',
  version: '1.0.0',
  description: 'Book water tankers for your home or business',
};

// API Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Local Storage Configuration
export const STORAGE_CONFIG = {
  collections: {
    users: 'users_collection',
    bookings: 'bookings',
    tankerSizes: 'tankerSizes',
    pricing: 'pricing',
    driverApplications: 'driverApplications',
    notifications: 'notifications',
  },
};

// Booking Configuration
export const BOOKING_CONFIG = {
  maxAdvanceBookingDays: 30,
  minAdvanceBookingHours: 24,
  businessHours: {
    start: 6, // 6 AM
    end: 22, // 10 PM
  },
  defaultTankerSizes: [
    { size: 10000, basePrice: 600, displayName: '10000 Liters' },
    { size: 15000, basePrice: 900, displayName: '15000 Liters' },
  ],
};

// Pricing Configuration
export const PRICING_CONFIG = {
  defaultPricePerKm: 5, // ₹5 per km
  defaultMinimumCharge: 50, // ₹50 minimum charge
  currency: 'INR',
  currencySymbol: '₹',
};

// Location Configuration
export const LOCATION_CONFIG = {
  serviceRadius: 50, // 50km radius
  defaultCenter: {
    latitude: 28.6139, // Delhi coordinates
    longitude: 77.2090,
  },
  averageSpeed: 30, // km/h for delivery time calculation
};

// UI Configuration
export const UI_CONFIG = {
  fonts: {
    primary: 'PlayfairDisplay-Regular',
    bold: 'PlayfairDisplay-Regular', // Using same font with fontWeight for bold
    fallback: ['PlayfairDisplay-Regular', 'serif'],
  },
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
};

// Validation Configuration
export const VALIDATION_CONFIG = {
  phone: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9]\d{9}$/,
  },
  password: {
    minLength: 6,
    maxLength: 50,
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  vehicleNumber: {
    pattern: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
  },
  pincode: {
    pattern: /^\d{6}$/,
  },
};

// Storage Keys
export const STORAGE_KEYS = {
  user: 'user',
  authToken: 'authToken',
  onboardingCompleted: 'onboardingCompleted',
  lastLocation: 'lastLocation',
  savedAddresses: 'savedAddresses',
  preferences: 'preferences',
};

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your internet connection.',
  auth: {
    invalidCredentials: 'Invalid phone number or password.',
    userNotFound: 'User not found.',
    userExists: 'User already exists with this phone number.',
    weakPassword: 'Password is too weak.',
    networkError: 'Network error during authentication.',
  },
  booking: {
    createFailed: 'Failed to create booking.',
    updateFailed: 'Failed to update booking.',
    cancelFailed: 'Failed to cancel booking.',
    notFound: 'Booking not found.',
    alreadyAccepted: 'Booking has already been accepted by another driver.',
    cannotCancel: 'This booking cannot be cancelled.',
  },
  location: {
    permissionDenied: 'Location permission denied.',
    serviceDisabled: 'Location services are disabled.',
    timeout: 'Location request timed out.',
    notSupported: 'Geolocation is not supported.',
    outOfServiceArea: 'Location is outside our service area.',
  },
  payment: {
    failed: 'Payment failed. Please try again.',
    cancelled: 'Payment was cancelled.',
    networkError: 'Network error during payment.',
  },
  general: {
    unexpected: 'An unexpected error occurred.',
    tryAgain: 'Something went wrong. Please try again.',
    invalidInput: 'Invalid input provided.',
    required: 'This field is required.',
  },
};

// Success Messages
export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: 'Login successful!',
    registerSuccess: 'Registration successful!',
    logoutSuccess: 'Logged out successfully!',
  },
  booking: {
    created: 'Booking created successfully!',
    updated: 'Booking updated successfully!',
    cancelled: 'Booking cancelled successfully!',
    accepted: 'Booking accepted successfully!',
    completed: 'Booking completed successfully!',
  },
  profile: {
    updated: 'Profile updated successfully!',
  },
  address: {
    added: 'Address added successfully!',
    updated: 'Address updated successfully!',
    deleted: 'Address deleted successfully!',
  },
};

// Loading Messages
export const LOADING_MESSAGES = {
  auth: {
    loggingIn: 'Logging in...',
    registering: 'Creating account...',
    loggingOut: 'Logging out...',
  },
  booking: {
    creating: 'Creating booking...',
    updating: 'Updating booking...',
    cancelling: 'Cancelling booking...',
    loading: 'Loading bookings...',
  },
  location: {
    gettingLocation: 'Getting your location...',
    calculatingDistance: 'Calculating distance...',
  },
  payment: {
    processing: 'Processing payment...',
    confirming: 'Confirming payment...',
  },
  general: {
    loading: 'Loading...',
    saving: 'Saving...',
    updating: 'Updating...',
  },
};

// Date/Time Configuration
export const DATE_CONFIG = {
  formats: {
    date: 'DD/MM/YYYY',
    time: 'HH:mm',
    datetime: 'DD/MM/YYYY HH:mm',
    display: 'MMM DD, YYYY',
    timeDisplay: 'h:mm A',
  },
  timezone: 'Asia/Kolkata',
};

// Feature Flags
export const FEATURE_FLAGS = {
  enableOnlinePayment: false, // Disabled in MVP
  enablePushNotifications: false, // Disabled in MVP
  enableRealTimeTracking: false, // Disabled in MVP
  enableDriverSelfRegistration: false, // Disabled in MVP
  enableRatingsAndReviews: false, // Disabled in MVP
  enableImmediateBookings: false, // Disabled in MVP
};

// Development Configuration
export const DEV_CONFIG = {
  enableLogging: __DEV__,
  enableDebugMode: __DEV__,
  mockData: __DEV__,
};
