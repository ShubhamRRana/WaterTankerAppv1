import { AuthService } from '../services/auth.service';
import { LocalStorageService } from '../services/localStorage';

/**
 * Test utility to demonstrate the admin-created driver login restriction
 * This file can be used to test the functionality manually
 */
export class LoginRestrictionTest {
  /**
   * Test the login restriction for admin-created vs regular drivers
   */
  static async testLoginRestriction(): Promise<void> {
    console.log('🧪 Testing Login Restriction for Admin-Created Drivers...\n');

    // Clear existing data and initialize fresh sample data
    await LocalStorageService.clear();
    await LocalStorageService.initializeSampleData();

    // Test cases
    const testCases = [
      {
        name: 'Regular Driver (Not Admin-Created)',
        phone: '8888888888',
        expectedResult: 'FAIL',
        description: 'Should fail login - driver not created by admin'
      },
      {
        name: 'Admin-Created Driver',
        phone: '6666666666',
        expectedResult: 'SUCCESS',
        description: 'Should succeed login - driver created by admin'
      },
      {
        name: 'Customer',
        phone: '7777777777',
        expectedResult: 'SUCCESS',
        description: 'Should succeed login - customers are not restricted'
      },
      {
        name: 'Admin',
        phone: '9999999999',
        expectedResult: 'SUCCESS',
        description: 'Should succeed login - admins are not restricted'
      },
      {
        name: 'Multi-Role User (Driver Role)',
        phone: '5555555555',
        role: 'driver',
        expectedResult: 'FAIL',
        description: 'Should fail login - driver role not created by admin'
      },
      {
        name: 'Multi-Role User (Customer Role)',
        phone: '5555555555',
        role: 'customer',
        expectedResult: 'SUCCESS',
        description: 'Should succeed login - customer role is not restricted'
      }
    ];

    for (const testCase of testCases) {
      console.log(`📱 Testing: ${testCase.name}`);
      console.log(`   Phone: ${testCase.phone}`);
      console.log(`   Expected: ${testCase.expectedResult}`);
      console.log(`   Description: ${testCase.description}`);

      try {
        let result;
        if (testCase.role) {
          // Test loginWithRole for multi-role users
          result = await AuthService.loginWithRole(testCase.phone, testCase.role as 'customer' | 'driver' | 'admin');
        } else {
          // Test regular login
          result = await AuthService.login(testCase.phone, 'password');
        }

        if (result.success) {
          console.log(`   ✅ Result: SUCCESS - User logged in as ${result.user?.role}`);
          if (testCase.expectedResult === 'FAIL') {
            console.log(`   ⚠️  WARNING: Expected FAIL but got SUCCESS`);
          }
        } else {
          console.log(`   ❌ Result: FAIL - ${result.error}`);
          if (testCase.expectedResult === 'SUCCESS') {
            console.log(`   ⚠️  WARNING: Expected SUCCESS but got FAIL`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Result: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (testCase.expectedResult === 'SUCCESS') {
          console.log(`   ⚠️  WARNING: Expected SUCCESS but got ERROR`);
        }
      }

      console.log(''); // Empty line for readability
    }

    console.log('🏁 Login Restriction Test Complete!\n');
    console.log('Summary:');
    console.log('- Regular drivers (createdByAdmin: false) should NOT be able to login');
    console.log('- Admin-created drivers (createdByAdmin: true) should be able to login');
    console.log('- Customers and admins are not affected by this restriction');
    console.log('- Multi-role users are filtered based on the selected role');
  }

  /**
   * Display current users in the system for debugging
   */
  static async displayUsers(): Promise<void> {
    console.log('👥 Current Users in System:');
    const users = await LocalStorageService.getUsers();
    
    users.forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.name} (${user.phone})`);
      if (user.role === 'driver') {
        console.log(`     - createdByAdmin: ${user.createdByAdmin}`);
        console.log(`     - isApproved: ${user.isApproved}`);
        console.log(`     - Vehicle: ${user.vehicleNumber}`);
      }
    });
    console.log('');
  }
}

// Export for easy testing
export default LoginRestrictionTest;
