import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { runStorageUploadDiagnostic } from '../storageUploadDiagnostic';

jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  cacheDirectory: 'file:///cache/',
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn(() => 'decoded-file-data'),
}));

describe('runStorageUploadDiagnostic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1718524800000);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('bW9jay1iYXNlNjQ=');
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true } as any);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports upload success even when public HEAD verification is inconclusive', async () => {
    const upload = jest.fn().mockResolvedValue({
      data: { path: 'diagnostics/1718524800000-test-upload.txt' },
      error: null,
    });
    const remove = jest.fn().mockResolvedValue({ data: null, error: null });
    const getPublicUrl = jest.fn().mockReturnValue({
      data: {
        publicUrl: 'https://storage.supabase.co/object/public/buildtrack-files/diagnostics/1718524800000-test-upload.txt',
      },
    });

    const mockSupabase = {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-123' } } },
          error: null,
        }),
      },
      storage: {
        from: jest.fn().mockReturnValue({
          upload,
          remove,
          getPublicUrl,
        }),
      },
    } as any;

    const results = await runStorageUploadDiagnostic(mockSupabase);

    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('buildtrack-files');
    expect(upload).toHaveBeenCalled();
    expect(decode).toHaveBeenCalledWith('bW9jay1iYXNlNjQ=');
    expect(results).toContain('✅ Test upload successful!');
    expect(results.some((line) => line.includes('Public URL verification was inconclusive'))).toBe(true);
    expect(results.some((line) => line.includes('Bucket not found'))).toBe(false);
    expect(remove).toHaveBeenCalledWith(['diagnostics/1718524800000-test-upload.txt']);
  });
});
