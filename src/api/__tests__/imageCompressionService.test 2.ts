import { formatFileSize, needsCompression } from '../imageCompressionService';
import * as FileSystem from 'expo-file-system';

describe('imageCompressionService', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500.00 Bytes');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(5120)).toBe('5.00 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(5242880)).toBe('5.00 MB');
      expect(formatFileSize(2097152)).toBe('2.00 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
    });
  });

  describe('needsCompression', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true for files larger than 2MB target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 3 * 1024 * 1024, // 3MB
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(true);
    });

    it('returns false for files smaller than 2MB target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1 * 1024 * 1024, // 1MB
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });

    it('returns false for files exactly at 2MB target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 2 * 1024 * 1024, // 2MB
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });

    it('returns false for non-existent files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });

    it('handles file system errors gracefully', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error('File system error')
      );

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });
  });
});

