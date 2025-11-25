#!/usr/bin/env node

/**
 * Check and Fix auth.users Using users Table as Source of Truth
 * 
 * This script:
 * 1. Checks for mismatches between users table and auth.users
 * 2. Updates existing auth.users records to match users table
 * 3. Creates missing auth.users records using Admin API
 * 4. Provides detailed reporting
 * 
 * Usage:
 *   node check_and_fix_auth_users.js [--dry-run] [--fix-only] [--check-only]
 * 
 * Options:
 *   --dry-run    : Only check, don't make any changes
 *   --fix-only    : Skip checks, go straight to fixing
 *   --check-only  : Only check, don't fix (same as --dry-run)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('--check-only');
const FIX_ONLY = args.includes('--fix-only');
const CHECK_ONLY = args.includes('--check-only') || args.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Supabase credentials not found.');
  console.error('   Ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Convert phone number to E.164 format for Hong Kong
 * E.164 format: +[country code][number] (e.g., +85255511111)
 * 
 * Hong Kong country code: 852
 * Phone numbers: 8 digits
 * 
 * @param {string} phone - Phone number (8 digits for Hong Kong)
 * @returns {string|null} - Phone number in E.164 format, or null if invalid
 */
function convertToE164HongKong(phone) {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all whitespace and non-digit characters
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  
  if (digits.length === 0) return null;
  
  // If already starts with +, validate and return as-is if valid
  if (trimmed.startsWith('+')) {
    const digitsAfterPlus = trimmed.substring(1).replace(/\D/g, '');
    if (digitsAfterPlus.length >= 7 && digitsAfterPlus.length <= 15) {
      return `+${digitsAfterPlus}`;
    }
    // Invalid format, try to fix
  }
  
  // If 8 digits, assume Hong Kong local number (country code 852)
  // Format: 55511111 -> +85255511111
  if (digits.length === 8) {
    return `+852${digits}`;
  }
  
  // If 11 digits and starts with 852, it's already Hong Kong format
  // Format: 85255511111 -> +85255511111
  if (digits.length === 11 && digits.startsWith('852')) {
    return `+${digits}`;
  }
  
  // If 10 digits, might be missing leading 0 (some HK numbers)
  // But typically HK numbers are 8 digits, so this is unusual
  if (digits.length === 10) {
    console.warn(`⚠️  Phone number has 10 digits (unusual for HK): ${phone}, converting to +852${digits}`);
    return `+852${digits}`;
  }
  
  // Invalid length for Hong Kong
  console.warn(`⚠️  Phone number has invalid length for Hong Kong: ${phone} (${digits.length} digits)`);
  return null;
}

// Statistics tracking
const stats = {
  checks: {
    totalUsers: 0,
    totalAuthUsers: 0,
    missingFromAuth: 0,
    emailMismatches: 0,
    phoneMismatches: 0,
    nameMismatches: 0,
    roleMismatches: 0,
    metadataMismatches: 0,
    duplicatePhones: 0,
  },
  fixes: {
    updated: 0,
    created: 0,
    skipped: 0,
    errors: []
  }
};

/**
 * Step 1: Check for issues
 */
async function checkIssues() {
  console.log('\n=== STEP 1: CHECKING FOR ISSUES ===\n');

  try {
    // Fetch all users from public.users table
    console.log('📋 Fetching users from public.users table...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in public.users table.');
      return { users: [], issues: [] };
    }

    stats.checks.totalUsers = users.length;
    console.log(`✅ Found ${users.length} users in public.users table.`);

    // Fetch all auth.users
    console.log('📋 Fetching auth.users records...');
    const { data: authUsersData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error listing auth.users:', authListError.message);
      throw authListError;
    }

    stats.checks.totalAuthUsers = authUsersData.users.length;
    console.log(`✅ Found ${authUsersData.users.length} auth.users records.\n`);

    // Create lookup maps
    const authUsersById = new Map();
    const authUsersByEmail = new Map();
    const authUsersByPhone = new Map();
    
    authUsersData.users.forEach(user => {
      authUsersById.set(user.id, user);
      if (user.email) {
        authUsersByEmail.set(user.email.toLowerCase(), user);
      }
      if (user.phone) {
        authUsersByPhone.set(user.phone, user);
      }
    });

    // Check for duplicate phones in users table
    console.log('📋 Checking for duplicate phone numbers...');
    const phoneCounts = new Map();
    users.forEach(user => {
      if (user.phone) {
        const count = phoneCounts.get(user.phone) || 0;
        phoneCounts.set(user.phone, count + 1);
      }
    });

    const duplicatePhones = Array.from(phoneCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([phone, count]) => ({ phone, count }));

    if (duplicatePhones.length > 0) {
      stats.checks.duplicatePhones = duplicatePhones.length;
      console.log(`⚠️  Found ${duplicatePhones.length} duplicate phone numbers:`);
      duplicatePhones.forEach(({ phone, count }) => {
        const usersWithPhone = users.filter(u => u.phone === phone);
        console.log(`   - ${phone}: ${count} users (${usersWithPhone.map(u => u.email || u.id).join(', ')})`);
      });
      console.log('');
    } else {
      console.log('✅ No duplicate phone numbers found.\n');
    }

    // Check each user for issues
    console.log('📋 Checking for mismatches...\n');
    const issues = [];

    for (const user of users) {
      const userEmail = user.email || `${user.phone}@buildtrack.local`;
      const authUser = authUsersById.get(user.id);

      if (!authUser) {
        // Check if user exists by email or phone
        const authByEmail = user.email ? authUsersByEmail.get(user.email.toLowerCase()) : null;
        const authByPhone = user.phone ? authUsersByPhone.get(user.phone) : null;
        
        if (authByEmail || authByPhone) {
          issues.push({
            user,
            type: 'ID_MISMATCH',
            authUser: authByEmail || authByPhone,
            message: `User exists in auth.users but with different ID (found by ${authByEmail ? 'email' : 'phone'})`
          });
        } else {
          issues.push({
            user,
            type: 'MISSING_FROM_AUTH',
            message: 'User exists in users table but not in auth.users'
          });
          stats.checks.missingFromAuth++;
        }
        continue;
      }

      // Check for mismatches
      const mismatches = [];

      // Email mismatch
      if (authUser.email !== user.email) {
        mismatches.push('EMAIL');
        stats.checks.emailMismatches++;
      }

      // Phone mismatch - normalize both for comparison
      // auth.users might have phone in format "85255511111" (without +) or "+85255511111"
      // users table has "55511111" (8 digits)
      const userPhoneE164 = user.phone ? convertToE164HongKong(user.phone) : null;
      const authPhoneNormalized = authUser.phone ? authUser.phone.replace(/^\+?/, '') : null;
      const userPhoneNormalized = userPhoneE164 ? userPhoneE164.replace(/^\+?/, '') : null;
      
      if (authPhoneNormalized !== userPhoneNormalized) {
        mismatches.push('PHONE');
        stats.checks.phoneMismatches++;
      }

      // Name mismatch
      const authName = authUser.user_metadata?.name;
      if (authName !== user.name) {
        mismatches.push('NAME');
        stats.checks.nameMismatches++;
      }

      // Role mismatch
      const authRole = authUser.user_metadata?.role;
      if (authRole !== user.role) {
        mismatches.push('ROLE');
        stats.checks.roleMismatches++;
      }

      // Other metadata mismatches
      const metadataMismatches = [];
      if (authUser.user_metadata?.company_id !== user.company_id?.toString()) {
        metadataMismatches.push('company_id');
      }
      if (authUser.user_metadata?.position !== user.position) {
        metadataMismatches.push('position');
      }
      if (authUser.user_metadata?.is_pending !== user.is_pending) {
        metadataMismatches.push('is_pending');
      }
      if (authUser.user_metadata?.approved_by !== user.approved_by?.toString()) {
        metadataMismatches.push('approved_by');
      }

      if (metadataMismatches.length > 0) {
        mismatches.push('METADATA');
        stats.checks.metadataMismatches++;
      }

      if (mismatches.length > 0) {
        issues.push({
          user,
          authUser,
          type: 'MISMATCH',
          mismatches,
          metadataMismatches,
          message: `Mismatches: ${mismatches.join(', ')}`
        });
      }
    }

    // Print summary
    console.log('📊 ISSUE SUMMARY:');
    console.log(`   Total users in users table: ${stats.checks.totalUsers}`);
    console.log(`   Total users in auth.users: ${stats.checks.totalAuthUsers}`);
    console.log(`   Missing from auth.users: ${stats.checks.missingFromAuth}`);
    console.log(`   Email mismatches: ${stats.checks.emailMismatches}`);
    console.log(`   Phone mismatches: ${stats.checks.phoneMismatches}`);
    console.log(`   Name mismatches: ${stats.checks.nameMismatches}`);
    console.log(`   Role mismatches: ${stats.checks.roleMismatches}`);
    console.log(`   Metadata mismatches: ${stats.checks.metadataMismatches}`);
    console.log(`   Duplicate phones: ${stats.checks.duplicatePhones}`);
    console.log(`   Total issues found: ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('📋 DETAILED ISSUES:');
      issues.forEach((issue, index) => {
        const userEmail = issue.user.email || `${issue.user.phone}@buildtrack.local`;
        console.log(`\n   ${index + 1}. ${userEmail} (ID: ${issue.user.id})`);
        console.log(`      Type: ${issue.type}`);
        console.log(`      Issue: ${issue.message}`);
        
        if (issue.mismatches) {
          console.log(`      Mismatches: ${issue.mismatches.join(', ')}`);
          if (issue.metadataMismatches && issue.metadataMismatches.length > 0) {
            console.log(`      Metadata fields: ${issue.metadataMismatches.join(', ')}`);
          }
        }
      });
      console.log('');
    } else {
      console.log('✅ No issues found! All users are in sync.\n');
    }

    return { users, issues, authUsersById };

  } catch (error) {
    console.error('\n❌ Error during check:', error.message);
    throw error;
  }
}

/**
 * Step 2: Fix issues
 */
async function fixIssues(users, issues, authUsersById) {
  if (CHECK_ONLY || DRY_RUN) {
    console.log('\n=== SKIPPING FIXES (--check-only/--dry-run mode) ===\n');
    return;
  }

  console.log('\n=== STEP 2: FIXING ISSUES ===\n');

  if (!issues || issues.length === 0) {
    console.log('✅ No issues to fix!\n');
    return;
  }

  // Group issues by type
  const missingUsers = issues.filter(i => i.type === 'MISSING_FROM_AUTH');
  const mismatchUsers = issues.filter(i => i.type === 'MISMATCH');
  const idMismatchUsers = issues.filter(i => i.type === 'ID_MISMATCH');

  // Fix mismatches first (updates)
  if (mismatchUsers.length > 0) {
    console.log(`📋 Fixing ${mismatchUsers.length} mismatched users...\n`);
    
    // Get all auth users for conflict checking
    const { data: allAuthUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsersByEmail = new Map();
    const authUsersByPhone = new Map();
    allAuthUsersData.users.forEach(au => {
      if (au.email) authUsersByEmail.set(au.email.toLowerCase(), au);
      if (au.phone) authUsersByPhone.set(au.phone, au);
    });
    
    for (const issue of mismatchUsers) {
      const { user, authUser } = issue;
      const userEmail = user.email || `${user.phone}@buildtrack.local`;

      try {
        console.log(`🔄 Updating: ${userEmail} (ID: ${user.id})`);

        // Convert phone to E.164 format if provided
        let phoneE164 = null;
        if (user.phone) {
          phoneE164 = convertToE164HongKong(user.phone);
          if (!phoneE164) {
            console.warn(`   ⚠️  Phone number could not be converted to E.164: ${user.phone}`);
            // Keep existing phone if conversion fails
            phoneE164 = authUser.phone || null;
          } else {
            // Check if phone actually needs updating (normalize both for comparison)
            const authPhoneNormalized = authUser.phone ? authUser.phone.replace(/^\+?/, '') : null;
            const newPhoneNormalized = phoneE164.replace(/^\+?/, '');
            if (authPhoneNormalized !== newPhoneNormalized) {
              console.log(`   📞 Converting phone: ${authUser.phone || 'none'} → ${phoneE164}`);
            } else {
              // Phone is already correct, keep existing
              phoneE164 = authUser.phone || null;
            }
          }
        } else {
          // Use existing phone if user doesn't have one
          phoneE164 = authUser.phone || null;
        }

        // Check for email conflicts
        const targetEmail = user.email || authUser.email;
        if (targetEmail) {
          const conflictingUser = authUsersByEmail.get(targetEmail.toLowerCase());
          if (conflictingUser && conflictingUser.id !== authUser.id) {
            console.error(`   ❌ Email conflict: ${targetEmail} already exists for user ${conflictingUser.id}`);
            stats.fixes.errors.push({ 
              user: userEmail, 
              error: `Email conflict: ${targetEmail} already exists for another user`, 
              action: 'update' 
            });
            stats.fixes.skipped++;
            continue;
          }
        }

        // Check for phone conflicts
        if (phoneE164) {
          const conflictingUser = authUsersByPhone.get(phoneE164);
          if (conflictingUser && conflictingUser.id !== authUser.id) {
            console.warn(`   ⚠️  Phone conflict: ${phoneE164} already exists for user ${conflictingUser.id}, keeping existing phone`);
            phoneE164 = authUser.phone || null; // Keep existing phone
          }
        }

        // Check if update is actually needed
        const emailNeedsUpdate = (user.email || authUser.email) !== authUser.email;
        // Normalize phone for comparison (both +85255511111 and 85255511111 are equivalent)
        const phoneNeedsUpdate = phoneE164 && authUser.phone && 
          phoneE164.replace(/^\+?/, '') !== authUser.phone.replace(/^\+?/, '');
        const nameNeedsUpdate = user.name !== (authUser.user_metadata?.name);
        const roleNeedsUpdate = user.role !== (authUser.user_metadata?.role);
        const companyIdNeedsUpdate = (user.company_id?.toString() || null) !== (authUser.user_metadata?.company_id);
        const positionNeedsUpdate = (user.position || null) !== (authUser.user_metadata?.position);
        const isPendingNeedsUpdate = (user.is_pending ?? false) !== (authUser.user_metadata?.is_pending ?? false);
        const approvedByNeedsUpdate = (user.approved_by?.toString() || null) !== (authUser.user_metadata?.approved_by);
        const approvedAtNeedsUpdate = (user.approved_at || null) !== (authUser.user_metadata?.approved_at);

        const needsUpdate = emailNeedsUpdate || phoneNeedsUpdate || nameNeedsUpdate || roleNeedsUpdate || 
                           companyIdNeedsUpdate || positionNeedsUpdate || isPendingNeedsUpdate || 
                           approvedByNeedsUpdate || approvedAtNeedsUpdate;

        if (!needsUpdate) {
          console.log(`   ⏭️  No changes needed, skipping update`);
          continue;
        }

        const updateData = {
          email: user.email || authUser.email,
          phone: phoneE164,
          user_metadata: {
            ...authUser.user_metadata,
            name: user.name,
            role: user.role,
            company_id: user.company_id?.toString() || null,
            position: user.position || null,
            is_pending: user.is_pending ?? false,
            approved_by: user.approved_by?.toString() || null,
            approved_at: user.approved_at || null,
          }
        };

        // Clean up null/undefined values
        Object.keys(updateData.user_metadata).forEach(key => {
          if (updateData.user_metadata[key] === null || updateData.user_metadata[key] === undefined) {
            delete updateData.user_metadata[key];
          }
        });

        // Validate update data before sending
        if (updateData.email && !updateData.email.includes('@')) {
          console.error(`   ❌ Invalid email format: ${updateData.email}`);
          stats.fixes.errors.push({ 
            user: userEmail, 
            error: `Invalid email format: ${updateData.email}`, 
            action: 'update' 
          });
          stats.fixes.skipped++;
          continue;
        }

        // Log what we're updating for debugging
        if (issue.mismatches && issue.mismatches.includes('PHONE')) {
          console.log(`   📞 Phone update: ${authUser.phone || 'none'} → ${phoneE164 || 'none'}`);
        }
        if (issue.mismatches && issue.mismatches.includes('EMAIL')) {
          console.log(`   📧 Email update: ${authUser.email || 'none'} → ${updateData.email || 'none'}`);
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          updateData
        );

        if (updateError) {
          console.error(`   ❌ Update failed: ${updateError.message}`);
          console.error(`   📋 Error details:`, JSON.stringify(updateError, null, 2));
          console.error(`   📋 Update data attempted:`, JSON.stringify({
            email: updateData.email,
            phone: updateData.phone ? '***' : null,
            has_metadata: !!updateData.user_metadata
          }, null, 2));
          stats.fixes.errors.push({ 
            user: userEmail, 
            error: updateError.message || 'Error updating user',
            errorDetails: updateError,
            action: 'update' 
          });
          stats.fixes.skipped++;
        } else {
          console.log(`   ✅ Updated successfully`);
          stats.fixes.updated++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Unexpected error: ${error.message}`);
        console.error(`   📋 Error stack:`, error.stack);
        console.error(`   📋 User data:`, JSON.stringify({
          id: user.id,
          email: user.email,
          phone: user.phone ? '***' : null
        }, null, 2));
        stats.fixes.errors.push({ 
          user: userEmail, 
          error: error.message || 'Unexpected error',
          errorStack: error.stack,
          action: 'update' 
        });
        stats.fixes.skipped++;
      }
    }
  }

  // Fix missing users (create)
  if (missingUsers.length > 0) {
    console.log(`\n📋 Creating ${missingUsers.length} missing auth.users records...\n`);

    for (const issue of missingUsers) {
      const { user } = issue;
      const userEmail = user.email || `${user.phone}@buildtrack.local`;

      try {
        console.log(`➕ Creating: ${userEmail} (ID: ${user.id})`);

        // Convert phone to E.164 format if provided
        let phoneE164 = null;
        if (user.phone) {
          phoneE164 = convertToE164HongKong(user.phone);
          if (!phoneE164) {
            console.warn(`   ⚠️  Phone number could not be converted to E.164: ${user.phone}`);
            console.warn(`   ⚠️  User will be created without phone number`);
          } else if (phoneE164 !== user.phone) {
            console.log(`   📞 Converting phone: ${user.phone} → ${phoneE164}`);
          }
        }

        // Generate a temporary password
        const tempPassword = `temp_${user.id.substring(0, 8)}_${Date.now()}`;

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: user.id, // Use the same ID from users table
          email: user.email || undefined,
          phone: phoneE164 || undefined, // Use E.164 formatted phone (required by Supabase)
          email_confirm: true, // Auto-confirm email
          password: tempPassword,
          user_metadata: {
            name: user.name,
            role: user.role,
            company_id: user.company_id?.toString() || null,
            position: user.position || null,
            is_pending: user.is_pending ?? false,
            approved_by: user.approved_by?.toString() || null,
            approved_at: user.approved_at || null,
          }
        });

        if (createError) {
          console.error(`   ❌ Creation failed: ${createError.message}`);
          stats.fixes.errors.push({ 
            user: userEmail, 
            error: createError.message, 
            action: 'create' 
          });
          stats.fixes.skipped++;
        } else {
          console.log(`   ✅ Created successfully`);
          
          // Set password to "testing" for consistency
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            newUser.user.id,
            { password: 'testing' }
          );
          
          if (passwordError) {
            console.error(`   ⚠️  Password reset failed: ${passwordError.message}`);
          } else {
            console.log(`   ✅ Password set to "testing"`);
          }
          
          stats.fixes.created++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Unexpected error: ${error.message}`);
        stats.fixes.errors.push({ 
          user: userEmail, 
          error: error.message, 
          action: 'create' 
        });
        stats.fixes.skipped++;
      }
    }
  }

  // Handle ID mismatches (warn only - requires manual intervention)
  if (idMismatchUsers.length > 0) {
    console.log(`\n⚠️  Found ${idMismatchUsers.length} users with ID mismatches (requires manual intervention):\n`);
    idMismatchUsers.forEach((issue, index) => {
      const userEmail = issue.user.email || `${issue.user.phone}@buildtrack.local`;
      console.log(`   ${index + 1}. ${userEmail}`);
      console.log(`      Users table ID: ${issue.user.id}`);
      console.log(`      Auth.users ID: ${issue.authUser.id}`);
      console.log(`      Action: Manual merge or deletion required\n`);
    });
  }
}

/**
 * Step 3: Verify fixes
 */
async function verifyFixes() {
  if (CHECK_ONLY || DRY_RUN) {
    return;
  }

  console.log('\n=== STEP 3: VERIFYING FIXES ===\n');

  try {
    // Re-check to verify fixes
    const { users, issues } = await checkIssues();

    if (issues.length === 0) {
      console.log('✅ All issues have been resolved!\n');
    } else {
      console.log(`⚠️  ${issues.length} issues remain. Review the details above.\n`);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Check and Fix auth.users Using users Table as Source     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (DRY_RUN || CHECK_ONLY) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    if (!FIX_ONLY) {
      // Step 1: Check for issues
      const { users, issues, authUsersById } = await checkIssues();

      // Step 2: Fix issues
      await fixIssues(users, issues, authUsersById);

      // Step 3: Verify fixes
      await verifyFixes();
    } else {
      // Fix-only mode: skip checks and go straight to fixing
      console.log('\n⚠️  FIX-ONLY MODE - Skipping checks\n');
      const { data: users } = await supabaseAdmin.from('users').select('*');
      const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
      
      const authUsersById = new Map();
      authUsersData.users.forEach(user => {
        authUsersById.set(user.id, user);
      });

      const issues = users
        .filter(user => {
          const authUser = authUsersById.get(user.id);
          return !authUser || 
                 authUser.email !== user.email ||
                 authUser.phone !== user.phone ||
                 authUser.user_metadata?.name !== user.name ||
                 authUser.user_metadata?.role !== user.role;
        })
        .map(user => ({
          user,
          authUser: authUsersById.get(user.id),
          type: authUsersById.get(user.id) ? 'MISMATCH' : 'MISSING_FROM_AUTH',
          message: authUsersById.get(user.id) ? 'Mismatch detected' : 'Missing from auth.users'
        }));

      await fixIssues(users, issues, authUsersById);
      await verifyFixes();
    }

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  FINAL SUMMARY                                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 CHECK RESULTS:');
    console.log(`   Total users: ${stats.checks.totalUsers}`);
    console.log(`   Missing from auth: ${stats.checks.missingFromAuth}`);
    console.log(`   Email mismatches: ${stats.checks.emailMismatches}`);
    console.log(`   Phone mismatches: ${stats.checks.phoneMismatches}`);
    console.log(`   Name mismatches: ${stats.checks.nameMismatches}`);
    console.log(`   Role mismatches: ${stats.checks.roleMismatches}`);
    console.log(`   Metadata mismatches: ${stats.checks.metadataMismatches}\n`);

    if (!CHECK_ONLY && !DRY_RUN) {
      console.log('🔧 FIX RESULTS:');
      console.log(`   Updated: ${stats.fixes.updated}`);
      console.log(`   Created: ${stats.fixes.created}`);
      console.log(`   Skipped: ${stats.fixes.skipped}`);
      console.log(`   Errors: ${stats.fixes.errors.length}\n`);

      if (stats.fixes.errors.length > 0) {
        console.log('❌ ERRORS:');
        stats.fixes.errors.forEach((err, index) => {
          console.log(`   ${index + 1}. ${err.user} (${err.action}): ${err.error}`);
        });
        console.log('');
      }

      if (stats.fixes.created > 0) {
        console.log('📝 NOTE: New users created with password "testing"');
        console.log('   Users should change their password after first login.\n');
      }
    }

    console.log('✅ Script completed!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

