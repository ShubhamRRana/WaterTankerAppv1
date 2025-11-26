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

### Phase 3: Authentication Service

#### Step 3.1: Update AuthService.register()
**File:** `src/services/auth.service.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Replace `sanitizePhone()` with `sanitizeEmail()`
- Replace `validatePhone()` with `validateEmail()`
- Update rate limiting key from phone to email
- Update user lookup to check email instead of phone
- Update security logging to use email
- Update all comments and JSDoc

**Key Changes:**
```typescript
// Before:
static async register(phone: string, password: string, name: string, role: UserRole, ...)

// After:
static async register(email: string, password: string, name: string, role: UserRole, ...)
```

---

#### Step 3.2: Update AuthService.login()
**File:** `src/services/auth.service.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Replace `sanitizePhone()` with `sanitizeEmail()`
- Update rate limiting to use email as key
- Update user lookup: `allUsers.filter(u => u.email === sanitizedEmail)`
- Update security logging to use email
- Update all comments and JSDoc

**Key Changes:**
```typescript
// Before:
static async login(phone: string, password: string): Promise<AuthResult>

// After:
static async login(email: string, password: string): Promise<AuthResult>
```

---

#### Step 3.3: Update AuthService.loginWithRole()
**File:** `src/services/auth.service.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Update user lookup: `allUsers.find(u => u.email === email && u.role === role)`
- Update all comments and JSDoc

---

#### Step 3.4: Update Rate Limiter Keys
**File:** `src/services/auth.service.ts`

**Changes:**
- All rate limiting should use email instead of phone
- Update `rateLimiter.isAllowed()` and `rateLimiter.record()` calls to use email

---

#### Step 3.5: Update Security Logger
**File:** `src/services/auth.service.ts`

**Changes:**
- Update all `securityLogger` calls to use email instead of phone
- Check `src/utils/securityLogger.ts` if it needs updates for email-based logging

---

### Phase 4: Authentication Store (Zustand)

#### Step 4.1: Update authStore.login()
**File:** `src/store/authStore.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Update call to `AuthService.login(email, password)`
- Update all related comments

---

#### Step 4.2: Update authStore.loginWithRole()
**File:** `src/store/authStore.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Update call to `AuthService.loginWithRole(email, role)`

---

#### Step 4.3: Update authStore.register()
**File:** `src/store/authStore.ts`

**Changes:**
- Change parameter from `phone: string` to `email: string`
- Update call to `AuthService.register(email, password, name, role)`

---

### Phase 5: Login Screen

#### Step 5.1: Update LoginScreen State
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- Replace `const [phone, setPhone] = useState('')` with `const [email, setEmail] = useState('')`
- Update error state: `errors: { email?: string; password?: string }`

---

#### Step 5.2: Update LoginScreen Handlers
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- Replace `handlePhoneChange()` with `handleEmailChange()`
- Use `SanitizationUtils.sanitizeEmail()` instead of `sanitizePhone()`
- Use `ValidationUtils.validateEmail()` instead of `validatePhone()`
- Update error handling for email field

---

#### Step 5.3: Update LoginScreen UI
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- Replace phone input field with email input field
- Update label: "Phone Number" → "Email Address"
- Update placeholder: "Enter your phone number" → "Enter your email address"
- Change `keyboardType` from `"phone-pad"` to `"email-address"`
- Remove `maxLength={10}` constraint
- Update icon if using one (phone icon → email icon)

---

#### Step 5.4: Update LoginScreen handleLogin()
**File:** `src/screens/auth/LoginScreen.tsx`

**Changes:**
- Replace `sanitizedPhone` with `sanitizedEmail`
- Use email validation instead of phone validation
- Update `login()` and `loginWithRole()` calls to use email

---

### Phase 6: Registration Screen

#### Step 6.1: Update RegisterScreen State
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- Replace `const [phone, setPhone] = useState('')` with `const [email, setEmail] = useState('')`
- Update error state to include `email?: string` instead of `phone?: string`
- Optionally add `phone` state if you want to collect phone during registration

---

#### Step 6.2: Update RegisterScreen Handlers
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- Replace `handlePhoneChange()` with `handleEmailChange()`
- Use `SanitizationUtils.sanitizeEmail()` and `ValidationUtils.validateEmail()`
- Update error handling

---

#### Step 6.3: Update RegisterScreen UI
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- Replace phone input with email input
- Update labels and placeholders
- Change `keyboardType` to `"email-address"`
- Remove `maxLength` constraint
- Optionally add phone input field (as optional) if needed

---

#### Step 6.4: Update RegisterScreen handleRegister()
**File:** `src/screens/auth/RegisterScreen.tsx`

**Changes:**
- Replace phone validation with email validation
- Update `register()` call to use email instead of phone

---

### Phase 7: Role Selection Screen (if exists)

#### Step 7.1: Update RoleSelection Screen
**File:** `src/screens/auth/RoleSelectionScreen.tsx` (if exists)

**Changes:**
- Update route params to use `email` instead of `phone`
- Update `loginWithRole()` calls to use email

---

### Phase 8: Profile Screens

#### Step 8.1: Update Customer Profile Screen
**File:** `src/screens/customer/ProfileScreen.tsx`

**Changes:**
- If phone is editable, consider making it optional
- Ensure email is displayed and can be edited if needed
- Update form validation to use email validation where appropriate

---

#### Step 8.2: Update Admin Profile Screen
**File:** `src/screens/admin/AdminProfileScreen.tsx`

**Changes:**
- Update phone validation to email validation if email is editable
- Ensure email field is properly handled in edit forms

---

#### Step 8.3: Update Driver Profile (if exists)
**File:** `src/screens/driver/ProfileScreen.tsx` (if exists)

**Changes:**
- Similar updates as customer profile screen

---

### Phase 9: Admin Screens

#### Step 9.1: Update AddDriverModal
**File:** `src/components/admin/AddDriverModal.tsx`

**Changes:**
- Replace phone input with email input (required)
- Keep phone as optional field if needed for contact
- Update form validation
- Update `AuthService.register()` call to use email

---

#### Step 9.2: Update EditProfileForm (Admin)
**File:** `src/components/admin/EditProfileForm.tsx`

**Changes:**
- Replace phone input with email input
- Update validation logic
- Update form submission

---

#### Step 9.3: Update DriverManagementScreen
**File:** `src/screens/admin/DriverManagementScreen.tsx`

**Changes:**
- Update driver creation form to use email
- Update validation calls
- Update any driver lookup logic

---

### Phase 10: Local Storage & Sample Data

#### Step 10.1: Update Sample Data
**File:** `src/services/localStorage.ts`

**Changes:**
- Update `initializeSampleData()` to use email instead of phone for authentication
- Ensure all sample users have valid email addresses
- Keep phone numbers for contact purposes if needed

**Example:**
```typescript
// Before:
phone: '9999999999'

// After:
email: 'admin@example.com',
phone: '9999999999' // Optional, for contact
```

---

#### Step 10.2: Update User Lookup Methods
**File:** `src/services/localStorage.ts`

**Changes:**
- Review all methods that search users by phone
- Add methods to search by email if needed
- Update `getUsers()` usage to filter by email where appropriate

---

### Phase 11: Booking & Related Entities

#### Step 11.1: Review Booking Interface
**File:** `src/types/index.ts`

**Decision Point:**
- `customerPhone` and `driverPhone` in Booking interface are for contact purposes
- **Recommendation:** Keep these as phone numbers (they're for delivery contact, not authentication)
- These don't need to change to email

---

### Phase 12: Navigation Updates

#### Step 12.1: Update Navigation Params
**Files:** Various navigation files

**Changes:**
- Update `AuthStackParamList` to use email in `RoleSelection` route
- Update any navigation calls that pass phone to pass email instead

---

### Phase 13: Constants & Configuration

#### Step 13.1: Review Validation Config
**File:** `src/constants/config.ts`

**Changes:**
- Ensure email validation rules are appropriate
- Update any phone-related constants if needed

---

### Phase 14: Testing Checklist

#### For Admin Role:
- [ ] Admin can register with email+password
- [ ] Admin can login with email+password
- [ ] Admin can create drivers with email+password
- [ ] Admin profile edit works with email
- [ ] Admin can view/edit driver profiles

#### For Customer Role:
- [ ] Customer can register with email+password
- [ ] Customer can login with email+password
- [ ] Customer profile shows email
- [ ] Customer can edit profile (email if allowed)
- [ ] Customer can create bookings (phone for contact should still work)

#### For Driver Role:
- [ ] Driver created by admin can login with email+password
- [ ] Driver profile shows email
- [ ] Driver can view/edit profile
- [ ] Driver can accept bookings

#### General:
- [ ] Multi-role users can select role after login
- [ ] Rate limiting works with email
- [ ] Security logging works with email
- [ ] Password reset flow (if exists) works with email
- [ ] All validation messages are correct
- [ ] Error handling is appropriate

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

