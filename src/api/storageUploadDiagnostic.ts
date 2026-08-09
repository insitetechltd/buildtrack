import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

interface StorageDiagnosticClient {
  auth: {
    getSession: () => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
  };
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        fileBody: ArrayBuffer | string,
        options: { contentType: string; upsert: boolean }
      ) => Promise<{
        data: { path: string } | null;
        error: { message: string; statusCode?: string | number } | null;
      }>;
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{
        data: { signedUrl?: string | null } | null;
        error: { message: string } | null;
      }>;
      remove: (paths: string[]) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

const DIAGNOSTIC_SIGNED_URL_TTL_SECONDS = 3600;

export async function runStorageUploadDiagnostic(
  supabase: StorageDiagnosticClient | null
): Promise<string[]> {
  const results: string[] = [];

  results.push('🧪 Testing Supabase File Upload...\n');

  if (!supabase) {
    results.push('❌ Supabase client not initialized');
    return results;
  }
  results.push('✅ Supabase client initialized');

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    results.push('❌ No active session found');
    results.push('   You must be logged in to upload files');
    return results;
  }
  results.push(`✅ User session active (${session.user.id})`);

  results.push('\n📤 Testing file upload...');
  const testContent = `Test upload file created at ${new Date().toISOString()}`;
  const testFilePath = `${FileSystem.cacheDirectory}test-upload-${Date.now()}.txt`;
  const testPath = `diagnostics/${Date.now()}-test-upload.txt`;
  let uploadedPath: string | null = null;

  try {
    await FileSystem.writeAsStringAsync(testFilePath, testContent);
    const testBase64 = await FileSystem.readAsStringAsync(testFilePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('buildtrack-files')
      .upload(testPath, decode(testBase64), {
        contentType: 'text/plain',
        upsert: false,
      });

    if (uploadError) {
      results.push(`❌ Upload failed: ${uploadError.message}`);
      results.push(`   Error code: ${uploadError.statusCode || 'N/A'}`);

      if (
        uploadError.message.includes('new row violates row-level security') ||
        uploadError.message.includes('RLS')
      ) {
        results.push('\n💡 This is a Row Level Security (RLS) policy issue!');
        results.push("   Storage → buildtrack-files → Policies → New Policy");
        results.push("   INSERT/SELECT for authenticated users must allow this upload path.");
      } else if (uploadError.message.includes('Bucket not found')) {
        results.push("\n💡 The storage client reported 'Bucket not found'.");
        results.push('   Verify the bucket name and the active Supabase project.');
      } else if (
        uploadError.message.includes('permission denied') ||
        uploadError.message.includes('Forbidden')
      ) {
        results.push('\n💡 Permission denied. Check storage policies for authenticated uploads.');
      }

      return results;
    }

    uploadedPath = uploadData?.path || testPath;
    results.push('✅ Test upload successful!');
    results.push(`   Path: ${uploadedPath}`);

    const { data: urlData, error: signedError } = await supabase.storage
      .from('buildtrack-files')
      .createSignedUrl(uploadedPath, DIAGNOSTIC_SIGNED_URL_TTL_SECONDS);

    if (signedError || !urlData?.signedUrl) {
      results.push(
        `⚠️  Signed URL generation failed: ${signedError?.message || 'no signedUrl returned'}`
      );
      results.push('   Upload may still be valid; check storage SELECT policies for authenticated.');
    } else {
      results.push(`✅ Signed URL generated (ttl=${DIAGNOSTIC_SIGNED_URL_TTL_SECONDS}s)`);
      results.push('\n🔍 Verifying upload...');

      try {
        const response = await fetch(urlData.signedUrl, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (response.ok) {
          results.push('✅ Upload verification successful');
        } else {
          results.push(
            `⚠️  Signed URL verification was inconclusive (HTTP ${response.status})`
          );
          results.push(
            '   Upload may still be valid; check object read policies for authenticated users.'
          );
        }
      } catch (verifyError: any) {
        results.push(`⚠️  Signed URL verification was inconclusive: ${verifyError.message}`);
        results.push(
          '   Upload may still be valid; check object read policies for authenticated users.'
        );
      }
    }

    results.push('\n✅ Upload path test completed.');
    return results;
  } finally {
    try {
      const fileInfo = await FileSystem.getInfoAsync(testFilePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(testFilePath);
      }
    } catch {
      // Ignore local cleanup errors in diagnostics.
    }

    if (uploadedPath) {
      const { error: deleteError } = await supabase.storage
        .from('buildtrack-files')
        .remove([uploadedPath]);

      if (deleteError) {
        results.push(`⚠️  Could not delete test file: ${deleteError.message}`);
      } else {
        results.push('✅ Test file cleaned up');
      }
    }
  }
}
