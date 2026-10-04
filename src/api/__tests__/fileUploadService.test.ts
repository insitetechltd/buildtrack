import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  uploadFile,
  deleteFile,
  getFileUrl,
  verifyUpload,
  uploadFileWithVerification,
  extractBuildtrackStoragePath,
  attachmentPreviewUri,
  createSignedFileUrl,
  prefetchSignedUrls,
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
    expect(extractBuildtrackStoragePath('file:/Volumes/KooDrive/draft-media/IMG_0001.jpg')).toBeNull();
  });

  it('does not treat draft-media JSON blobs as storage keys', () => {
    const localDraft = JSON.stringify({
      uri: 'file:/Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/1BEE670D/data/Containers/Data/Application/59BAD799/Documents/draft-media/IMG_0001_1783690940162.jpg',
      fileName: 'IMG_0001_1783690940162.jpg',
    });
    expect(extractBuildtrackStoragePath(localDraft)).toBeNull();
    expect(
      extractBuildtrackStoragePath(
        JSON.stringify({ storage_path: 'co/tasks/t1/a.jpg', uri: 'file:///local.jpg' })
      )
    ).toBe('co/tasks/t1/a.jpg');
  });

  it('skips createSignedUrl for local draft refs and does not log an overlay error', async () => {
    const { createSignedUrl } = installStorageMocks();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const localDraft = JSON.stringify({
      uri: 'file:/Volumes/KooDrive/draft-media/IMG_0001.jpg',
      fileName: 'IMG_0001.jpg',
    });

    await expect(createSignedFileUrl(localDraft)).resolves.toBeNull();
    await prefetchSignedUrls([localDraft, 'file:///local.jpg', 'co/tasks/t1/a.jpg']);

    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith('co/tasks/t1/a.jpg', SIGNED_URL_EXPIRY_SECONDS);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('uploads a file and returns signed attachment metadata', async () => {
    const { from, upload } = installStorageMocks();
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
    expect(result.storage_path).toBe('company-123/tasks/task-123/1718524800000-task-photo.jpg');
    expect(result.file_type).toBe('image');
    expect(result.public_url).toBe(result.storage_path);
  });

  it('resolves after storage upload without waiting for a signed URL', async () => {
    const { upload, createSignedUrl } = installStorageMocks();
    const insert = jest.fn().mockResolvedValue({ error: null });
    Object.defineProperty(mockSupabase, 'from', {
      configurable: true,
      writable: true,
      value: jest.fn(() => ({ insert })),
    });

    let resolveSign: (value: unknown) => void = () => {};
    createSignedUrl.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSign = resolve;
        }),
    );
    jest.spyOn(Date, 'now').mockReturnValue(1718524800000);
    const storagePath = 'company-123/tasks/task-123/1718524800000-task-photo.jpg';

    const result = await uploadFile(fileOptions);

    expect(upload).toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        storage_path: storagePath,
      }),
    );
    expect(result.public_url).toBe(storagePath);
    expect(result.storage_path).toBe(storagePath);

    await new Promise((resolve) => setImmediate(resolve));
    expect(createSignedUrl).toHaveBeenCalledWith(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    resolveSign({ data: null, error: { message: 'sign failed' } });
    await new Promise((resolve) => setImmediate(resolve));
    expect(result.public_url).toBe(storagePath);
  });

  it('does not fail an upload that reached storage when signed URL generation rejects', async () => {
    const { upload, createSignedUrl } = installStorageMocks();
    createSignedUrl.mockRejectedValue(new Error('sign failed'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockReturnValue(1718524800000);

    const result = await uploadFile(fileOptions);

    expect(upload).toHaveBeenCalled();
    expect(result.storage_path).toBe('company-123/tasks/task-123/1718524800000-task-photo.jpg');
    expect(result.public_url).toBe(result.storage_path);
  });

  it('previews local and https refs as-is and a storage path once it is signed', async () => {
    installStorageMocks();

    expect(attachmentPreviewUri('file:///local.jpg')).toBe('file:///local.jpg');
    expect(attachmentPreviewUri('https://cdn.example.com/plain.jpg')).toBe(
      'https://cdn.example.com/plain.jpg',
    );
    expect(attachmentPreviewUri('company-123/tasks/task-123/file.jpg')).toBeNull();

    await createSignedFileUrl('company-123/tasks/task-123/file.jpg');

    expect(attachmentPreviewUri('company-123/tasks/task-123/file.jpg')).toBe(signedUrl);
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

  it('reuses a persisted signed URL without minting a new one', async () => {
    const { createSignedUrl } = installStorageMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        'company-123/tasks/task-123/file.jpg': {
          url: signedUrl,
          expiresAtMs: Date.now() + 3_600_000,
        },
      })
    );

    const created = await createSignedFileUrl('company-123/tasks/task-123/file.jpg');
    expect(created).toBe(signedUrl);
    expect(createSignedUrl).not.toHaveBeenCalled();
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

  it('returns success after storage upload without a signed-url HEAD', async () => {
    installStorageMocks();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    const result = await uploadFileWithVerification(fileOptions);

    expect(result.success).toBe(true);
    expect(result.file?.storage_path).toContain('company-123/tasks/task-123/');
    expect(result.file?.public_url).toBe(result.file?.storage_path);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
