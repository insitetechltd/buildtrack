import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  uploadFile,
  deleteFile,
  getFileUrl,
  verifyUpload,
  uploadFileWithVerification,
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
    const getPublicUrl = jest.fn().mockReturnValue({
      data: {
        publicUrl: 'https://storage.supabase.co/company-123/tasks/task-123/1718524800000-task-photo.jpg',
      },
    });
    const from = jest.fn().mockReturnValue({
      upload,
      remove,
      getPublicUrl,
    });

    Object.defineProperty(mockSupabase, 'storage', {
      value: { from },
      writable: true,
      configurable: true,
    });

    return { from, upload, remove, getPublicUrl };
  };

  it('uploads a file and returns the generated attachment metadata', async () => {
    const { from, upload } = installStorageMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1718524800000);

    const result = await uploadFile(fileOptions);

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(fileOptions.file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(mockDecode).toHaveBeenCalledWith('mock-base64');
    expect(from).toHaveBeenCalledWith('buildtrack-files');
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
    expect(result.public_url).toContain('https://storage.supabase.co/');
  });

  it('deletes a file from Supabase storage', async () => {
    const { remove } = installStorageMocks();

    await deleteFile('company-123/tasks/task-123/file.jpg');

    expect(remove).toHaveBeenCalledWith(['company-123/tasks/task-123/file.jpg']);
  });

  it('builds a public file URL from the storage path', () => {
    installStorageMocks();

    const result = getFileUrl('company-123/tasks/task-123/file.jpg');

    expect(result).toBe(
      'https://storage.supabase.co/company-123/tasks/task-123/1718524800000-task-photo.jpg'
    );
  });

  it('verifies that an uploaded file is publicly accessible', async () => {
    const result = await verifyUpload('https://storage.supabase.co/uploads/task-photo.jpg');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://storage.supabase.co/uploads/task-photo.jpg',
      expect.objectContaining({
        method: 'HEAD',
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('returns success when upload completes but public verification is forbidden', async () => {
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
