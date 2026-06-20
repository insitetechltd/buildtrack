import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as DraftMediaCache from '@/utils/draftMediaCache';

import { usePhotoSelection } from '@/utils/usePhotoSelection';

jest.mock('expo-clipboard', () => ({
  hasImageAsync: jest.fn(),
  getImageAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock/document/',
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    Base64: 'base64',
  },
}));

describe('Sprint 1 field reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins draft media into a durable document directory', async () => {
    const result = await DraftMediaCache.pinDraftMedia(
      'file:///tmp/photo one.jpg',
      'photo one.jpg'
    );

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      'file:///mock/document/draft-media/',
      { intermediates: true }
    );
    expect(FileSystem.copyAsync).toHaveBeenCalled();
    expect(result).toContain('file:///mock/document/draft-media/');
  });

  it('writes clipboard images to a durable local file before returning them', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onPhotosSelected = jest.fn();
    const writeClipboardSpy = jest.spyOn(
      DraftMediaCache,
      'writeClipboardImageToDraft'
    );

    (Clipboard.hasImageAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getImageAsync as jest.Mock).mockResolvedValue({
      data: 'ZmFrZS1wbmc=',
    });

    const { showPhotoSelectionDialog } = usePhotoSelection();
    await showPhotoSelectionDialog({ onPhotosSelected });

    const actions = alertSpy.mock.calls[0]?.[2] as
      | Array<{ text?: string; onPress?: () => Promise<void> | void }>
      | undefined;
    const clipboardAction = actions?.find(
      option => option.text === 'Paste from Clipboard'
    );

    expect(clipboardAction).toBeTruthy();
    await clipboardAction?.onPress?.();

    expect(writeClipboardSpy).toHaveBeenCalledWith(
      'ZmFrZS1wbmc=',
      expect.stringMatching(/^clipboard_\d+\.png$/)
    );
    expect(onPhotosSelected).toHaveBeenCalledWith([
      expect.objectContaining({
        uri: expect.stringMatching(/^file:\/\/\/mock\/document\/draft-media\//),
      }),
    ]);

    writeClipboardSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
