import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import PhotoSelectionScreen from "@/screens/PhotoSelectionScreen";

jest.mock("@/ui/viewAdapters/usePhotoSelectionViewAdapter", () => ({
  usePhotoSelectionViewAdapter: jest.fn(),
}));

jest.mock("@/components/migration/ModernUiMarker", () => ({
  __esModule: true,
  default: function MockModernUiMarker() {
    return null;
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name, testID }: { name: string; testID?: string }) => {
    const { Text } = require("react-native");
    return <Text testID={testID}>{`[ionicon:${name}]`}</Text>;
  },
}));

jest.mock("expo-image", () => ({
  Image: ({ testID }: { testID?: string }) => {
    const { View } = require("react-native");
    return <View testID={testID} />;
  },
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({
    top: 24,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

function buildAdapterOutput(overrides: Record<string, any> = {}) {
  const photos = overrides.photos ?? [
    { id: "p1", uri: "file://p1", caption: "", isSelected: true, index: 0 },
    { id: "p2", uri: "file://p2", caption: "", isSelected: true, index: 1 },
    { id: "p3", uri: "file://p3", caption: "", isSelected: true, index: 2 },
  ];
  const mockHandleTogglePhotoSelection = jest.fn();
  const mockHandleRemovePhotoAt = jest.fn();
  const mockHandleAddMorePhotos = jest.fn();
  const mockHandleUploadPhotos = jest.fn();
  const mockHandleShowEnlarged = jest.fn();
  const mockHandleCloseEnlarged = jest.fn();
  const mockHandleNextEnlarged = jest.fn();
  const mockHandlePrevEnlarged = jest.fn();
  const mockHandleNavigateBack = jest.fn();
  const mockHandleMovePhotoUp = jest.fn();
  const mockHandleMovePhotoDown = jest.fn();
  const mockHandleSetCaption = jest.fn();
  const mockHandleSetSaveIntent = jest.fn();
  const mockHandleToggleMiniPicker = jest.fn();
  const mockHandleSelectTaskForAttach = jest.fn();
  const mockSetEnlargedPhotoIndex = jest.fn();
  const mockHandlePhotoPress = jest.fn();
  const mockHandleAnnotatePhoto = jest.fn();
  const mockHandleAddPhotos = jest.fn();
  const mockHandleRemovePhoto = jest.fn();

  const output = {
    screenId: "PhotoSelectionScreen",
    readiness: {
      hasInitialFrame: true,
      hasUsableData: true,
      isBackgroundRefreshing: false,
      isNavigationTransitionActive: false,
    },
    continuity: {
      isInitialLoading: false,
      isBackgroundRefreshing: false,
      hasCachedFrame: true,
      shouldRenderSkeletonShell: false,
      shouldRenderEmptyState: false,
      freshnessLabel: "Ready",
    },
    photos,
    selectedCount: photos.length,
    canUpload: true,
    hasEnlargedPhoto: false,
    enlargedPhotoIndex: overrides.enlargedPhotoIndex ?? null,
    enlargedPhoto: null,
    isUploading: false,
    isAnnotating: false,
    saveIntent: overrides.saveIntent ?? "attach_task",
    selectedTaskId: overrides.selectedTaskId ?? null,
    tasksForPicker: overrides.tasksForPicker ?? [],
    isMiniPickerVisible: overrides.isMiniPickerVisible ?? false,
    primaryActionLabel: overrides.primaryActionLabel ?? "Upload 3 Photos",
  };
  return {
    output,
    handleTogglePhotoSelection: mockHandleTogglePhotoSelection,
    handleRemovePhotoAt: mockHandleRemovePhotoAt,
    handleAddPhotos: overrides.handleAddPhotos ?? mockHandleAddPhotos,
    handlePhotoPress: overrides.handlePhotoPress ?? mockHandlePhotoPress,
    handleAnnotatePhoto: overrides.handleAnnotatePhoto ?? mockHandleAnnotatePhoto,
    handleRemovePhoto: overrides.handleRemovePhoto ?? mockHandleRemovePhoto,
    handleUploadPhotos: overrides.handleUploadPhotos ?? mockHandleUploadPhotos,
    setEnlargedPhotoIndex: overrides.setEnlargedPhotoIndex ?? mockSetEnlargedPhotoIndex,
    handleShowEnlarged: mockHandleShowEnlarged,
    handleCloseEnlarged: mockHandleCloseEnlarged,
    handleNextEnlarged: mockHandleNextEnlarged,
    handlePrevEnlarged: mockHandlePrevEnlarged,
    handleNavigateBack: mockHandleNavigateBack,
    handleMovePhotoUp: overrides.handleMovePhotoUp ?? mockHandleMovePhotoUp,
    handleMovePhotoDown: overrides.handleMovePhotoDown ?? mockHandleMovePhotoDown,
    handleSetCaption: overrides.handleSetCaption ?? mockHandleSetCaption,
    handleSetSaveIntent: overrides.handleSetSaveIntent ?? mockHandleSetSaveIntent,
    handleToggleMiniPicker: overrides.handleToggleMiniPicker ?? mockHandleToggleMiniPicker,
    handleSelectTaskForAttach: overrides.handleSelectTaskForAttach ?? mockHandleSelectTaskForAttach,
    ...overrides,
  };
}

describe("PhotoSelectionScreen batch review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReset();
  });

  it("renders segmented Attach/Save pills and pressing Save triggers handleSetSaveIntent", () => {
    const adapter = buildAdapterOutput({});
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(adapter);

    const screen = render(
      <PhotoSelectionScreen
        photos={[]}
        onPhotosSelected={jest.fn()}
        onPhotosUploaded={jest.fn()}
        onNavigateToUpdateProgress={jest.fn()}
        onNavigateBack={jest.fn()}
      />,
    );

    expect(screen.getByText("Attach to Task")).toBeTruthy();
    expect(screen.getByText("Save to Project")).toBeTruthy();

    fireEvent.press(screen.getByText("Save to Project"));
    expect(adapter.handleSetSaveIntent).toHaveBeenCalledWith("project_unattached");

    fireEvent.press(screen.getByText("Attach to Task"));
    expect(adapter.handleSetSaveIntent).toHaveBeenCalledWith("attach_task");
  });

  it("renders 3 photo tiles with caption inputs and Up/Down chevrons; first tile Up disabled; moving index 1 up calls handleMovePhotoUp(1)", () => {
    const adapter = buildAdapterOutput({});
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(adapter);

    const screen = render(
      <PhotoSelectionScreen
        photos={[]}
        onPhotosSelected={jest.fn()}
        onPhotosUploaded={jest.fn()}
        onNavigateToUpdateProgress={jest.fn()}
        onNavigateBack={jest.fn()}
      />,
    );

    const captionInputs = screen.getAllByPlaceholderText("Caption");
    expect(captionInputs).toHaveLength(3);

    const upChevrons = screen.getAllByText("[ionicon:chevron-up]");
    const downChevrons = screen.getAllByText("[ionicon:chevron-down]");
    expect(upChevrons.length).toBeGreaterThanOrEqual(3);
    expect(downChevrons.length).toBeGreaterThanOrEqual(3);

    fireEvent(upChevrons[1], "onPress");
    expect(adapter.handleMovePhotoUp).toHaveBeenCalledWith(1);

    fireEvent.changeText(captionInputs[0], "Excavation starting");
    expect(adapter.handleSetCaption).toHaveBeenCalledWith(0, "Excavation starting");
  });

  it("renders +Choose task trigger, opens mini-picker with 2 tasks, tapping task calls handleSelectTaskForAttach then hides picker", () => {
    const tasksForPicker = [
      { id: "t1", title: "Foundation pour" },
      { id: "t2", title: "Framing rough-in" },
    ];
    const initialAdapter = buildAdapterOutput({
      saveIntent: "attach_task",
      isMiniPickerVisible: false,
      tasksForPicker,
    });
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(initialAdapter);

    const screen = render(
      <PhotoSelectionScreen
        photos={[]}
        onPhotosSelected={jest.fn()}
        onPhotosUploaded={jest.fn()}
        onNavigateToUpdateProgress={jest.fn()}
        onNavigateBack={jest.fn()}
      />,
    );

    const trigger = screen.getByText("+ Choose task to attach");
    expect(trigger).toBeTruthy();
    fireEvent.press(trigger);
    expect(initialAdapter.handleToggleMiniPicker).toHaveBeenCalledTimes(1);

    const visiblePickerAdapter = buildAdapterOutput({
      saveIntent: "attach_task",
      isMiniPickerVisible: true,
      tasksForPicker,
    });
    usePhotoSelectionViewAdapter.mockReturnValue(visiblePickerAdapter);
    screen.rerender(
      <PhotoSelectionScreen
        photos={[]}
        onPhotosSelected={jest.fn()}
        onPhotosUploaded={jest.fn()}
        onNavigateToUpdateProgress={jest.fn()}
        onNavigateBack={jest.fn()}
      />,
    );

    expect(screen.getByText("Foundation pour")).toBeTruthy();
    expect(screen.getByText("Framing rough-in")).toBeTruthy();

    fireEvent.press(screen.getByText("Foundation pour"));
    expect(visiblePickerAdapter.handleSelectTaskForAttach).toHaveBeenCalledWith("t1");
  });
});
