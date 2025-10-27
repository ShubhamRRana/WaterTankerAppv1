// Validation utilities for forms and data

export class ValidationUtils {
  // Phone number validation (Indian format)
  static validatePhone(phone: string): { isValid: boolean; error?: string } {
    const phoneRegex = /^[6-9]\d{9}$/;
    
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    if (!phoneRegex.test(phone)) {
      return { isValid: false, error: 'Please enter a valid 10-digit Indian phone number' };
    }
    
    return { isValid: true };
  }

  // Password validation
  static validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters long' };
    }
    
    if (password.length > 50) {
      return { isValid: false, error: 'Password must be less than 50 characters' };
    }
    
    return { isValid: true };
  }

  // Email validation
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return { isValid: true }; // Email is optional
    }
    
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { isValid: true };
  }

  // Name validation
  static validateName(name: string): { isValid: boolean; error?: string } {
    if (!name) {
      return { isValid: false, error: 'Name is required' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }
    
    if (name.trim().length > 50) {
      return { isValid: false, error: 'Name must be less than 50 characters' };
    }
    
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name.trim())) {
      return { isValid: false, error: 'Name can only contain letters and spaces' };
    }
    
    return { isValid: true };
  }

  // Address validation
  static validateAddress(address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!address.street?.trim()) {
      errors.push('Street address is required');
    }
    
    if (!address.city?.trim()) {
      errors.push('City is required');
    }
    
    if (!address.state?.trim()) {
      errors.push('State is required');
    }
    
    if (!address.pincode?.trim()) {
      errors.push('Pincode is required');
    } else if (!/^\d{6}$/.test(address.pincode)) {
      errors.push('Pincode must be 6 digits');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Vehicle number validation (Indian format)
  static validateVehicleNumber(vehicleNumber: string): { isValid: boolean; error?: string } {
    const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;
    
    if (!vehicleNumber) {
      return { isValid: false, error: 'Vehicle number is required' };
    }
    
    if (!vehicleRegex.test(vehicleNumber.toUpperCase())) {
      return { isValid: false, error: 'Please enter a valid vehicle number (e.g., DL01AB1234)' };
    }
    
    return { isValid: true };
  }

  // License number validation
  static validateLicenseNumber(licenseNumber: string): { isValid: boolean; error?: string } {
    if (!licenseNumber) {
      return { isValid: false, error: 'License number is required' };
    }
    
    if (licenseNumber.trim().length < 10) {
      return { isValid: false, error: 'License number must be at least 10 characters long' };
    }
    
    return { isValid: true };
  }

  // Pincode validation
  static validatePincode(pincode: string): { isValid: boolean; error?: string } {
    const pincodeRegex = /^\d{6}$/;
    
    if (!pincode) {
      return { isValid: false, error: 'Pincode is required' };
    }
    
    if (!pincodeRegex.test(pincode)) {
      return { isValid: false, error: 'Pincode must be 6 digits' };
    }
    
    return { isValid: true };
  }

  // Date validation
  static validateDate(date: Date): { isValid: boolean; error?: string } {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (!date) {
      return { isValid: false, error: 'Date is required' };
    }
    
    if (date < tomorrow) {
      return { isValid: false, error: 'Date must be at least tomorrow' };
    }
    
    // Check if date is not more than 30 days in future
    const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (date > maxDate) {
      return { isValid: false, error: 'Date cannot be more than 30 days in future' };
    }
    
    return { isValid: true };
  }

  // Time validation
  static validateTime(time: Date): { isValid: boolean; error?: string } {
    const now = new Date();
    const selectedTime = new Date(time);
    
    if (!time) {
      return { isValid: false, error: 'Time is required' };
    }
    
    // Check if time is in the future
    if (selectedTime <= now) {
      return { isValid: false, error: 'Time must be in the future' };
    }
    
    // Check if time is within business hours (6 AM to 10 PM)
    const hour = selectedTime.getHours();
    if (hour < 6 || hour > 22) {
      return { isValid: false, error: 'Time must be between 6:00 AM and 10:00 PM' };
    }
    
    return { isValid: true };
  }

  // Form validation helper
  static validateForm<T>(
    data: T,
    validators: { [K in keyof T]: (value: T[K]) => { isValid: boolean; error?: string } }
  ): { isValid: boolean; errors: { [K in keyof T]?: string } } {
    const errors: { [K in keyof T]?: string } = {};
    let isValid = true;
    
    for (const key in validators) {
      const result = validators[key](data[key]);
      if (!result.isValid) {
        errors[key] = result.error;
        isValid = false;
      }
    }
    
    return { isValid, errors };
  }
}
