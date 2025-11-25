-- Script to reset all user passwords to "testing"
-- 
-- IMPORTANT NOTES:
-- 1. This script updates passwords in the auth.users table
-- 2. Supabase uses bcrypt hashing for passwords
-- 3. You need to use Supabase's password hashing function or Admin API
--
-- OPTION 1: Using Supabase Admin API (Recommended)
-- Run this via Supabase Dashboard > SQL Editor or Supabase CLI
--
-- OPTION 2: Using Supabase Functions
-- You may need to create a function that properly hashes the password

-- Method 1: Direct SQL Update (if you have access to auth schema)
-- WARNING: This requires knowing the exact bcrypt hash format
-- The password "testing" hashed with bcrypt would look like: $2a$10$...
-- This is NOT recommended as it's complex to generate correctly

-- Method 2: Using Supabase Admin API (Recommended)
-- You would need to use the Supabase Admin API or a server-side function
-- to properly hash and update passwords

-- Method 3: Reset via Supabase Dashboard
-- Go to Authentication > Users > Select each user > Reset Password
-- This is the safest method but manual

-- Method 4: Create a function to update passwords
-- This function can be called from your application or via SQL

-- SQL Function to update password (requires proper bcrypt hashing)
-- Note: This is a template - you'll need to adjust based on your Supabase setup

-- First, let's see all users
SELECT 
    id,
    email,
    phone,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- To update passwords, you have a few options:

-- OPTION A: Use Supabase Admin API (Best Practice)
-- Create a server-side script or use Supabase Management API:
-- 
-- const { createClient } = require('@supabase/supabase-js')
-- const supabaseAdmin = createClient(
--   process.env.SUPABASE_URL,
--   process.env.SUPABASE_SERVICE_ROLE_KEY // Admin key
-- )
-- 
-- // Get all users
-- const { data: users } = await supabaseAdmin.auth.admin.listUsers()
-- 
-- // Update each user's password
-- for (const user of users.users) {
--   await supabaseAdmin.auth.admin.updateUserById(user.id, {
--     password: 'testing'
--   })
-- }

-- OPTION B: Use Supabase CLI
-- supabase db execute --file reset_passwords.sql

-- OPTION C: Manual SQL (if you have the bcrypt hash)
-- This is NOT recommended unless you know the exact hash format
-- UPDATE auth.users
-- SET encrypted_password = '$2a$10$...' -- bcrypt hash of "testing"
-- WHERE deleted_at IS NULL;

-- For now, here's a query to see which users exist:
SELECT 
    id,
    email,
    phone,
    email_confirmed_at,
    phone_confirmed_at,
    created_at,
    updated_at
FROM auth.users
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- To actually update passwords, you'll need to:
-- 1. Use Supabase Admin API (recommended)
-- 2. Use Supabase Dashboard manually
-- 3. Create a server-side function that uses Supabase Admin SDK

