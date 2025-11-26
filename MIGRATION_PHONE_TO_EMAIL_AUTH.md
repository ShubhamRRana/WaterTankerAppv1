# Migration Guide: Phone+Password to Email+Password Authentication

This document provides a comprehensive step-by-step guide to migrate the Water Tanker App authentication system from Phone+Password to Email+Password for all user roles (Admin, Customer, and Driver).

## Overview

**Current State:**
- Authentication uses Phone Number + Password
- Phone is required in BaseUser interface
- Email is optional in BaseUser interface
- Login/Registration screens use phone input
- AuthService methods use phone for authentication

**Target State:**
- Authentication uses Email + Password
- Email becomes required in BaseUser interface
- Phone becomes optional (kept for contact purposes)
- Login/Registration screens use email input
- AuthService methods use email for authentication

---

## Prerequisites

1. **Backup existing data** - Ensure you have a backup of all user data before starting migration
2. **Test environment** - Test all changes in a development environment first
3. **Data migration plan** - Plan how to migrate existing users' phone numbers to email addresses

---

## Step-by-Step Migration Process

### Phase 1: Type Definitions & Interfaces ✅ COMPLETED

#### Step 1.1: Update BaseUser Interface ✅
**File:** `src/types/index.ts`

**Changes:**
- Make `email` field required (remove `?`)
- Make `phone` field optional (add `?`)
- Update comments to reflect email as primary identifier

**Impact:** This is a breaking change that affects all user types (Customer, Driver, Admin).

---

#### Step 1.2: Update LoginForm Interface ✅
**File:** `src/types/index.ts`

**Changes:**
- Replace `phone: string` with `email: string` in `LoginForm` interface

---

#### Step 1.3: Update RegisterForm Interface ✅
**File:** `src/types/index.ts`

**Changes:**
- Replace `phone: string` with `email: string` in `RegisterForm` interface
- Optionally add `phone?: string` if you want to collect phone during registration

---

#### Step 1.4: Update AuthStackParamList (if needed) ✅
**File:** `src/types/index.ts`

**Changes:**
- Update `RoleSelection` route params to use `email` instead of `phone`
- Update any other navigation params that reference phone

---

### Phase 2: Validation & Sanitization Utilities ✅ COMPLETED

#### Step 2.1: Update Email Validation ✅
**File:** `src/utils/validation.ts`

**Changes:**
- ✅ Update `validateEmail()` method to make email required (currently optional)
- ✅ Add proper email format validation with domain structure checks
- ✅ Added email uniqueness validation helper (`validateEmailUniqueness()`)

**Note:** Email validation now treats email as required by default, uses config pattern, and includes comprehensive domain validation.

---

#### Step 2.2: Update Sanitization Utilities ✅
**File:** `src/utils/sanitization.ts`

**Changes:**
- ✅ Enhanced `sanitizeEmail()` with normalization documentation
- ✅ Email normalization (lowercase, trim) already implemented and documented

**Note:** Email sanitization is robust with proper normalization and documentation.

---

### Phase 3: Authentication Service ✅ COMPLETED

#### Step 3.1: Update AuthService.register() ✅
**File:** `src/services/auth.service.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Replace `sanitizePhone()` with `sanitizeEmail()`
- ✅ Replace `validatePhone()` with `validateEmail()`
- ✅ Update rate limiting key from phone to email
- ✅ Update user lookup to check email instead of phone (case-insensitive)
- ✅ Update security logging to use email
- ✅ Update all comments and JSDoc

**Key Changes:**
```typescript
// Before:
static async register(phone: string, password: string, name: string, role: UserRole, ...)

// After:
static async register(email: string, password: string, name: string, role: UserRole, ...)
```

**Note:** Email validation added, user lookup now uses case-insensitive email comparison, and user creation sets email as required field.

---

#### Step 3.2: Update AuthService.login() ✅
**File:** `src/services/auth.service.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Replace `sanitizePhone()` with `sanitizeEmail()`
- ✅ Added email format validation
- ✅ Update rate limiting to use email as key
- ✅ Update user lookup: `allUsers.filter(u => u.email?.toLowerCase() === sanitizedEmail.toLowerCase())`
- ✅ Update security logging to use email
- ✅ Update all comments and JSDoc

**Key Changes:**
```typescript
// Before:
static async login(phone: string, password: string): Promise<AuthResult>

// After:
static async login(email: string, password: string): Promise<AuthResult>
```

**Note:** Email validation added, user lookup now uses case-insensitive email comparison.

---

#### Step 3.3: Update AuthService.loginWithRole() ✅
**File:** `src/services/auth.service.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Added email sanitization
- ✅ Update user lookup: `allUsers.find(u => u.email?.toLowerCase() === sanitizedEmail.toLowerCase() && u.role === role)`
- ✅ Update all comments and JSDoc

**Note:** Email sanitization added and user lookup now uses case-insensitive email comparison.

---

#### Step 3.4: Update Rate Limiter Keys ✅
**File:** `src/services/auth.service.ts`

**Changes:**
- ✅ All rate limiting now uses email instead of phone
- ✅ Updated `rateLimiter.isAllowed()` and `rateLimiter.record()` calls to use email

**Note:** Both registration and login rate limiting now use email as the identifier.

---

#### Step 3.5: Update Security Logger ✅
**File:** `src/services/auth.service.ts` and `src/utils/securityLogger.ts`

**Changes:**
- ✅ Updated all `securityLogger` calls in AuthService to use email instead of phone
- ✅ Added `maskEmail()` method to `securityLogger.ts` for email masking in logs
- ✅ Updated `logAuthAttempt()` to accept email parameter
- ✅ Updated `logRegistrationAttempt()` to accept email parameter
- ✅ Email masking shows first 2 characters and full domain (e.g., `us***@example.com`)

**Note:** Security logger now supports email-based logging with proper masking for privacy.

---

### Phase 4: Authentication Store (Zustand) ✅ COMPLETED

#### Step 4.1: Update authStore.login() ✅
**File:** `src/store/authStore.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Update call to `AuthService.login(email, password)`
- ✅ Update all related comments

**Note:** The login method now accepts email parameter and calls AuthService.login with email.

---

#### Step 4.2: Update authStore.loginWithRole() ✅
**File:** `src/store/authStore.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Update call to `AuthService.loginWithRole(email, role)`

**Note:** The loginWithRole method now accepts email parameter and calls AuthService.loginWithRole with email.

---

#### Step 4.3: Update authStore.register() ✅
**File:** `src/store/authStore.ts`

**Changes:**
- ✅ Change parameter from `phone: string` to `email: string`
- ✅ Update call to `AuthService.register(email, password, name, role)`

**Note:** The register method now accepts email parameter and calls AuthService.register with email.

---

### Phase 5: Login Screen ✅ COMPLETED

#### Step 5.1: Update LoginScreen State ✅
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- ✅ Replace `const [phone, setPhone] = useState('')` with `const [email, setEmail] = useState('')`
- ✅ Update error state: `errors: { email?: string; password?: string }`

**Note:** State has been updated to use email instead of phone, and error state now references email field.

---

#### Step 5.2: Update LoginScreen Handlers ✅
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- ✅ Replace `handlePhoneChange()` with `handleEmailChange()`
- ✅ Use `SanitizationUtils.sanitizeEmail()` instead of `sanitizePhone()`
- ✅ Use `ValidationUtils.validateEmail()` instead of `validatePhone()`
- ✅ Update error handling for email field

**Note:** Handler now uses email sanitization and validation utilities, with proper error handling.

---

#### Step 5.3: Update LoginScreen UI ✅
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- ✅ Replace phone input field with email input field
- ✅ Update label: "Phone Number" → "Email Address"
- ✅ Update placeholder: "Enter your phone number" → "Enter your email address"
- ✅ Change `keyboardType` from `"phone-pad"` to `"email-address"`
- ✅ Remove `maxLength={10}` constraint
- ✅ Added `autoCapitalize="none"` for proper email input

**Note:** UI now displays email input field with appropriate keyboard type and validation constraints removed.

---

#### Step 5.4: Update LoginScreen handleLogin() ✅
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- ✅ Replace `sanitizedPhone` with `sanitizedEmail`
- ✅ Use email validation instead of phone validation
- ✅ Update `login()` and `loginWithRole()` calls to use email
- ✅ Update navigation to RoleSelection to pass email instead of phone

**Note:** Login function now uses email for authentication and passes email to role selection screen.

---

### Phase 6: Registration Screen ✅ COMPLETED

#### Step 6.1: Update RegisterScreen State ✅
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- ✅ Replace `const [phone, setPhone] = useState('')` with `const [email, setEmail] = useState('')`
- ✅ Update error state to include `email?: string` instead of `phone?: string`
- Optionally add `phone` state if you want to collect phone during registration

**Note:** State has been updated to use email instead of phone, and error state now references email field.

---

#### Step 6.2: Update RegisterScreen Handlers ✅
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- ✅ Replace `handlePhoneChange()` with `handleEmailChange()`
- ✅ Use `SanitizationUtils.sanitizeEmail()` and `ValidationUtils.validateEmail()`
- ✅ Update error handling

**Note:** Handler now uses email sanitization and validation utilities, with proper error handling.

---

#### Step 6.3: Update RegisterScreen UI ✅
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- ✅ Replace phone input with email input
- ✅ Update labels and placeholders: "Phone Number" → "Email Address"
- ✅ Change `keyboardType` to `"email-address"`
- ✅ Remove `maxLength` constraint
- ✅ Added `autoCapitalize="none"` for proper email input
- Optionally add phone input field (as optional) if needed

**Note:** UI now displays email input field with appropriate keyboard type and validation constraints removed.

---

#### Step 6.4: Update RegisterScreen handleRegister() ✅
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- ✅ Replace phone validation with email validation
- ✅ Replace phone sanitization with email sanitization (`sanitizedPhone` → `sanitizedEmail`)
- ✅ Update `register()` call to use email instead of phone

**Note:** Registration function now uses email for authentication instead of phone.

---

### Phase 7: Role Selection Screen ✅ COMPLETED

#### Step 7.1: Update RoleSelection Screen ✅
**File:** `src/screens/auth/RoleSelectionScreen.tsx`

**Changes:**
- ✅ Update route params to use `email` instead of `phone`
- ✅ Update `loginWithRole()` calls to use email
- ✅ Update subtitle text to reference "email address" instead of "phone number"

**Note:** RoleSelectionScreen now uses email parameter and displays appropriate messaging for email-based authentication.

---

### Phase 8: Profile Screens ✅ COMPLETED

#### Step 8.1: Update Customer Profile Screen ✅
**File:** `src/screens/customer/ProfileScreen.tsx`

**Changes:**
- ✅ Added email field to edit form state
- ✅ Made phone field optional in edit form (labeled as "Optional")
- ✅ Added email validation and sanitization
- ✅ Updated profile display to show email as primary identifier
- ✅ Phone displayed only if present
- ✅ Updated save handler to sanitize and validate email
- ✅ Phone only saved if provided

**Note:** Customer profile now displays email as primary identifier, allows editing email, and phone is optional.

---

#### Step 8.2: Update Admin Profile Screen ✅
**File:** `src/screens/admin/AdminProfileScreen.tsx`

**Changes:**
- ✅ Added email field to FormState interface
- ✅ Added email validation with debouncing
- ✅ Made phone validation optional (only validates if provided)
- ✅ Updated form initialization to include email
- ✅ Added email sanitization in save handler
- ✅ Updated dirty state tracking to include email
- ✅ Added SanitizationUtils import for email sanitization

**Note:** Admin profile form now includes email field with proper validation and sanitization, phone is optional.

---

#### Step 8.3: Update EditProfileForm Component ✅
**File:** `src/components/admin/EditProfileForm.tsx`

**Changes:**
- ✅ Added email field to FormState interface
- ✅ Added email input field with proper keyboard type and validation
- ✅ Made phone field optional (labeled as "Optional")
- ✅ Updated form field order: Business Name → Name → Email → Phone → Password
- ✅ Added proper accessibility labels for email field

**Note:** EditProfileForm now includes email input field with appropriate validation and keyboard type.

---

#### Step 8.4: Update ProfileHeader Component ✅
**File:** `src/components/admin/ProfileHeader.tsx`

**Changes:**
- ✅ Updated to display email as primary identifier
- ✅ Phone displayed only if present

**Note:** ProfileHeader now shows email as the primary contact identifier, with phone as optional secondary information.

---

### Phase 9: Admin Screens ✅ COMPLETED

#### Step 9.1: Update AddDriverModal ✅
**File:** `src/components/admin/AddDriverModal.tsx`

**Changes:**
- ✅ Replaced phone input with email input (required)
- ✅ Kept phone as optional field for contact purposes
- ✅ Updated form interface to include email field
- ✅ Changed keyboard type from `phone-pad` to `email-address` for email input
- ✅ Added `autoCapitalize="none"` for proper email input
- ✅ Updated both iOS/Android and web form sections

**Note:** AddDriverModal now uses email as the primary identifier for driver creation, with phone as an optional contact field.

---

#### Step 9.2: Update EditProfileForm (Admin) ✅
**File:** `src/components/admin/EditProfileForm.tsx`

**Changes:**
- ✅ Already completed in Phase 8.3
- ✅ Email input field is present and required
- ✅ Phone field is optional (labeled as "Optional")
- ✅ Validation logic uses email validation
- ✅ Form submission includes email sanitization

**Note:** EditProfileForm was already updated in Phase 8 with email as required and phone as optional.

---

#### Step 9.3: Update DriverManagementScreen ✅
**File:** `src/screens/admin/DriverManagementScreen.tsx`

**Changes:**
- ✅ Added email to form state
- ✅ Updated validation to validate email (required) instead of phone (now optional)
- ✅ Changed user lookup from phone-based to email-based (case-insensitive)
- ✅ Updated user creation to use email as primary identifier
- ✅ Updated user editing to check email uniqueness
- ✅ Added email sanitization using `SanitizationUtils.sanitizeEmail()`
- ✅ Updated search filtering to include email addresses
- ✅ Updated delete check to use email instead of phone
- ✅ Updated form reset and edit handlers to include email field
- ✅ Added SanitizationUtils import

**Note:** DriverManagementScreen now uses email-based authentication for drivers, with phone numbers kept as optional contact information.

---

### Phase 10: Local Storage & Sample Data ✅ COMPLETED

#### Step 10.1: Update Sample Data ✅
**File:** `src/services/localStorage.ts`

**Changes:**
- ✅ Update `initializeSampleData()` to use email instead of phone for authentication
- ✅ Ensure all sample users have valid email addresses
- ✅ Keep phone numbers for contact purposes if needed

**Example:**
```typescript
// Before:
phone: '9999999999'

// After:
email: 'admin@example.com',
phone: '9999999999' // Optional, for contact
```

**Note:** Sample data now includes email addresses for all users (admin, drivers, customers, and multi-role users). All sample users have valid email addresses like `admin@watertanker.app`, `customer@watertanker.app`, etc. Phone numbers are kept as optional fields for contact purposes.

---

#### Step 10.2: Update User Lookup Methods ✅
**File:** `src/services/localStorage.ts`

**Changes:**
- ✅ Reviewed all methods that search users by phone
- ✅ Confirmed user lookup methods use `uid` for identification (no phone-based searches found)
- ✅ No changes needed - existing methods are appropriate

**Note:** User lookup methods in LocalStorageService use `uid` for identification, which is correct. No phone-based user searches were found that needed updating.

---

### Phase 11: Booking & Related Entities ✅ COMPLETED

#### Step 11.1: Review Booking Interface ✅
**File:** `src/types/index.ts`

**Decision Point:**
- `customerPhone` and `driverPhone` in Booking interface are for contact purposes
- **Recommendation:** Keep these as phone numbers (they're for delivery contact, not authentication)
- These don't need to change to email

**Note:** Booking interface phone fields (`customerPhone` and `driverPhone`) are correctly used for delivery contact purposes only, not for authentication. No changes needed - these fields remain as phone numbers.

---

### Phase 12: Navigation Updates ✅ COMPLETED

#### Step 12.1: Update Navigation Params ✅
**Files:** Various navigation files

**Changes:**
- ✅ `AuthStackParamList` already uses email in `RoleSelection` route (updated in Phase 1.4)
- ✅ Verified all navigation calls pass email instead of phone
- ✅ `LoginScreen` correctly navigates to `RoleSelection` with email parameter

**Note:** Navigation params were already updated in Phase 1.4. All navigation calls correctly use email instead of phone. No additional changes needed.

---

### Phase 13: Constants & Configuration ✅ COMPLETED

#### Step 13.1: Review Validation Config ✅
**File:** `src/constants/config.ts`

**Changes:**
- ✅ Email validation rules are appropriate and present in `VALIDATION_CONFIG`
- ✅ Updated error messages to reference email instead of phone:
  - Changed "Invalid phone number or password" → "Invalid email address or password"
  - Changed "User already exists with this phone number" → "User already exists with this email address"
- ✅ Phone validation remains in config (phone is still used for optional contact purposes)

**Note:** Validation config includes proper email validation pattern. Error messages have been updated to reference email addresses. Phone validation remains for optional contact field validation.

---

### Phase 14: Testing Checklist ✅ COMPLETED

#### For Admin Role:
- [x] Admin can register with email+password
- [x] Admin can login with email+password
- [x] Admin can create drivers with email+password
- [x] Admin profile edit works with email
- [x] Admin can view/edit driver profiles

#### For Customer Role:
- [x] Customer can register with email+password
  - ✅ RegisterScreen uses email input field with proper validation and sanitization
  - ✅ Email validation includes format checks and real-time error feedback
  - ✅ Sample customer data includes email: 'customer@watertanker.app'
- [x] Customer can login with email+password
  - ✅ LoginScreen uses email input field with proper validation
  - ✅ Email sanitization and case-insensitive lookup implemented
  - ✅ Login flow correctly handles email-based authentication
- [x] Customer profile shows email
  - ✅ ProfileScreen displays email as primary identifier (replaces phone)
  - ✅ Email shown in profile header section
  - ✅ Phone displayed only if present (optional)
- [x] Customer can edit profile (email if allowed)
  - ✅ ProfileScreen edit form includes email field with validation
  - ✅ Email sanitization and validation on edit
  - ✅ Email can be updated successfully
- [x] Customer can create bookings (phone for contact should still work)
  - ✅ BookingScreen uses user.phone for customerPhone field
  - ✅ Fixed: Added fallback (empty string) when phone is not provided
  - ✅ Phone remains optional for user but booking contact still works

#### For Driver Role:
- [x] Driver created by admin can login with email+password
  - ✅ AuthService.login() checks for createdByAdmin flag for drivers
  - ✅ Sample driver data includes email: 'admin.driver@watertanker.app' with createdByAdmin: true
  - ✅ Email-based authentication implemented with case-insensitive lookup
- [x] Driver profile shows email
  - ✅ Created DriverProfileScreen that displays email as primary identifier
  - ✅ Email shown in profile header section
  - ✅ Phone displayed only if present (optional)
  - ✅ Added Profile tab to DriverNavigator
- [x] Driver can view/edit profile
  - ✅ DriverProfileScreen includes edit functionality
  - ✅ Email field can be edited with validation and sanitization
  - ✅ Name and phone (optional) can also be edited
  - ✅ Driver-specific fields (vehicle number, license) shown as read-only
- [x] Driver can accept bookings
  - ✅ OrdersScreen handles optional phone when accepting bookings (uses empty string fallback)
  - ✅ Email-based authentication verified for driver login

#### General:
- [x] Multi-role users can select role after login
  - ✅ AuthService.login() correctly detects multiple roles and returns `requiresRoleSelection: true` with `availableRoles`
  - ✅ RoleSelectionScreen displays available roles and allows selection
  - ✅ AuthService.loginWithRole() correctly authenticates with selected role
  - ✅ Sample data includes multi-role user: `multirole@watertanker.app` (customer + driver roles)
  - ✅ Navigation flow: LoginScreen → RoleSelectionScreen → Selected Role Navigator
- [x] Rate limiting works with email
  - ✅ Rate limiter uses email as identifier in `rateLimiter.isAllowed('login', sanitizedEmail)`
  - ✅ Rate limiter uses email in `rateLimiter.record('login', sanitizedEmail)`
  - ✅ Different emails have separate rate limit counters (verified in test)
  - ✅ Rate limiting configured: 5 login attempts per 15 minutes per email
  - ✅ Rate limiting configured: 3 registration attempts per hour per email
- [x] Security logging works with email
  - ✅ `securityLogger.logAuthAttempt(email, success, error, userId)` uses email parameter
  - ✅ `securityLogger.logRegistrationAttempt(email, role, success, error, userId)` uses email parameter
  - ✅ Email is properly masked in logs (e.g., `us***@example.com`) for privacy
  - ✅ Security events are tracked with email identifier
  - ✅ Brute force detection uses email as identifier
- [x] Password reset flow (if exists) works with email
  - ✅ Password reset flow does not exist (not implemented yet - as expected)
  - ✅ Rate limiter config includes `password_reset` action (3 attempts per hour) for future implementation
  - ✅ Note: Password reset is a future enhancement (mentioned in migration doc)
- [x] All validation messages are correct
  - ✅ Email validation messages reference "email address" (not "phone number")
  - ✅ ERROR_MESSAGES.auth.invalidCredentials: "Invalid email address or password"
  - ✅ ERROR_MESSAGES.auth.userExists: "User already exists with this email address"
  - ✅ ValidationUtils.validateEmail() returns appropriate email-specific error messages
  - ✅ All error messages correctly reference email instead of phone
- [x] Error handling is appropriate
  - ✅ Invalid email format returns clear error: "Invalid email address" or "Please enter a valid email address"
  - ✅ User not found returns: "User not found"
  - ✅ Invalid password returns: "Invalid password"
  - ✅ Rate limit exceeded returns: "Too many login attempts. Please try again after [time]"
  - ✅ All error scenarios return appropriate, user-friendly error messages
  - ✅ Errors are logged to security logger with email (masked)

**Test Execution Summary:**
- ✅ All general authentication tests executed via `scripts/test-general-auth.ts`
- ✅ Test results: 8/8 tests passing (100% success rate)
- ✅ Fixed: Added Node.js environment setup (`setup-globals.ts`) to resolve "window is not defined" error
- ✅ Fixed: Updated multi-role user sample data (driver account now has `createdByAdmin: true` for proper role selection)
- ✅ Fixed: Corrected rate limiting test logic (removed double-counting issue)
- ✅ All test cases verified and passing:
  - Multi-role user selection: ✅ PASS
  - Rate limiting with email: ✅ PASS
  - Security logging with email: ✅ PASS
  - Password reset flow check: ✅ PASS
  - Validation messages: ✅ PASS
  - Error handling: ✅ PASS

---

### Phase 15: Data Migration (For Existing Users)

#### Step 15.1: Create Migration Script
**File:** `scripts/migrate-phone-to-email.ts` (create new file)

**Purpose:**
- Migrate existing users from phone-based to email-based authentication
- Generate email addresses for users who don't have them
- Update all user records

**Approach Options:**
1. **Generate emails from phone:** `user{phone}@watertanker.app`
2. **Require users to update:** Force email update on next login
3. **Manual migration:** Admin updates each user's email

**Recommendation:** Option 2 (require email update) is most secure and ensures valid emails.

---

#### Step 15.2: Update Existing User Records
**Process:**
1. Add email field to all existing users
2. Mark phone as optional
3. Ensure no duplicate emails
4. Validate all emails are unique

---

## Critical Considerations

### 1. **Backward Compatibility**
- Existing sessions might break
- Consider maintaining phone login temporarily during transition
- Or force all users to re-authenticate

### 2. **Email Uniqueness**
- Ensure email is unique across all roles
- Update duplicate check logic in registration
- Consider case-insensitive email comparison

### 3. **Phone Number Retention**
- Keep phone as optional field for contact purposes
- Booking entities still need phone for delivery contact
- Don't remove phone field entirely

### 4. **Rate Limiting**
- Rate limiting keys change from phone to email
- Existing rate limit data might need migration
- Consider resetting rate limits during migration

### 5. **Security Logging**
- Update security logs to use email
- Historical logs might reference phone (keep for audit)

### 6. **Multi-Role Users**
- Users with multiple roles (same phone) will need same email for all roles
- Or separate emails per role (recommend same email)

### 7. **Validation**
- Email validation should be strict
- Consider email verification in future (not in this migration)

---

## Rollback Plan

If issues arise, you can rollback by:
1. Reverting type definitions
2. Reverting AuthService methods
3. Reverting UI components
4. Restoring from backup

**Note:** Data migration might be harder to rollback, so test thoroughly first.

---

## Post-Migration Tasks

1. **Update Documentation**
   - Update README.md
   - Update API documentation
   - Update user guides

2. **Monitor**
   - Monitor error logs
   - Check authentication success rates
   - Verify no duplicate emails

3. **User Communication**
   - Notify users of the change
   - Provide instructions for email-based login
   - Support users who need help

4. **Future Enhancements**
   - Consider email verification
   - Consider password reset via email
   - Consider OAuth with email providers

---

## Estimated Timeline

- **Phase 1-3 (Core Changes):** 2-3 hours
- **Phase 4-6 (UI Updates):** 2-3 hours
- **Phase 7-9 (Profile & Admin):** 2-3 hours
- **Phase 10-12 (Supporting Changes):** 1-2 hours
- **Phase 13-14 (Testing):** 3-4 hours
- **Phase 15 (Data Migration):** 1-2 hours

**Total Estimated Time:** 11-17 hours

---

## Notes

- Test each phase before moving to the next
- Keep phone field for contact purposes (bookings, delivery)
- Email should be unique across all users
- Consider email case-insensitivity
- Update all error messages to reference email instead of phone
- Ensure accessibility labels are updated

---

## Support

If you encounter issues during migration:
1. Check error logs
2. Verify type definitions match across files
3. Ensure all imports are updated
4. Test authentication flow step by step
5. Review security logger for clues

---

**Last Updated:** [Current Date]
**Version:** 1.0

