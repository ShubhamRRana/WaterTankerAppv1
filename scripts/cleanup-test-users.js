/**
 * Cleanup script to delete all test users from Supabase
 * 
 * This script identifies and deletes test users based on phone number patterns
 * used in integration tests.
 * 
 * Usage:
 *   npm run cleanup:test-users
 * 
 * Or directly:
 *   node scripts/cleanup-test-users.js
 */

// Load environment variables
require('dotenv/config');

const { UserService } = require('../src/services/user.service');
const { supabase } = require('../src/services/supabase');

// Test phone number prefixes used in integration tests
const TEST_PHONE_PREFIXES = ['98765', '98766', '98767', '98768', '98769', '98770', '98799'];

async function cleanupTestUsers() {
  console.log('Starting cleanup of test users...\n');

  try {
    // Get all users
    console.log('Fetching all users...');
    const allUsers = await UserService.getAllUsers();
    console.log(`Found ${allUsers.length} total users\n`);

    // Filter test users by phone number prefix
    const testUsers = allUsers.filter(user => {
      return TEST_PHONE_PREFIXES.some(prefix => user.phone.startsWith(prefix));
    });

    if (testUsers.length === 0) {
      console.log('No test users found to delete.');
      return;
    }

    console.log(`Found ${testUsers.length} test users to delete:`);
    testUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.phone}) - ${user.role} - ID: ${user.uid}`);
    });
    console.log('');

    // Delete each test user
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of testUsers) {
      try {
        console.log(`Deleting user: ${user.name} (${user.phone})...`);
        await UserService.deleteUser(user.uid);
        
        // Also try to delete from auth.users if possible
        try {
          const { error: authError } = await supabase.auth.admin.deleteUser(user.uid);
          if (authError) {
            console.log(`  Warning: Could not delete auth user: ${authError.message}`);
          }
        } catch (error) {
          // Ignore auth deletion errors
          console.log(`  Note: Auth user deletion skipped (may require admin access)`);
        }
        
        deletedCount++;
        console.log(`  ✓ Deleted successfully\n`);
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`  ✗ Failed to delete: ${errorMessage}\n`);
      }
    }

    console.log('='.repeat(50));
    console.log(`Cleanup complete!`);
    console.log(`  Deleted: ${deletedCount} users`);
    console.log(`  Failed: ${failedCount} users`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTestUsers()
  .then(() => {
    console.log('\nCleanup script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

