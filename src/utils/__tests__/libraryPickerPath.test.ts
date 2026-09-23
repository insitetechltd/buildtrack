import {
  getLibraryPickerPath,
  isLibraryPickerNative2b,
  setLibraryPickerPathForTests,
} from "../libraryPickerPerf";

describe("library picker path", () => {
  const prevEnv = process.env.EXPO_PUBLIC_LIBRARY_PICKER_PATH;

  afterEach(() => {
    delete (globalThis as { __LIBRARY_PICKER_PATH__?: string }).__LIBRARY_PICKER_PATH__;
    if (prevEnv === undefined) {
      delete process.env.EXPO_PUBLIC_LIBRARY_PICKER_PATH;
    } else {
      process.env.EXPO_PUBLIC_LIBRARY_PICKER_PATH = prevEnv;
    }
  });

  it("defaults to native2b so Metro matches the TF237 path", () => {
    delete process.env.EXPO_PUBLIC_LIBRARY_PICKER_PATH;
    delete (globalThis as { __LIBRARY_PICKER_PATH__?: string }).__LIBRARY_PICKER_PATH__;
    expect(getLibraryPickerPath()).toBe("native2b");
    expect(isLibraryPickerNative2b()).toBe(true);
  });

  it("keeps warm as an explicit rollback", () => {
    setLibraryPickerPathForTests("warm");
    expect(getLibraryPickerPath()).toBe("warm");
    expect(isLibraryPickerNative2b()).toBe(false);
  });
});
