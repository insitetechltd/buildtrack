#!/usr/bin/env node

/**
 * Check what's actually in the photos arrays
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPhotoData() {
  console.log('🔍 Checking photo data in task_updates table...\n');
  
  const { data: updates, error } = await supabase
    .from('task_updates')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${updates.length} total task updates\n`);
  
  let withPhotos = 0;
  let withEmptyArrays = 0;
  let withNull = 0;

  updates.forEach(update => {
    const hasPhotos = update.photos && Array.isArray(update.photos) && update.photos.length > 0;
    const isEmpty = Array.isArray(update.photos) && update.photos.length === 0;
    const isNull = update.photos === null || update.photos === undefined;

    if (hasPhotos) {
      withPhotos++;
      console.log(`✅ Update ${update.id.substring(0, 8)}... HAS ${update.photos.length} photo(s):`);
      update.photos.forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
      });
      console.log(`   Task: ${update.task_id}`);
      console.log(`   Description: ${update.description?.substring(0, 50)}...`);
      console.log('');
    } else if (isEmpty) {
      withEmptyArrays++;
    } else if (isNull) {
      withNull++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`   Updates with photos: ${withPhotos}`);
  console.log(`   Updates with empty arrays []: ${withEmptyArrays}`);
  console.log(`   Updates with null: ${withNull}`);
  console.log(`   Total updates: ${updates.length}`);

  if (withPhotos === 0) {
    console.log('\n⚠️  NO PHOTOS FOUND IN DATABASE!');
    console.log('\nPossible reasons:');
    console.log('1. Photos are being uploaded but URLs are not being saved to database');
    console.log('2. The upload is failing silently');
    console.log('3. The database update is not including the photos array');
    console.log('\nNext step: Check the upload flow in the app');
  }
}

checkPhotoData().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

