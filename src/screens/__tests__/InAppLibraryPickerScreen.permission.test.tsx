import React from "react";
import { act, render, waitFor, fireEvent } from "@testing-library/react-native";

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetAssetInfoAsync = jest.fn();
const mockPinDraftMedia = jest.fn(async (uri: string) => `pinned:${uri}`);
const mockImagePicker = jest.fn(() => null);

jest.mock("expo-media-library", () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  getAssetInfoAsync: (...args: unknown[]) => mockGetAssetInfoAsync(...args),
}));

jest.mock("expo-image-multiple-picker", () => ({
  ImagePicker: (props: Record<string, unknown>) => {
    mockImagePicker(props);
    const React = require("react");
    const { View, Text, Pressable } = require("react-native");
    const theme = props.theme as any;
    const headerEl =
      theme && typeof theme.header === "function"
        ? theme.header({
            view: "gallery",
            imagesPicked: 0,
            multiple: true,
            picked: false,
            noAlbums: true,
            goToAlbum: () => {},
            save: () => {},
          })
        : null;
    return React.createElement(
      View,
      { testID: "mock-image-picker" },
      headerEl,
      React.createElement(Text, null, "picker-mounted"),
      React.createElement(Pressable, {
        testID: "mock-image-picker-save",
        onPress: () => {
          if (typeof props.onSave === "function") {
            props.onSave([
              {
                id: "asset-42",
                uri: "ph://asset-42",
                filename: "site.jpg",
              },
            ]);
          }
        },
      }),
      React.createElement(Pressable, {
        testID: "mock-image-picker-cancel",
        onPress: () => {
          if (typeof props.onCancel === "function") {
            props.onCancel();
          }
        },
      }),
    );
  },
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("../../utils/draftMediaCache", () => ({
  pinDraftMedia: (...args: unknown[]) => mockPinDraftMedia(...args),
}));

import InAppLibraryPickerScreen, {
  ensureMediaLibraryAccess,
} from "../InAppLibraryPickerScreen";

describe("ensureMediaLibraryAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true when already granted without prompting", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests permission when not granted and can ask again", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it("returns false when permanently denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(ensureMediaLibraryAccess()).resolves.toBe(false);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("InAppLibraryPickerScreen permission gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not mount ImagePicker until MediaLibrary permission is granted", async () => {
    let resolveRequest: (value: { granted: boolean }) => void = () => {};
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    mockRequestPermissionsAsync.mockImplementation(
      () =>
        new Promise<{ granted: boolean }>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { queryByTestId, getByTestId } = render(
      <InAppLibraryPickerScreen onCancel={jest.fn()} onSave={jest.fn()} />,
    );

    expect(getByTestId("in-app-library__loading")).toBeTruthy();
    expect(queryByTestId("mock-image-picker")).toBeNull();
    expect(mockImagePicker).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    });

    await act(async () => {
      resolveRequest({ granted: true });
    });

    await waitFor(() => {
      expect(getByTestId("mock-image-picker")).toBeTruthy();
    });
    expect(getByTestId("in-app-library__screen")).toBeTruthy();
  });

  it("shows denied UI instead of a blank gallery when access is refused", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const onCancel = jest.fn();

    const { findByTestId, queryByTestId } = render(
      <InAppLibraryPickerScreen onCancel={onCancel} onSave={jest.fn()} />,
    );

    expect(await findByTestId("in-app-library__permission_denied")).toBeTruthy();
    expect(queryByTestId("mock-image-picker")).toBeNull();

    fireEvent.press(await findByTestId("in-app-library__permission_cancel"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("InAppLibraryPickerScreen save / cancel (upload-flow handoff)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockGetAssetInfoAsync.mockResolvedValue({
      id: "asset-42",
      uri: "ph://asset-42",
      localUri: "file:///tmp/site.jpg",
      filename: "site.jpg",
    });
  });

  it("pins library assets and passes mediaLibraryAssetId through onSave", async () => {
    const onSave = jest.fn();
    const { findByTestId } = render(
      <InAppLibraryPickerScreen onCancel={jest.fn()} onSave={onSave} />,
    );

    await findByTestId("mock-image-picker");
    await act(async () => {
      fireEvent.press(await findByTestId("mock-image-picker-save"));
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    expect(mockPinDraftMedia).toHaveBeenCalledWith("file:///tmp/site.jpg", "site.jpg");
    expect(onSave).toHaveBeenCalledWith([
      expect.objectContaining({
        uri: "pinned:file:///tmp/site.jpg",
        fileName: "site.jpg",
        mediaLibraryAssetId: "asset-42",
        isAnnotated: false,
      }),
    ]);
  });

  it("header Cancel forwards to onCancel (form reopen dismiss path)", async () => {
    const onCancel = jest.fn();
    const { findByTestId } = render(
      <InAppLibraryPickerScreen onCancel={onCancel} onSave={jest.fn()} />,
    );

    await findByTestId("in-app-library__screen");
    fireEvent.press(await findByTestId("in-app-library__cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
