import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  uploadFile,
  deleteFile,
  getFileUrl,
  verifyUpload,
  uploadFileWithVerification,
  extractBuildtrackStoragePath,
  createSignedFileUrl,
  __resetSignedUrlCacheForTests,
  SIGNED_URL_EXPIRY_SECONDS,
  BUILDTRACK_FILES_BUCKET,
} from '../fileUploadService';
import { supabase } from '../supabase';

jest.mock('../supabase');
jest.mock('expo-file-system/legacy');
jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn(() => 'decoded-file-data'),
}));

describe('fileUploadService', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockDecode = decode as jest.Mock;
  const signedUrl =
    'https://storage.supabase.co/storage/v1/object/sign/buildtrack-files/company-123/tasks/task-123/1718524800000-task-photo.jpg?token=abc';
  const fileOptions = {
    file: {
      uri: 'file:///task-photo.jpg',
      name: 'task-photo.jpg',
      type: 'image/jpeg',
    },
    entityType: 'task' as const,
    entityId: 'task-123',
    companyId: 'company-123',
    userId: 'user-123',
    description: 'Progress photo',
    tags: ['progress'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetSignedUrlCacheForTests();
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('mock-base64');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1024,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const installStorageMocks = () => {
    const upload = jest.fn().mockResolvedValue({
      data: { path: 'company-123/tasks/task-123/1718524800000-task-photo.jpg' },
      error: null,
    });
    const remove = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const createSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl },
      error: null,
    });
    const from = jest.fn().mockReturnValue({
      upload,
      remove,
      createSignedUrl,
    });

    Object.defineProperty(mockSupabase, 'storage', {
      value: { from },
      writable: true,
      configurable: true,
    });

    return { from, upload, remove, createSignedUrl };
  };

  it('extracts storage paths from public and signed Supabase URLs', () => {
    expect(
      extractBuildtrackStoragePath(
        'https://xyz.supabase.co/storage/v1/object/public/buildtrack-files/co/tasks/t1/a.jpg'
      )
    ).toBe('co/tasks/t1/a.jpg');
    expect(
      extractBuildtrackStoragePath(
        'https://xyz.supabase.co/storage/v1/object/sign/buildtrack-files/co/tasks/t1/a.jpg?token=x'
      )
    ).toBe('co/tasks/t1/a.jpg');
    expect(extractBuildtrackStoragePath('co/tasks/t1/a.jpg')).toBe('co/tasks/t1/a.jpg');
    expect(extractBuildtrackStoragePath('file:///local.jpg')).toBeNull();
  });

  it('uploads a file and returns signed attachment metadata', async () => {
    const { from, upload, createSignedUrl } = installStorageMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1718524800000);

    const result = await uploadFile(fileOptions);

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(fileOptions.file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(mockDecode).toHaveBeenCalledWith('mock-base64');
    expect(from).toHaveBeenCalledWith(BUILDTRACK_FILES_BUCKET);
    expect(upload).toHaveBeenCalledWith(
      'company-123/tasks/task-123/1718524800000-task-photo.jpg',
      'decoded-file-data',
      expect.objectContaining({
        contentType: 'image/jpeg',
        upsert: false,
      })
    );
    expect(createSignedUrl).toHaveBeenCalledWith(
      'company-123/tasks/task-123/1718524800000-task-photo.jpg',
      SIGNED_URL_EXPIRY_SECONDS
    );
    expect(result.storage_path).toBe('company-123/tasks/task-123/1718524800000-task-photo.jpg');
    expect(result.file_type).toBe('image');
    expect(result.public_url).toBe(signedUrl);
  });

  it('deletes a file from Supabase storage', async () => {
    const { remove } = installStorageMocks();

    await deleteFile('company-123/tasks/task-123/file.jpg');

    expect(remove).toHaveBeenCalledWith(['company-123/tasks/task-123/file.jpg']);
  });

  it('returns a cached signed file URL from the storage path', async () => {
    const { createSignedUrl } = installStorageMocks();

    const created = await createSignedFileUrl('company-123/tasks/task-123/file.jpg');
    expect(created).toBe(signedUrl);
    expect(createSignedUrl).toHaveBeenCalledWith(
      'company-123/tasks/task-123/file.jpg',
      SIGNED_URL_EXPIRY_SECONDS
    );

    const result = getFileUrl('company-123/tasks/task-123/file.jpg');
    expect(result).toBe(signedUrl);
  });

  it('verifies that an uploaded file is accessible via signed URL', async () => {
    const result = await verifyUpload(signedUrl);

    expect(global.fetch).toHaveBeenCalledWith(
      signedUrl,
      expect.objectContaining({
        method: 'HEAD',
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('returns success when upload completes but signed verification is forbidden', async () => {
    installStorageMocks();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    const result = await uploadFileWithVerification(fileOptions);

    expect(result.success).toBe(true);
    expect(result.file?.storage_path).toContain('company-123/tasks/task-123/');
    expect(result.error).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
