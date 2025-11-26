# Testing Scripts

This directory contains testing scripts and guides for the Water Tanker App.

## Files

### `test-admin-role.ts`
Automated test script for Phase 14: Admin Role Testing Checklist.

**Usage:**
```bash
# Note: This script requires TypeScript and the app's dependencies to be installed
# You may need to set up a test runner or execute it manually in a Node.js environment

# To run the tests, you would typically:
npx ts-node scripts/test-admin-role.ts
```

**What it tests:**
- Admin registration with email+password
- Admin login with email+password
- Admin creating drivers with email+password
- Admin profile editing with email
- Admin viewing/editing driver profiles

### `ADMIN_ROLE_TESTING_GUIDE.md`
Comprehensive manual testing guide for Phase 14: Admin Role Testing Checklist.

**Usage:**
Follow the step-by-step instructions in the guide to manually test all admin role functionality in the app.

**What it covers:**
- Detailed test steps for each checklist item
- Expected results for each test
- Test cases and edge cases
- Troubleshooting tips

---

## Running Tests

### Option 1: Manual Testing (Recommended)
Follow the instructions in `ADMIN_ROLE_TESTING_GUIDE.md` to test the app manually through the UI.

### Option 2: Automated Testing
If you have a test environment set up, you can run the automated test script:
```bash
npx ts-node scripts/test-admin-role.ts
```

**Note:** The automated test script requires:
- TypeScript installed
- All app dependencies installed
- Access to the app's services and utilities

---

## Test Results

After running tests (manual or automated), update the checklist in `MIGRATION_PHONE_TO_EMAIL_AUTH.md`:

```markdown
### Phase 14: Testing Checklist

#### For Admin Role:
- [x] Admin can register with email+password
- [x] Admin can login with email+password
- [x] Admin can create drivers with email+password
- [x] Admin profile edit works with email
- [x] Admin can view/edit driver profiles
```

---

## Next Steps

After completing Admin Role testing:
1. Test Customer Role (Phase 14 - Customer Role)
2. Test Driver Role (Phase 14 - Driver Role)
3. Test General functionality (Phase 14 - General)

