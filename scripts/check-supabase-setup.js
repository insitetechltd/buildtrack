#!/usr/bin/env node

/**
 * Complete Supabase Setup Checker
 * 
 * This script verifies your entire Supabase configuration
 * for photo uploads and identifies any issues.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseSetup() {
  console.log('🔍 Complete Supabase Setup Verification\n');
  console.log('=' .repeat(70));
  
  let issues = [];
  let warnings = [];
  
  // ============================================
  // 1. Check Storage Buckets
  // ============================================
  console.log('\n📁 PART 1: Storage Buckets');
  console.log('-'.repeat(70));
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      issues.push('Cannot list storage buckets');
    } else {
      console.log(`Found ${buckets.length} bucket(s):\n`);
      
      buckets.forEach(bucket => {
        console.log(`Bucket: ${bucket.name}`);
        console.log(`  Public: ${bucket.public ? '✅ YES' : '❌ NO'}`);
        console.log(`  Size Limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024).toFixed(0) + 'MB' : 'None'}`);
        console.log(`  Created: ${bucket.created_at}`);
        console.log('');
        
        if (bucket.name === 'buildtrack-files') {
          if (!bucket.public) {
            issues.push('buildtrack-files bucket is PRIVATE (should be PUBLIC)');
          }
        }
      });
      
      const hasBuildtrackBucket = buckets.some(b => b.name === 'buildtrack-files');
      if (!hasBuildtrackBucket) {
        issues.push('buildtrack-files bucket does not exist');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    issues.push('Failed to check storage buckets');
  }
  
  // ============================================
  // 2. Check Storage Contents
  // ============================================
  console.log('\n📦 PART 2: Storage Contents');
  console.log('-'.repeat(70));
  
  try {
    const { data: files, error } = await supabase.storage
      .from('buildtrack-files')
      .list('', { limit: 10 });
    
    if (error) {
      console.error('❌ Error listing files:', error.message);
      issues.push('Cannot list files in buildtrack-files bucket');
    } else {
      console.log(`Root level: ${files.length} item(s)`);
      
      if (files.length > 0) {
        console.log('\nTop-level items:');
        files.slice(0, 5).forEach(file => {
          console.log(`  - ${file.name} ${file.id ? '(folder)' : '(file)'}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    warnings.push('Could not check storage contents');
  }
  
  // ============================================
  // 3. Check Database Tables
  // ============================================
  console.log('\n\n🗄️  PART 3: Database Tables');
  console.log('-'.repeat(70));
  
  // Check tasks table
  console.log('\nTasks table:');
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, attachments')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      issues.push('Cannot query tasks table');
    } else {
      console.log('  ✅ Accessible');
      if (data && data.length > 0) {
        console.log(`  Has 'attachments' column: ${data[0].attachments !== undefined ? '✅ YES' : '❌ NO'}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    issues.push('Tasks table issue');
  }
  
  // Check task_updates table
  console.log('\nTask Updates table:');
  try {
    const { data, error } = await supabase
      .from('task_updates')
      .select('id, task_id, photos')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      issues.push('Cannot query task_updates table');
    } else {
      console.log('  ✅ Accessible');
      if (data && data.length > 0) {
        console.log(`  Has 'photos' column: ${data[0].photos !== undefined ? '✅ YES' : '❌ NO'}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    issues.push('Task_updates table issue');
  }
  
  // Check file_attachments table (should not exist)
  console.log('\nFile Attachments table:');
  try {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('  ✅ Does not exist (GOOD - not needed)');
      } else {
        console.error('  ❌ Error:', error.message);
      }
    } else {
      console.log('  ⚠️  Table exists (not used by current code)');
      warnings.push('file_attachments table exists but is not used');
    }
  } catch (error) {
    console.log('  ✅ Does not exist (GOOD)');
  }
  
  // ============================================
  // 4. Test Upload Capability
  // ============================================
  console.log('\n\n🧪 PART 4: Test Upload Capability');
  console.log('-'.repeat(70));
  
  try {
    const testFileName = `test-diagnostic-${Date.now()}.txt`;
    const testPath = `test-diagnostic/${testFileName}`;
    const testContent = 'Diagnostic test file';
    
    console.log('\nAttempting test upload...');
    console.log(`  Path: ${testPath}`);
    
    // Try upload
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('buildtrack-files')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('\n❌ UPLOAD FAILED:', uploadError.message);
      issues.push(`Upload test failed: ${uploadError.message}`);
      
      if (uploadError.message.includes('row-level security')) {
        console.error('\n🔴 RLS POLICY ERROR DETECTED!');
        console.error('This is the same error you\'re seeing in the app.');
        issues.push('RLS policies on storage.objects are blocking uploads');
      }
    } else {
      console.log('  ✅ Upload successful!');
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('buildtrack-files')
        .getPublicUrl(testPath);
      
      console.log(`  URL: ${urlData.publicUrl}`);
      
      // Test accessibility
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('  ✅ File is publicly accessible');
        } else {
          console.error(`  ❌ File not accessible (HTTP ${response.status})`);
          issues.push('Uploaded files not publicly accessible');
        }
      } catch (e) {
        console.error('  ❌ Failed to check accessibility');
      }
      
      // Cleanup
      await supabase.storage.from('buildtrack-files').remove([testPath]);
      console.log('  ✅ Test file cleaned up');
    }
  } catch (error) {
    console.error('\n❌ Upload test failed:', error.message);
    issues.push('Upload test exception');
  }
  
  // ============================================
  // 5. Check Authentication
  // ============================================
  console.log('\n\n🔐 PART 5: Authentication Check');
  console.log('-'.repeat(70));
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error:', error.message);
      warnings.push('Cannot verify authentication (using service key)');
    } else if (user) {
      console.log(`\nAuthenticated as: ${user.email}`);
      console.log(`  User ID: ${user.id}`);
      console.log(`  Created: ${user.created_at}`);
    } else {
      console.log('\n⚠️  Using service role key (bypass RLS)');
      warnings.push('Tests with service key might not reflect user experience');
    }
  } catch (error) {
    console.log('\n⚠️  Using service role key');
  }
  
  // ============================================
  // 6. Check Recent Uploads
  // ============================================
  console.log('\n\n📊 PART 6: Recent Photo Uploads');
  console.log('-'.repeat(70));
  
  try {
    const { data: updates, error } = await supabase
      .from('task_updates')
      .select('id, task_id, photos, timestamp')
      .not('photos', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else if (!updates || updates.length === 0) {
      console.log('\n⚠️  No task updates with photos found');
      warnings.push('No recent photo uploads in database');
    } else {
      console.log(`\nFound ${updates.length} recent update(s) with photos:\n`);
      
      updates.forEach((update, idx) => {
        const photos = update.photos || [];
        const hasSupabaseUrls = photos.some(url => url && url.startsWith('http'));
        const hasLocalUrls = photos.some(url => url && url.startsWith('file://'));
        
        console.log(`${idx + 1}. Update ${update.id.substring(0, 8)}...`);
        console.log(`   Task: ${update.task_id}`);
        console.log(`   Photos: ${photos.length}`);
        
        if (hasSupabaseUrls) {
          console.log('   ✅ Contains Supabase URLs (https://)');
        }
        if (hasLocalUrls) {
          console.log('   ❌ Contains local paths (file://)');
          warnings.push('Some uploads still using local paths');
        }
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n🎉 ✅ ALL CHECKS PASSED!');
    console.log('\nYour Supabase setup is correctly configured.');
    console.log('If you\'re still seeing errors in the app, it\'s likely:');
    console.log('  1. App hasn\'t received OTA update yet');
    console.log('  2. Using cached/old code');
    console.log('  3. Authentication issue in the app');
  } else {
    if (issues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES FOUND:');
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Diagnostic complete!\n');
}

checkSupabaseSetup().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

