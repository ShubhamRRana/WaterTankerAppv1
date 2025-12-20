# Database Migrations

This directory contains SQL migration files for updating the Supabase database schema.

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of the migration file
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## Migration Files

### 001_update_bank_accounts_table.sql

**Purpose**: Updates the `bank_accounts` table to use QR code images instead of bank account details.

**Changes**:
- Removes columns: `account_holder_name`, `bank_name`, `account_number`, `ifsc_code`, `branch_name`
- Adds column: `qr_code_image_url` (TEXT)

**Important Notes**:
- ⚠️ **This migration will permanently delete existing bank account detail data**
- Make sure to backup your data before running this migration if you need to preserve it
- After running this migration, admins will need to upload QR code images for their bank accounts

**When to Run**: 
- Run this migration when updating the app to use QR code images for payment collection
- Run before deploying the updated frontend code

### 002_create_storage_bucket.sql

**Purpose**: Sets up Supabase Storage bucket and policies for QR code images.

**Important Notes**:
- ⚠️ **This file contains SQL for storage policies, but the bucket itself must be created via Supabase Dashboard**
- The bucket must be created manually in Supabase Dashboard -> Storage
- Bucket name: `bank-qr-codes`
- Must be set as **Public** so QR codes can be accessed without authentication

**Steps to Create Bucket**:
1. Go to Supabase Dashboard -> Storage
2. Click "New bucket"
3. Name: `bank-qr-codes`
4. Public bucket: **YES** (required for QR code access)
5. File size limit: 5 MB (adjust as needed)
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/jpg`
7. Click "Create bucket"

**When to Run**: 
- Run after creating the bucket in the dashboard
- The SQL policies can be applied via SQL Editor after the bucket is created

## Verification

After running a migration, verify the changes:

```sql
-- Check bank_accounts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
ORDER BY ordinal_position;
```

Expected columns after migration:
- `id` (uuid)
- `admin_id` (uuid)
- `qr_code_image_url` (text)
- `is_default` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Rollback

If you need to rollback this migration, you would need to:

1. Add back the removed columns
2. Remove the `qr_code_image_url` column
3. Restore data from backup (if available)

**Note**: Rollback is only possible if you have a backup of the original data.

