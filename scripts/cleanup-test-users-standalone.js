/**
 * Standalone cleanup script to delete all test users from Supabase
 * 
 * This script directly uses Supabase client to delete test users.
 * No need for TypeScript compilation - works with plain Node.js
 * 
 * Usage:
 *   node scripts/cleanup-test-users-standalone.js
 * 
 * Make sure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * set in your .env file or environment variables.
 */

// Load environment variables
require('dotenv/config');

const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test phone number prefixes used in integration tests
const TEST_PHONE_PREFIXES = ['98765', '98766', '98767', '98768', '98769', '98770', '98799'];

async function cleanupTestUsers() {
  console.log('Starting cleanup of test users...\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  try {
    // Build the filter for test users
    // We'll query users with phone numbers starting with any of the test prefixes
    let allTestUsers = [];
    
    for (const prefix of TEST_PHONE_PREFIXES) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .like('phone', `${prefix}%`);
      
      if (error) {
        console.error(`Error fetching users with prefix ${prefix}:`, error.message);
        continue;
      }
      
      if (data && data.length > 0) {
        allTestUsers = allTestUsers.concat(data);
      }
    }

    if (allTestUsers.length === 0) {
      console.log('✓ No test users found to delete.');
      return;
    }

    console.log(`Found ${allTestUsers.length} test users to delete:\n`);
    allTestUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || 'N/A'} (${user.phone}) - ${user.role} - Auth ID: ${user.auth_id}`);
    });
    console.log('');

    // Delete each test user
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of allTestUsers) {
      try {
        console.log(`Deleting user: ${user.name || 'N/A'} (${user.phone})...`);
        
        // Delete from users table (this will cascade delete related records)
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('auth_id', user.auth_id);
        
        if (deleteError) {
          throw new Error(deleteError.message);
        }
        
        // Note: Deleting from auth.users requires admin access
        // The user record in users table is deleted, which is the main goal
        // Auth users can be cleaned up manually from Supabase Dashboard if needed
        
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
    console.log(`  ✓ Deleted: ${deletedCount} users`);
    if (failedCount > 0) {
      console.log(`  ✗ Failed: ${failedCount} users`);
    }
    console.log('='.repeat(50));
    
    if (failedCount === 0) {
      console.log('\n✓ All test users deleted successfully!');
      console.log('Note: Auth users in auth.users table may still exist.');
      console.log('You can delete them manually from Supabase Dashboard → Authentication → Users if needed.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
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
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

