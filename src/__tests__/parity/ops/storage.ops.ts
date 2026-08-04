import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'buildtrack-files';

export async function ensureParityStorageBucket(
  service: SupabaseClient,
): Promise<void> {
  const listed = await service.storage.listBuckets();
  if (listed.error) {
    throw listed.error;
  }
  const exists = (listed.data || []).some((b) => b.name === BUCKET);
  if (exists) {
    return;
  }
  const created = await service.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (created.error && !/already exists/i.test(created.error.message || '')) {
    throw created.error;
  }
}

export async function uploadParityFile(
  client: SupabaseClient,
  input: {
    companyId: string;
    entityId: string;
    fileName: string;
    body: ArrayBuffer | Buffer | Blob | string;
    contentType?: string;
  },
): Promise<string> {
  const path = `${input.companyId}/tasks/${input.entityId}/${Date.now()}-${input.fileName}`;
  const { error } = await client.storage.from(BUCKET).upload(path, input.body, {
    contentType: input.contentType || 'text/plain',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return path;
}

export async function getParityFileUrl(
  client: SupabaseClient,
  path: string,
): Promise<string> {
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteParityFile(
  client: SupabaseClient,
  path: string,
): Promise<void> {
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}

export async function listParityFiles(
  client: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const { data, error } = await client.storage.from(BUCKET).list(prefix);
  if (error) {
    throw error;
  }
  return (data || []).map((item) => item.name);
}

export { BUCKET as PARITY_STORAGE_BUCKET };
