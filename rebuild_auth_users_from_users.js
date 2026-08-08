/**
 * Rebuild auth.users from public.users (service-role).
 *
 * Usage:
 *   node rebuild_auth_users_from_users.js [--dry-run|--check-only] [--apply]
 *
 * Default = dry-run (no writes). Pass --apply to perform updates/creates.
 * --dry-run / --check-only force dry-run even if --apply is also present.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const FORCE_DRY = args.includes('--dry-run') || args.includes('--check-only');
const APPLY = args.includes('--apply') && !FORCE_DRY;
const DRY_RUN = !APPLY;

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

async function rebuildAuthUsers() {
  console.log('\n=== Rebuilding auth.users from users table ===\n');
  console.log(
    DRY_RUN
      ? '🔒 Mode: DRY-RUN (default) — no writes. Pass --apply to mutate auth.users.\n'
      : '⚠️  Mode: APPLY — will update/create auth.users records.\n'
  );

  try {
    // Step 1: Fetch all users from public.users table
    console.log('📋 Step 1: Fetching all users from public.users table...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in public.users table.');
      return;
    }

    console.log(`✅ Found ${users.length} users in public.users table.\n`);

    // Step 2: Check existing auth.users records
    console.log('📋 Step 2: Checking existing auth.users records...');
    const { data: authUsersData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error listing auth.users:', authListError.message);
      return;
    }

    const existingAuthUsers = new Map();
    authUsersData.users.forEach(user => {
      existingAuthUsers.set(user.id, user);
      if (user.email) existingAuthUsers.set(user.email.toLowerCase(), user);
      if (user.phone) existingAuthUsers.set(user.phone, user);
    });

    console.log(`✅ Found ${authUsersData.users.length} existing auth.users records.\n`);

    // Step 3: Process each user
    console.log('📋 Step 3: Processing users...\n');
    
    const results = {
      updated: 0,
      created: 0,
      wouldUpdate: 0,
      wouldCreate: 0,
      skipped: 0,
      errors: []
    };

    for (const user of users) {
      const userEmail = user.email || `${user.phone}@buildtrack.local`;
      const existingAuthUser = existingAuthUsers.get(user.id) || existingAuthUsers.get(userEmail.toLowerCase());

      try {
        if (existingAuthUser) {
          // User exists in auth.users - update it
          console.log(`🔄 Updating auth.users for: ${userEmail} (ID: ${user.id})`);
          
          // Convert phone to E.164 format if provided
          let phoneE164 = null;
          if (user.phone) {
            phoneE164 = convertToE164HongKong(user.phone);
            if (phoneE164 && user.phone !== phoneE164) {
              console.log(`   📱 Phone converted: ${user.phone} → ${phoneE164}`);
            }
            if (!phoneE164) {
              console.warn(`   ⚠️  Phone number could not be converted to E.164: ${user.phone}`);
              // Try to use existing phone if conversion fails
              phoneE164 = existingAuthUser.phone || null;
            }
          } else {
            phoneE164 = existingAuthUser.phone || null;
          }
          
          // Check if phone already exists for another user
          if (phoneE164) {
            const { data: phoneCheck, error: phoneCheckError } = await supabaseAdmin.auth.admin.listUsers();
            if (!phoneCheckError && phoneCheck) {
              const phoneConflict = phoneCheck.users.find(u => 
                u.phone === phoneE164 && u.id !== existingAuthUser.id
              );
              if (phoneConflict) {
                console.warn(`   ⚠️  Phone ${phoneE164} already exists for user ${phoneConflict.email || phoneConflict.id}`);
                console.warn(`   ⚠️  Skipping phone update to avoid duplicate`);
                phoneE164 = existingAuthUser.phone || null; // Keep existing phone
              }
            }
          }
          
          // Build user_metadata carefully, removing undefined/null values
          const userMetadata = {};
          if (user.name !== undefined && user.name !== null) userMetadata.name = user.name;
          if (user.role !== undefined && user.role !== null) userMetadata.role = user.role;
          if (user.company_id !== undefined && user.company_id !== null) userMetadata.company_id = user.company_id.toString();
          if (user.position !== undefined && user.position !== null) userMetadata.position = user.position;
          if (user.is_pending !== undefined && user.is_pending !== null) userMetadata.is_pending = user.is_pending;
          if (user.approved_by !== undefined && user.approved_by !== null) userMetadata.approved_by = user.approved_by.toString();
          if (user.approved_at !== undefined && user.approved_at !== null) userMetadata.approved_at = user.approved_at;
          
          const updateData = {
            email: user.email || existingAuthUser.email,
            user_metadata: userMetadata
          };
          
          // Only add phone if it's different from existing or if we want to set it
          if (phoneE164 !== existingAuthUser.phone) {
            if (phoneE164) {
              updateData.phone = phoneE164;
            } else if (existingAuthUser.phone) {
              // Don't clear phone if it exists, just skip the update
              console.log(`   ℹ️  Skipping phone update (keeping existing: ${existingAuthUser.phone})`);
            }
          }

          // Log what we're about to send
          console.log(`   📋 Update data:`, JSON.stringify({
            email: updateData.email,
            phone: updateData.phone || '(unchanged)',
            user_metadata: updateData.user_metadata
          }, null, 2));

          if (DRY_RUN) {
            console.log('   [dry-run] would call auth.admin.updateUserById');
            results.wouldUpdate++;
            continue;
          }

          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingAuthUser.id,
            updateData
          );

          if (updateError) {
            console.error(`   ❌ Update failed: ${updateError.message}`);
            console.error(`   📋 Error code: ${updateError.code || 'N/A'}`);
            console.error(`   📋 Error status: ${updateError.status || 'N/A'}`);
            console.error(`   📋 Full error details:`, JSON.stringify(updateError, null, 2));
            
            // Try updating without phone if phone was the issue
            if (updateData.phone && updateError.code === 'unexpected_failure') {
              console.log(`   🔄 Retrying update without phone field...`);
              const retryData = {
                email: updateData.email,
                user_metadata: updateData.user_metadata
              };
              
              const { data: retryUser, error: retryError } = await supabaseAdmin.auth.admin.updateUserById(
                existingAuthUser.id,
                retryData
              );
              
              if (retryError) {
                console.error(`   ❌ Retry also failed: ${retryError.message}`);
                results.errors.push({ 
                  user: userEmail, 
                  error: `Original: ${updateError.message}, Retry: ${retryError.message}`, 
                  fullError: updateError,
                  retryError: retryError,
                  action: 'update',
                  userId: user.id,
                  phone: user.phone,
                  phoneE164: phoneE164
                });
              } else {
                console.log(`   ✅ Updated successfully (without phone)`);
                results.updated++;
              }
            } else {
              results.errors.push({ 
                user: userEmail, 
                error: updateError.message, 
                fullError: updateError,
                action: 'update',
                userId: user.id,
                phone: user.phone,
                phoneE164: phoneE164
              });
            }
          } else {
            console.log(`   ✅ Updated successfully`);
            results.updated++;
          }
        } else {
          // User doesn't exist in auth.users - create it
          console.log(`➕ Creating auth.users for: ${userEmail} (ID: ${user.id})`);
          
          // Convert phone to E.164 format if provided
          const phoneE164 = user.phone ? convertToE164HongKong(user.phone) : undefined;
          
          if (user.phone && phoneE164 && user.phone !== phoneE164) {
            console.log(`   📱 Phone converted: ${user.phone} → ${phoneE164}`);
          }
          
          if (user.phone && !phoneE164) {
            console.warn(`   ⚠️  Phone number could not be converted to E.164: ${user.phone}`);
          }
          
          // Generate a temporary password (user will need to reset it)
          const tempPassword = `temp_${user.id.substring(0, 8)}_${Date.now()}`;

          const createPayload = {
            id: user.id, // Use the same ID from users table
            email: user.email || undefined,
            phone: phoneE164, // Use E.164 formatted phone (required by Supabase)
            email_confirm: true, // Auto-confirm email
            password: tempPassword,
            user_metadata: {
              name: user.name,
              role: user.role,
              company_id: user.company_id?.toString(),
              position: user.position,
              is_pending: user.is_pending,
              approved_by: user.approved_by?.toString(),
              approved_at: user.approved_at
            }
          };

          console.log('   📋 Create diff:', JSON.stringify({
            id: createPayload.id,
            email: createPayload.email,
            phone: createPayload.phone || null,
            user_metadata: createPayload.user_metadata
          }, null, 2));

          if (DRY_RUN) {
            console.log('   [dry-run] would call auth.admin.createUser + password reset');
            results.wouldCreate++;
            continue;
          }
          
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser(createPayload);

          if (createError) {
            console.error(`   ❌ Creation failed: ${createError.message}`);
            console.error(`   📋 Full error details:`, JSON.stringify(createError, null, 2));
            results.errors.push({ 
              user: userEmail, 
              error: createError.message, 
              fullError: createError,
              action: 'create',
              userId: user.id,
              phone: user.phone,
              phoneE164: phoneE164
            });
          } else {
            console.log(`   ✅ Created successfully (temp password set)`);
            console.log(`   ⚠️  User will need to reset password to: testing`);
            
            // Immediately reset password to "testing"
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
              newUser.user.id,
              { password: 'testing' }
            );
            
            if (passwordError) {
              console.error(`   ⚠️  Password reset failed: ${passwordError.message}`);
            } else {
              console.log(`   ✅ Password set to "testing"`);
            }
            
            results.created++;
          }
        }
      } catch (error) {
        console.error(`   ❌ Unexpected error: ${error.message}`);
        results.errors.push({ user: userEmail, error: error.message, action: 'unknown' });
        results.skipped++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 4: Summary
    console.log('\n=== Summary ===');
    if (DRY_RUN) {
      console.log(`🔍 Would update: ${results.wouldUpdate} users`);
      console.log(`🔍 Would create: ${results.wouldCreate} users`);
      console.log('🔒 No writes performed (dry-run). Re-run with --apply to mutate.');
    } else {
      console.log(`✅ Updated: ${results.updated} users`);
      console.log(`➕ Created: ${results.created} users`);
    }
    console.log(`⏭️  Skipped: ${results.skipped} users`);
    console.log(`❌ Errors: ${results.errors.length} users`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((err, index) => {
        console.log(`\n   ${index + 1}. ${err.user} (${err.action})`);
        console.log(`      Error: ${err.error}`);
        if (err.phone) {
          console.log(`      Original phone: ${err.phone}`);
          console.log(`      E.164 phone: ${err.phoneE164 || 'N/A (conversion failed)'}`);
        }
        if (err.fullError) {
          console.log(`      Full error:`, JSON.stringify(err.fullError, null, 2));
        }
      });
    }

    console.log(DRY_RUN ? '\n✅ Dry-run complete!' : '\n✅ Rebuild complete!');
    if (!DRY_RUN) {
      console.log('\n📝 Next steps:');
      console.log('   1. Users can now log in with their email/phone and password "testing"');
      console.log('   2. Users should change their password after first login');
      console.log('   3. Review any errors above and fix them manually if needed');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
  }
}

// Run the rebuild
rebuildAuthUsers();

