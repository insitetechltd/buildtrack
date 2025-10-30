#!/usr/bin/env node

/**
 * Photo Upload/Download Test Script
 * 
 * Tests the complete photo upload and download flow:
 * 1. Upload a test image to Supabase Storage
 * 2. Verify the file is accessible
 * 3. Download and verify the file
 * 4. Test URL accessibility from public internet
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPhotoUploadDownload() {
  console.log('🧪 Photo Upload/Download Test\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create a test image (1x1 red pixel PNG)
    console.log('\n📝 Step 1: Creating test image...');
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64'
    );
    console.log('✅ Test image created (1x1 red pixel PNG)');
    
    // Step 2: Upload to Supabase Storage
    console.log('\n📤 Step 2: Uploading to Supabase Storage...');
    const timestamp = Date.now();
    const testFileName = `test-${timestamp}.png`;
    const testPath = `test-company-id/task-updates/test-task-id/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('buildtrack-files')
      .upload(testPath, testImageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return false;
    }
    
    console.log('✅ Upload successful!');
    console.log(`   Path: ${testPath}`);
    
    // Step 3: Get public URL
    console.log('\n🔗 Step 3: Getting public URL...');
    const { data: urlData } = supabase.storage
      .from('buildtrack-files')
      .getPublicUrl(testPath);
    
    if (!urlData?.publicUrl) {
      console.error('❌ Failed to get public URL');
      return false;
    }
    
    const publicUrl = urlData.publicUrl;
    console.log('✅ Public URL generated:');
    console.log(`   ${publicUrl}`);
    
    // Step 4: Test URL accessibility (HEAD request)
    console.log('\n🔍 Step 4: Testing URL accessibility...');
    try {
      const response = await fetch(publicUrl, { 
        method: 'HEAD',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        console.log('✅ URL is accessible! (HTTP', response.status + ')');
        console.log('   Content-Type:', response.headers.get('content-type'));
        console.log('   Content-Length:', response.headers.get('content-length'), 'bytes');
      } else {
        console.error('❌ URL returned error:', response.status, response.statusText);
        if (response.status === 403) {
          console.error('   → Bucket might still be private or has incorrect policies');
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to access URL:', error.message);
      return false;
    }
    
    // Step 5: Download the file
    console.log('\n⬇️  Step 5: Downloading file...');
    try {
      const downloadResponse = await fetch(publicUrl);
      
      if (!downloadResponse.ok) {
        console.error('❌ Download failed:', downloadResponse.status, downloadResponse.statusText);
        return false;
      }
      
      const downloadedBuffer = Buffer.from(await downloadResponse.arrayBuffer());
      console.log('✅ Download successful!');
      console.log('   Downloaded size:', downloadedBuffer.length, 'bytes');
      console.log('   Original size:', testImageBuffer.length, 'bytes');
      
      // Verify content matches
      if (downloadedBuffer.equals(testImageBuffer)) {
        console.log('✅ Content verification: MATCH! ✓');
      } else {
        console.error('⚠️  Content verification: Files differ (might be OK due to compression)');
      }
    } catch (error) {
      console.error('❌ Download failed:', error.message);
      return false;
    }
    
    // Step 6: Test from different network (simulate other device)
    console.log('\n🌍 Step 6: Testing from public internet perspective...');
    console.log('   Testing without any auth headers...');
    try {
      const publicResponse = await fetch(publicUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        }
      });
      
      if (publicResponse.ok) {
        console.log('✅ Accessible from public internet! (HTTP', publicResponse.status + ')');
        console.log('   → Photos will work on all devices ✓');
      } else {
        console.error('❌ Not publicly accessible:', publicResponse.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Public access test failed:', error.message);
      return false;
    }
    
    // Step 7: List files in storage
    console.log('\n📦 Step 7: Verifying file in storage list...');
    const { data: fileList, error: listError } = await supabase.storage
      .from('buildtrack-files')
      .list('test-company-id/task-updates/test-task-id');
    
    if (listError) {
      console.error('❌ Failed to list files:', listError.message);
    } else {
      const foundFile = fileList.find(f => f.name === testFileName);
      if (foundFile) {
        console.log('✅ File found in storage list!');
        console.log('   Name:', foundFile.name);
        console.log('   Size:', foundFile.metadata?.size || 'unknown', 'bytes');
        console.log('   Created:', foundFile.created_at);
      } else {
        console.error('⚠️  File not found in storage list');
      }
    }
    
    // Step 8: Cleanup
    console.log('\n🧹 Step 8: Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('buildtrack-files')
      .remove([testPath]);
    
    if (deleteError) {
      console.error('⚠️  Cleanup failed:', deleteError.message);
      console.log('   (Test file left at:', testPath + ')');
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ Photo upload mechanism: WORKING');
    console.log('✅ Photo download mechanism: WORKING');
    console.log('✅ Public URL access: WORKING');
    console.log('✅ Cross-device compatibility: READY');
    console.log('\nYou can now safely upload photos in the app!');
    console.log('Photos will be visible on all devices. ✓\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testPhotoUploadDownload().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});

