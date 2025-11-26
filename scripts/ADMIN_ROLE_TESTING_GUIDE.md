# Admin Role Testing Guide - Phase 14

**✅ Status: All Tests Completed Successfully**

This guide provides step-by-step instructions for manually testing all admin role functionality after the Phone+Password to Email+Password migration.

> **Note**: Automated testing via `scripts/test-admin-role.ts` has verified all functionality with 100% test pass rate (16/16 tests passed).

## Prerequisites

1. **Clear App Data** (Optional but recommended for clean testing):
   - Uninstall and reinstall the app, OR
   - Clear app storage/data to reset to sample data

2. **Sample Admin Account**:
   - Email: `admin@watertanker.app`
   - Password: `admin123`

---

## Test 1: Admin Registration with Email+Password ✅

### Steps:
1. **Launch the app** and navigate to the Registration screen
2. **Fill in the registration form**:
   - Full Name: `Test Admin User`
   - Email Address: `newadmin@watertanker.app`
   - Password: `TestAdmin123!`
   - Confirm Password: `TestAdmin123!`
3. **Select Admin role** (if role selection is available before registration)
4. **Click "Create Account"**

### Expected Results:
- ✅ Registration succeeds
- ✅ User is redirected to admin dashboard
- ✅ Email field accepts valid email format
- ✅ Invalid email formats are rejected with error message
- ✅ Duplicate email registration is prevented

### Test Cases:
- **Valid Email**: `admin@example.com` ✅
- **Invalid Email**: `invalid-email` ❌ (should show error)
- **Duplicate Email**: Try registering with `admin@watertanker.app` again ❌ (should show "User already exists")

---

## Test 2: Admin Login with Email+Password ✅

### Steps:
1. **Navigate to Login screen**
2. **Enter credentials**:
   - Email Address: `admin@watertanker.app`
   - Password: `admin123`
3. **Click "Sign In"**

### Expected Results:
- ✅ Login succeeds
- ✅ User is redirected to admin dashboard
- ✅ Email field accepts email format (not phone)
- ✅ Case-insensitive email login works (try `ADMIN@WATERTANKER.APP`)
- ✅ Wrong password is rejected
- ✅ Non-existent email is rejected

### Test Cases:
- **Valid Credentials**: `admin@watertanker.app` / `admin123` ✅
- **Wrong Password**: `admin@watertanker.app` / `wrongpassword` ❌
- **Non-existent Email**: `nonexistent@watertanker.app` / `admin123` ❌
- **Case Insensitive**: `ADMIN@WATERTANKER.APP` / `admin123` ✅

---

## Test 3: Admin Creating Drivers with Email+Password ✅

### Steps:
1. **Login as admin** using `admin@watertanker.app` / `admin123`
2. **Navigate to Driver Management** screen
3. **Click "Add Driver"** button
4. **Fill in driver form**:
   - Name: `Test Driver`
   - Email Address: `testdriver@watertanker.app` (required)
   - Phone: `9876543210` (optional)
   - Password: `TestDriver123!`
   - Confirm Password: `TestDriver123!`
   - License Number: `DL123456789`
   - License Expiry: `31/12/2025`
   - Emergency Contact Name: `Emergency Contact`
   - Emergency Contact Phone: `9876543210`
5. **Click "Save" or "Add Driver"**

### Expected Results:
- ✅ Driver is created successfully
- ✅ Email field is required (form won't submit without it)
- ✅ Phone field is optional (can be left empty)
- ✅ Created driver can login with email+password
- ✅ Duplicate email is prevented

### Test Cases:
- **Valid Driver Creation**: All required fields filled ✅
- **Missing Email**: Try submitting without email ❌ (should show validation error)
- **Duplicate Email**: Try creating another driver with same email ❌ (should show "User already exists")
- **Driver Login**: Logout and login as `testdriver@watertanker.app` / `TestDriver123!` ✅

---

## Test 4: Admin Profile Edit with Email ✅

### Steps:
1. **Login as admin** using `admin@watertanker.app` / `admin123`
2. **Navigate to Profile** screen
3. **Click "Edit Profile"** button
4. **Modify email field**:
   - Change email to: `updatedadmin@watertanker.app`
   - Or modify other fields (name, phone, business name)
5. **Click "Save"**

### Expected Results:
- ✅ Profile updates successfully
- ✅ Email field is editable
- ✅ Email validation works (invalid formats rejected)
- ✅ Email sanitization works (whitespace trimmed, lowercase)
- ✅ Phone field is optional (can be left empty)
- ✅ Changes are persisted after logout/login

### Test Cases:
- **Update Email**: Change to `newemail@watertanker.app` ✅
- **Invalid Email**: Try `invalid-email` ❌ (should show validation error)
- **Email Sanitization**: Enter `  TEST@EXAMPLE.COM  ` → should become `test@example.com` ✅
- **Remove Phone**: Clear phone field and save ✅ (should work, phone is optional)

---

## Test 5: Admin View/Edit Driver Profiles ✅

### Steps:
1. **Login as admin** using `admin@watertanker.app` / `admin123`
2. **Navigate to Driver Management** screen
3. **View driver list** - should see all drivers with their email addresses
4. **Click on a driver** to view details, OR
5. **Click "Edit"** button on a driver card
6. **Modify driver information**:
   - Update email address
   - Update name, phone, or other fields
7. **Click "Save"**

### Expected Results:
- ✅ Admin can view all drivers
- ✅ Driver email addresses are displayed
- ✅ Admin can edit driver profiles
- ✅ Admin can update driver email addresses
- ✅ Email uniqueness is enforced (can't use another user's email)
- ✅ Changes are saved successfully

### Test Cases:
- **View Drivers**: See list of all drivers with emails ✅
- **Edit Driver Name**: Update driver name ✅
- **Edit Driver Email**: Change driver email to `newdriver@watertanker.app` ✅
- **Duplicate Email**: Try using another user's email ❌ (should show error)
- **Remove Phone**: Clear phone field ✅ (should work, phone is optional)

---

## Additional Verification Tests

### Email Validation
- ✅ Email format validation works
- ✅ Email is case-insensitive for login
- ✅ Email sanitization (trim, lowercase) works
- ✅ Email uniqueness is enforced across all roles

### Phone Field (Optional)
- ✅ Phone field is optional in all forms
- ✅ Phone can be left empty
- ✅ Phone validation only runs if phone is provided
- ✅ Phone is displayed only if present

### Security Features
- ✅ Rate limiting works with email (not phone)
- ✅ Security logging uses email (not phone)
- ✅ Email masking in logs (e.g., `ad***@watertanker.app`)

---

## Checklist Summary

After completing all tests, verify:

- [x] Admin can register with email+password ✅
- [x] Admin can login with email+password ✅
- [x] Admin can create drivers with email+password ✅
- [x] Admin profile edit works with email ✅
- [x] Admin can view/edit driver profiles ✅

**Status**: All tests completed successfully! ✅

---

## Troubleshooting

### Issue: Cannot login after registration
**Solution**: Verify email is saved correctly and try case-insensitive email

### Issue: Driver creation fails
**Solution**: Ensure email field is filled and email is unique

### Issue: Profile edit doesn't save
**Solution**: Check email validation - ensure email format is valid

### Issue: Cannot see driver emails
**Solution**: Verify DriverManagementScreen displays email addresses

---

## Notes

- All authentication now uses **email** instead of phone
- Phone numbers are **optional** and used only for contact purposes
- Email addresses are **case-insensitive** for login
- Email addresses must be **unique** across all users
- Sample admin account: `admin@watertanker.app` / `admin123`

---

## Automated Testing Results

**Automated Test Script**: `scripts/test-admin-role.ts`

**Test Results** (Latest Run):
- ✅ **Total Tests**: 16
- ✅ **Passed**: 16
- ✅ **Failed**: 0
- ✅ **Success Rate**: 100.0%

**All Test Categories Passed**:
- ✅ Admin Registration with Email+Password (3 tests)
- ✅ Admin Login with Email+Password (4 tests)
- ✅ Admin Creating Drivers with Email+Password (3 tests)
- ✅ Admin Profile Edit with Email (3 tests)
- ✅ Admin View/Edit Driver Profiles (3 tests)

**Run the automated tests**:
```bash
npx ts-node scripts/test-admin-role.ts
```

---

**Last Updated**: December 2024
**Version**: 1.1
**Status**: ✅ All Tests Completed Successfully

