import '@testing-library/jest-native/extend-expect';

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock Expo runtime
global.__ExpoImportMetaRegistry = {
  get: jest.fn(() => ({})),
  register: jest.fn(),
};

// Mock Expo Winter
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });

// Mock React Native Animated
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), {
  virtual: true,
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('react-native/Libraries/Modal/Modal', () => {
  return ({ visible, children }) => (visible ? children : null);
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaView: ({ children }) => children,
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://test-image.jpg',
          fileName: 'test-image.jpg',
          type: 'image',
          width: 1920,
          height: 1080,
        },
      ],
    })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://test-image.jpg',
          fileName: 'test-image.jpg',
          type: 'image',
          width: 1920,
          height: 1080,
        },
      ],
    })
  ),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file://test-document.pdf',
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
        },
      ],
    })
  ),
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn((uri, options) => {
    return Promise.resolve('aGVsbG8=');
  }),
  getInfoAsync: jest.fn((uri) => {
    return Promise.resolve({
      exists: true,
      size: 1024000,
      isDirectory: false,
      uri: uri,
    });
  }),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
  documentDirectory: 'file:///mock/document/',
  cacheDirectory: 'file:///mock/cache/',
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri, actions, options) =>
    Promise.resolve({
      uri: 'file://compressed-image.jpg',
      width: 1920,
      height: 1440,
    })
  ),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

if (process.env.USE_REAL_SUPABASE !== '1') {
  jest.doMock('./src/api/supabase', () => ({
    supabase: {
      from: jest.fn((table) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: { id: '123', name: 'Test' },
                error: null,
              }),
            ),
            order: jest.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              }),
            ),
          })),
          is: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: [],
                error: null,
              }),
            ),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: { id: '123' },
                error: null,
              }),
            ),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: { id: '123' },
              error: null,
            }),
          ),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: null,
              error: null,
            }),
          ),
        })),
      })),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(() =>
            Promise.resolve({
              data: { path: 'mock-path/file.jpg' },
              error: null,
            }),
          ),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'https://example.com/mock-url.jpg' },
          })),
          remove: jest.fn(() =>
            Promise.resolve({
              data: null,
              error: null,
            }),
          ),
        })),
      },
      auth: {
        signIn: jest.fn(() =>
          Promise.resolve({
            data: { user: { id: '123' }, session: {} },
            error: null,
          }),
        ),
        signOut: jest.fn(() =>
          Promise.resolve({
            error: null,
          }),
        ),
        getSession: jest.fn(() =>
          Promise.resolve({
            data: { session: { user: { id: '123' } } },
            error: null,
          }),
        ),
      },
    },
  }));
}

if (process.env.USE_REAL_SUPABASE === '1') {
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.SUPABASE_TEST_URL) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.SUPABASE_TEST_URL;
  }

  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_TEST_ANON_KEY) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
  }
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests
  log: jest.fn(),
  // Keep errors and warnings
  error: console.error,
  warn: console.warn,
};
