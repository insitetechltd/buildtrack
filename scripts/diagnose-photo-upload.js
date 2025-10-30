#!/usr/bin/env node

/**
 * Photo Upload Diagnosis Script
 * 
 * This script checks:
 * 1. If photos are being uploaded to Supabase Storage
 * 2. If photo URLs are being saved to task_updates table
 * 3. If photos can be retrieved from the database
 * 4. If storage bucket is publicly accessible
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required env vars: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosePhotoUpload() {
  console.log('🔍 Photo Upload Diagnosis\n');
  console.log('=' .repeat(60));
  
  // Step 1: Check if buildtrack-files bucket exists
  console.log('\n📁 Step 1: Checking Storage Bucket...');
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
    } else {
      console.log(`✅ Found ${buckets.length} bucket(s):`);
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
      });
      
      const buildtrackBucket = buckets.find(b => b.name === 'buildtrack-files');
      if (!buildtrackBucket) {
        console.error('⚠️  WARNING: buildtrack-files bucket not found!');
        console.log('   → Create it in Supabase Dashboard: Storage → New Bucket → "buildtrack-files"');
        console.log('   → Make sure it is set to PUBLIC');
      } else {
        console.log(`✅ buildtrack-files bucket exists (${buildtrackBucket.public ? 'PUBLIC' : 'PRIVATE'})`);
        if (!buildtrackBucket.public) {
          console.error('⚠️  WARNING: buildtrack-files bucket is PRIVATE!');
          console.log('   → Go to Supabase Dashboard → Storage → buildtrack-files → Settings');
          console.log('   → Set "Public bucket" to ON');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking buckets:', error.message);
  }

  // Step 2: Check for recent task updates with photos
  console.log('\n📊 Step 2: Checking Task Updates with Photos...');
  try {
    const { data: updates, error } = await supabase
      .from('task_updates')
      .select('id, task_id, user_id, description, photos, timestamp')
      .not('photos', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching task updates:', error.message);
    } else if (!updates || updates.length === 0) {
      console.log('⚠️  No task updates with photos found in database');
      console.log('   → Try uploading a photo to a task update');
    } else {
      console.log(`✅ Found ${updates.length} task update(s) with photos:`);
      
      for (const update of updates) {
        console.log(`\n   Update ID: ${update.id}`);
        console.log(`   Task ID: ${update.task_id}`);
        console.log(`   Description: ${update.description?.substring(0, 50)}...`);
        console.log(`   Photos: ${update.photos ? update.photos.length : 0} photo(s)`);
        console.log(`   Timestamp: ${update.timestamp}`);
        
        if (update.photos && Array.isArray(update.photos) && update.photos.length > 0) {
          console.log(`\n   📸 Photo URLs:`);
          update.photos.forEach((url, index) => {
            console.log(`      ${index + 1}. ${url}`);
          });
          
          // Test if photos are accessible
          console.log(`\n   🔍 Testing photo accessibility...`);
          for (let i = 0; i < Math.min(update.photos.length, 3); i++) {
            const url = update.photos[i];
            try {
              const response = await fetch(url, { method: 'HEAD' });
              if (response.ok) {
                console.log(`      ✅ Photo ${i + 1} is accessible (HTTP ${response.status})`);
              } else {
                console.error(`      ❌ Photo ${i + 1} is NOT accessible (HTTP ${response.status})`);
                console.log(`         URL: ${url}`);
              }
            } catch (error) {
              console.error(`      ❌ Photo ${i + 1} fetch failed:`, error.message);
              console.log(`         URL: ${url}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking task updates:', error.message);
  }

  // Step 3: Check files in storage
  console.log('\n📦 Step 3: Checking Files in Storage...');
  try {
    const { data: files, error } = await supabase.storage
      .from('buildtrack-files')
      .list('', {
        limit: 5,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('❌ Error listing files:', error.message);
      if (error.message.includes('not found')) {
        console.log('   → The buildtrack-files bucket does not exist');
        console.log('   → Create it in Supabase Dashboard: Storage → New Bucket');
      }
    } else if (!files || files.length === 0) {
      console.log('⚠️  No files found in buildtrack-files bucket root');
      console.log('   → Files are typically organized by company_id/task-updates/...');
      console.log('   → Checking for company folders...');
      
      // Check for company folders
      const { data: companyFolders, error: folderError } = await supabase.storage
        .from('buildtrack-files')
        .list();
      
      if (!folderError && companyFolders && companyFolders.length > 0) {
        console.log(`   ✅ Found ${companyFolders.length} company folder(s):`);
        
        // Check first company folder for files
        for (const folder of companyFolders.slice(0, 3)) {
          if (folder.name) {
            const { data: companyFiles, error: companyError } = await supabase.storage
              .from('buildtrack-files')
              .list(`${folder.name}/task-updates`, {
                limit: 5,
                sortBy: { column: 'created_at', order: 'desc' }
              });
            
            if (!companyError && companyFiles && companyFiles.length > 0) {
              console.log(`\n      Company: ${folder.name}`);
              console.log(`      Files in task-updates: ${companyFiles.length}`);
              companyFiles.slice(0, 3).forEach(file => {
                const fullPath = `${folder.name}/task-updates/${file.name}`;
                const { data } = supabase.storage
                  .from('buildtrack-files')
                  .getPublicUrl(fullPath);
                console.log(`         - ${file.name}`);
                console.log(`           URL: ${data.publicUrl}`);
              });
            }
          }
        }
      }
    } else {
      console.log(`✅ Found ${files.length} file(s) in storage`);
      files.forEach(file => {
        console.log(`   - ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking storage:', error.message);
  }

  // Step 4: Check if file_attachments table exists (optional)
  console.log('\n🗄️  Step 4: Checking file_attachments Table...');
  try {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  file_attachments table does not exist');
        console.log('   → This is OPTIONAL - files can work without this table');
        console.log('   → Currently, photo URLs are stored directly in task_updates.photos');
      } else {
        console.error('❌ Error checking file_attachments:', error.message);
      }
    } else {
      console.log('✅ file_attachments table exists');
      
      const { count, error: countError } = await supabase
        .from('file_attachments')
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`   → Contains ${count} file record(s)`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking file_attachments:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log('\nCurrent Implementation:');
  console.log('1. Photos are uploaded to Supabase Storage (buildtrack-files bucket)');
  console.log('2. Public URLs are returned from storage');
  console.log('3. URLs are stored in task_updates.photos array');
  console.log('4. When other clients fetch task updates, they get the photo URLs');
  console.log('\nFor photos to appear on other devices:');
  console.log('✓ The photos must be uploaded successfully');
  console.log('✓ The storage bucket must be PUBLIC');
  console.log('✓ The photo URLs must be saved to task_updates.photos');
  console.log('✓ Other clients must fetch the latest task updates');
  console.log('\nIf photos are not showing on other devices:');
  console.log('1. Check that photos are being saved (see Step 2 above)');
  console.log('2. Check that photo URLs are accessible (see accessibility tests)');
  console.log('3. Make sure other clients are refreshing/pulling latest data');
  console.log('4. Check network connectivity and CORS settings');
  
  console.log('\n✅ Diagnosis complete!\n');
}

// Run diagnosis
diagnosePhotoUpload().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

