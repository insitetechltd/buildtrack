import { uploadFile } from '@/api/fileUploadService';
import { setSupabaseClient } from '@/api/supabase';
import { cleanupIfAllowed } from '@/test-utils/supabaseTestHarness';
import * as FileSystem from 'expo-file-system/legacy';
import {
  cleanupTestUser,
  createSandboxContext,
  describeSandbox,
  provisionTestUser,
} from './sandboxHelpers';

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

describeSandbox('Scenario F (Supabase): Storage upload integrity', () => {
  jest.setTimeout(180_000);

  it('uploads a file with special characters and verifies it exists in the storage bucket', async () => {
    const ctx = createSandboxContext();
    const user = await provisionTestUser(ctx);

    setSupabaseClient(ctx.anon);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('/9j/4AAQSkZJRgABAQAAAQABAAD/');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 2048 } as any);

    const entityId = `task-${Date.now()}`;
    const fileName = 'Blueprint v1 (final)+# .jpg';

    try {
      const signIn = await ctx.anon.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      if (signIn.error) {
        throw signIn.error;
      }

      const uploaded = await uploadFile({
        file: {
          uri: 'file://test-image.jpg',
          name: fileName,
          type: 'image/jpeg',
        },
        entityType: 'task',
        entityId,
        companyId: user.companyId,
        userId: user.id,
      });

      expect(uploaded.storage_path).toContain(`${user.companyId}/tasks/${entityId}/`);
      expect(uploaded.storage_path.includes(' ')).toBe(false);
      expect(uploaded.storage_path.includes('(')).toBe(false);
      expect(uploaded.storage_path.includes(')')).toBe(false);

      const prefix = `${user.companyId}/tasks/${entityId}`;
      const list = await ctx.service.storage.from('buildtrack-files').list(prefix, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (list.error) {
        throw list.error;
      }

      const uploadedFileName = uploaded.storage_path.split('/').pop()!;
      expect(list.data?.some((item: any) => item.name === uploadedFileName)).toBe(true);

      await cleanupIfAllowed(async () => {
        await ctx.service.storage.from('buildtrack-files').remove([uploaded.storage_path]);
      });
    } finally {
      setSupabaseClient(null);
      await cleanupTestUser(ctx, user);
    }
  });
});
