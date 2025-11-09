// Validation utilities for forms and data

import { VALIDATION_CONFIG } from '../constants/config';

export class ValidationUtils {
  // Phone number validation (Indian format)
  static validatePhone(phone: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!phone || !phone.trim()) {
      return required 
        ? { isValid: false, error: 'Phone number is required' }
        : { isValid: true };
    }
    
    const cleaned = phone.trim().replace(/\D/g, ''); // Remove non-digits
    
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Phone number must be exactly 10 digits' };
    }
    
    if (!VALIDATION_CONFIG.phone.pattern.test(cleaned)) {
      return { isValid: false, error: 'Please enter a valid 10-digit Indian phone number starting with 6-9' };
    }
    
    return { isValid: true };
  }

  // Password validation
  static validatePassword(password: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!password || !password.trim()) {
      return required 
        ? { isValid: false, error: 'Password is required' }
        : { isValid: true };
    }
    
    if (password.length < VALIDATION_CONFIG.password.minLength) {
      return { isValid: false, error: `Password must be at least ${VALIDATION_CONFIG.password.minLength} characters long` };
    }
    
    if (password.length > VALIDATION_CONFIG.password.maxLength) {
      return { isValid: false, error: `Password must be less than ${VALIDATION_CONFIG.password.maxLength} characters` };
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
  static validateName(name: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!name || !name.trim()) {
      return required 
        ? { isValid: false, error: 'Name is required' }
        : { isValid: true };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length < VALIDATION_CONFIG.name.minLength) {
      return { isValid: false, error: `Name must be at least ${VALIDATION_CONFIG.name.minLength} characters long` };
    }
    
    if (trimmed.length > VALIDATION_CONFIG.name.maxLength) {
      return { isValid: false, error: `Name must be less than ${VALIDATION_CONFIG.name.maxLength} characters` };
    }
    
    if (!VALIDATION_CONFIG.name.pattern.test(trimmed)) {
      return { isValid: false, error: 'Name can only contain letters and spaces' };
    }
    
    return { isValid: true };
  }

  // Business name validation (allows alphanumeric and some special chars)
  static validateBusinessName(businessName: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!businessName || !businessName.trim()) {
      return required 
        ? { isValid: false, error: 'Business name is required' }
        : { isValid: true };
    }
    
    const trimmed = businessName.trim();
    
    if (trimmed.length < 2) {
      return { isValid: false, error: 'Business name must be at least 2 characters long' };
    }
    
    if (trimmed.length > 100) {
      return { isValid: false, error: 'Business name must be less than 100 characters' };
    }
    
    // Allow letters, numbers, spaces, and common business name characters
    const businessNameRegex = /^[a-zA-Z0-9\s&.,'-]+$/;
    if (!businessNameRegex.test(trimmed)) {
      return { isValid: false, error: 'Business name contains invalid characters' };
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

  // Date validation (for Date objects)
  static validateDate(date: Date): { isValid: boolean; error?: string } {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (!date) {
      return { isValid: false, error: 'Date is required' };
    }
    
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date' };
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

  // Date string validation (DD-MM-YYYY format)
  static validateDateString(dateString: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!dateString || !dateString.trim()) {
      return required 
        ? { isValid: false, error: 'Date is required' }
        : { isValid: true };
    }

    if (dateString.length < 10) {
      return { isValid: false, error: 'Please enter a complete date (DD-MM-YYYY)' };
    }

    try {
      // Parse the date string (DD-MM-YYYY format)
      const dateParts = dateString.split('-');
      if (dateParts.length !== 3) {
        return { isValid: false, error: 'Invalid date format. Use DD-MM-YYYY' };
      }

      const [dayStr, monthStr, yearStr] = dateParts;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      // Check if the date components are valid numbers
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return { isValid: false, error: 'Date must contain only numbers' };
      }

      // Validate ranges
      if (year < 2024 || year > 2030) {
        return { isValid: false, error: 'Year must be between 2024 and 2030' };
      }

      if (month < 1 || month > 12) {
        return { isValid: false, error: 'Month must be between 1 and 12' };
      }

      if (day < 1 || day > 31) {
        return { isValid: false, error: 'Day must be between 1 and 31' };
      }

      // Create date object (month is 0-indexed in JavaScript Date)
      const inputDate = new Date(year, month - 1, day);
      
      // Check if the date is valid (handles invalid dates like 32-13-2024)
      if (isNaN(inputDate.getTime())) {
        return { isValid: false, error: 'Invalid date - this date does not exist' };
      }

      if (inputDate.getDate() !== day || inputDate.getMonth() !== month - 1 || inputDate.getFullYear() !== year) {
        return { isValid: false, error: 'Invalid date - please check the date' };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      inputDate.setHours(0, 0, 0, 0);

      // Check if the date is in the past
      if (inputDate < today) {
        return { isValid: false, error: 'Cannot select past dates' };
      }

      // Check if date is too far in the future (more than 30 days)
      const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (inputDate > maxDate) {
        return { isValid: false, error: 'Cannot select dates more than 30 days in future' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid date format' };
    }
  }

  // Time validation (for Date objects)
  static validateTime(time: Date): { isValid: boolean; error?: string } {
    const now = new Date();
    const selectedTime = new Date(time);
    
    if (!time) {
      return { isValid: false, error: 'Time is required' };
    }
    
    if (isNaN(selectedTime.getTime())) {
      return { isValid: false, error: 'Invalid time' };
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

  // Time string validation (HH:MM format, 12-hour)
  static validateTimeString(timeString: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!timeString || !timeString.trim()) {
      return required 
        ? { isValid: false, error: 'Time is required' }
        : { isValid: true };
    }

    if (timeString.length < 5) {
      return { isValid: false, error: 'Please enter a complete time (HH:MM)' };
    }

    try {
      // Parse time (HH:MM format)
      const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return { isValid: false, error: 'Invalid time format. Use HH:MM' };
      }

      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);

      // Validate time components
      if (isNaN(hours) || isNaN(minutes)) {
        return { isValid: false, error: 'Time must contain only numbers' };
      }

      if (hours < 1 || hours > 12) {
        return { isValid: false, error: 'Hours must be between 1 and 12' };
      }

      if (minutes < 0 || minutes > 59) {
        return { isValid: false, error: 'Minutes must be between 0 and 59' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid time format' };
    }
  }

  // Vehicle capacity validation
  static validateVehicleCapacity(capacity: string | number, required: boolean = true): { isValid: boolean; error?: string } {
    const capacityNum = typeof capacity === 'string' ? parseFloat(capacity) : capacity;
    
    if (!capacity || (typeof capacity === 'string' && !capacity.trim())) {
      return required 
        ? { isValid: false, error: 'Vehicle capacity is required' }
        : { isValid: true };
    }
    
    if (isNaN(capacityNum) || capacityNum <= 0) {
      return { isValid: false, error: 'Vehicle capacity must be a positive number' };
    }
    
    if (capacityNum > 100000) {
      return { isValid: false, error: 'Vehicle capacity cannot exceed 100,000 liters' };
    }
    
    return { isValid: true };
  }

  // Amount/Price validation
  static validateAmount(amount: string | number, required: boolean = true): { isValid: boolean; error?: string } {
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (!amount || (typeof amount === 'string' && !amount.trim())) {
      return required 
        ? { isValid: false, error: 'Amount is required' }
        : { isValid: true };
    }
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return { isValid: false, error: 'Amount must be a positive number' };
    }
    
    if (amountNum > 1000000) {
      return { isValid: false, error: 'Amount cannot exceed ₹10,00,000' };
    }
    
    return { isValid: true };
  }

  // Insurance expiry date validation (DD/MM/YYYY or DD-MM-YYYY)
  static validateInsuranceDate(dateString: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!dateString || !dateString.trim()) {
      return required 
        ? { isValid: false, error: 'Insurance expiry date is required' }
        : { isValid: true };
    }

    const expiryMatch = dateString.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (!expiryMatch) {
      return { isValid: false, error: 'Use DD/MM/YYYY or DD-MM-YYYY format' };
    }

    const day = parseInt(expiryMatch[1], 10);
    const month = parseInt(expiryMatch[2], 10) - 1;
    const year = parseInt(expiryMatch[3], 10);
    const candidate = new Date(year, month, day);
    
    if (isNaN(candidate.getTime())) {
      return { isValid: false, error: 'Invalid date' };
    }

    // Check if date is in the past (insurance should not be expired)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    candidate.setHours(0, 0, 0, 0);
    
    if (candidate < today) {
      return { isValid: false, error: 'Insurance expiry date cannot be in the past' };
    }

    return { isValid: true };
  }

  // Address text validation (for simple address strings)
  static validateAddressText(address: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!address || !address.trim()) {
      return required 
        ? { isValid: false, error: 'Address is required' }
        : { isValid: true };
    }
    
    const trimmed = address.trim();
    
    if (trimmed.length < 10) {
      return { isValid: false, error: 'Address must be at least 10 characters long' };
    }
    
    if (trimmed.length > 500) {
      return { isValid: false, error: 'Address must be less than 500 characters' };
    }
    
    return { isValid: true };
  }

  // Confirm password validation
  static validateConfirmPassword(password: string, confirmPassword: string, required: boolean = true): { isValid: boolean; error?: string } {
    if (!confirmPassword || !confirmPassword.trim()) {
      return required 
        ? { isValid: false, error: 'Please confirm your password' }
        : { isValid: true };
    }
    
    if (password !== confirmPassword) {
      return { isValid: false, error: 'Passwords do not match' };
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
