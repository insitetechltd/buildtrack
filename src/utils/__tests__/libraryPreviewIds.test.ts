import {
  hydratePhotokitPreviewIds,
  peekPhotokitPreviewIds,
  persistPhotokitPreviewIds,
  resetPhotokitPreviewIdsForTests,
} from "../libraryPreviewIds";

const AsyncStorage = require("@react-native-async-storage/async-storage");

describe("libraryPreviewIds", () => {
  beforeEach(() => {
    resetPhotokitPreviewIdsForTests();
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("hydrates persisted ids into memory", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(["a", "b"]));
    await expect(hydratePhotokitPreviewIds()).resolves.toEqual(["a", "b"]);
    expect(peekPhotokitPreviewIds()).toEqual(["a", "b"]);
  });

  it("persists a capped newest-N id list", async () => {
    await persistPhotokitPreviewIds(["x", "", "y"]);
    expect(peekPhotokitPreviewIds()).toEqual(["x", "y"]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@insite/photokit-recents-preview-ids",
      JSON.stringify(["x", "y"]),
    );
  });
});
