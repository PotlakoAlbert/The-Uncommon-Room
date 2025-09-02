-- Migration to link admin and users tables
-- This script adds the adminId foreign key to users table and creates user records for existing admins

-- Step 1: Add adminId column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(admin_id);

-- Step 2: Create user records for existing admins
INSERT INTO users (name, email, password_hash, role, phone, address, admin_id, created_at, updated_at)
SELECT 
    a.name,
    a.email,
    a.password_hash,
    'admin'::role,
    a.phone,
    a.address,
    a.admin_id,
    a.created_at,
    a.updated_at
FROM admins a
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = a.email
);

-- Step 3: Update any existing admin users to have the correct adminId reference
UPDATE users 
SET admin_id = a.admin_id
FROM admins a
WHERE users.email = a.email 
  AND users.role = 'admin' 
  AND users.admin_id IS NULL;
