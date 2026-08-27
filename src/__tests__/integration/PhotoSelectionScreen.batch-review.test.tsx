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

jest.mock("@/components/photoEdit/SortablePhotoGrid", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    __esModule: true,
    default: function MockSortablePhotoGrid({
      photos,
      onPressPhoto,
      onPressAdd,
    }: {
      photos: Array<{ uri: string }>;
      onPressPhoto: (index: number) => void;
      onPressAdd: () => void;
    }) {
      return (
        <View testID="photo-selection__draggable_grid">
          <Pressable testID="photo-selection__add_more" onPress={onPressAdd}>
            <Text>Add Photo</Text>
          </Pressable>
          {photos.map((photo, index) => (
            <Pressable
              key={`${photo.uri}-${index}`}
              testID={`photo-selection__tile_${index}`}
              onPress={() => onPressPhoto(index)}
            />
          ))}
        </View>
      );
    },
  };
});

jest.mock("@/components/photoEdit/DrawOverlay", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    DrawOverlay: function MockDrawOverlay() {
      return <View testID="photo-selection__draw_overlay" />;
    },
  };
});

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

const baseScreenProps = {
  taskId: "task-1",
  companyId: "company-1",
  userId: "user-1",
  initialCompletionPercentage: 0,
  onNavigateBack: jest.fn(),
};

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
  const mockHandleSetPhotoOrder = jest.fn();
  const mockHandleSetSaveIntent = jest.fn();
  const mockHandleToggleMiniPicker = jest.fn();
  const mockHandleSelectTaskForAttach = jest.fn();
  const mockSetEnlargedPhotoIndex = jest.fn();
  const mockHandlePhotoPress = jest.fn();
  const mockHandleRotatePhoto = jest.fn();
  const mockHandleApplyCrop = jest.fn();
  const mockHandleApplyDraw = jest.fn();
  const mockHandleResetEdits = jest.fn();
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
    handleRotatePhoto: overrides.handleRotatePhoto ?? mockHandleRotatePhoto,
    handleApplyCrop: overrides.handleApplyCrop ?? mockHandleApplyCrop,
    handleApplyDraw: overrides.handleApplyDraw ?? mockHandleApplyDraw,
    handleResetEdits: overrides.handleResetEdits ?? mockHandleResetEdits,
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
    handleSetPhotoOrder: overrides.handleSetPhotoOrder ?? mockHandleSetPhotoOrder,
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

    const screen = render(<PhotoSelectionScreen {...baseScreenProps} />);

    expect(screen.getByText("Attach to Task")).toBeTruthy();
    expect(screen.getByText("Save to Project")).toBeTruthy();

    fireEvent.press(screen.getByText("Save to Project"));
    expect(adapter.handleSetSaveIntent).toHaveBeenCalledWith("project_unattached");

    fireEvent.press(screen.getByText("Attach to Task"));
    expect(adapter.handleSetSaveIntent).toHaveBeenCalledWith("attach_task");
  });

  it("renders add tile and photo tiles without reorder chevrons; tap tile opens edit", () => {
    const adapter = buildAdapterOutput({});
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(adapter);

    const screen = render(<PhotoSelectionScreen {...baseScreenProps} />);

    expect(screen.queryByPlaceholderText("Caption")).toBeNull();
    expect(screen.getByTestId("photo-selection__add_more")).toBeTruthy();
    expect(screen.getByText("Add Photo")).toBeTruthy();
    expect(screen.queryByText("[ionicon:chevron-up]")).toBeNull();
    expect(screen.queryByText("[ionicon:chevron-down]")).toBeNull();
    expect(screen.queryByTestId("photo-selection__drag_handle_0")).toBeNull();
    expect(screen.getByTestId("photo-selection__tile_0")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tile_1")).toBeTruthy();

    fireEvent.press(screen.getByTestId("photo-selection__tile_1"));
    expect(adapter.handlePhotoPress).toHaveBeenCalledWith(1);
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

    const screen = render(<PhotoSelectionScreen {...baseScreenProps} />);

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
    screen.rerender(<PhotoSelectionScreen {...baseScreenProps} />);

    expect(screen.getByText("Foundation pour")).toBeTruthy();
    expect(screen.getByText("Framing rough-in")).toBeTruthy();

    fireEvent.press(screen.getByText("Foundation pour"));
    expect(visiblePickerAdapter.handleSelectTaskForAttach).toHaveBeenCalledWith("t1");
  });

  it("shows grid add tile and header confirm; tile opens edit; confirm finishes selection", () => {
    const adapter = buildAdapterOutput({});
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(adapter);

    const screen = render(
      <PhotoSelectionScreen {...baseScreenProps} uploadImmediately={false} />,
    );

    expect(screen.queryByText("Attach to Task")).toBeNull();
    expect(screen.queryByTestId("photo-selection__selected_pill")).toBeNull();
    expect(screen.queryByText(/Edit ·/)).toBeNull();
    expect(screen.getByTestId("photo-selection__add_more")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__confirm")).toBeTruthy();

    fireEvent.press(screen.getByTestId("photo-selection__tile_0"));
    expect(adapter.handlePhotoPress).toHaveBeenCalledWith(0);

    fireEvent.press(screen.getByTestId("photo-selection__add_more"));
    expect(adapter.handleAddPhotos).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("photo-selection__confirm"));
    expect(adapter.handleUploadPhotos).toHaveBeenCalledTimes(1);
  });

  it("hosts rotate/crop/draw/reset on edit modal and done returns to selection without finishing", () => {
    const photos = [
      { id: "p1", uri: "file://p1", caption: "", isAnnotated: false },
      { id: "p2", uri: "file://p2", caption: "", isAnnotated: true, annotatedUri: "file://p2-a" },
    ];
    const adapter = buildAdapterOutput({
      photos,
      enlargedPhotoIndex: 0,
    });
    const { usePhotoSelectionViewAdapter } = require("@/ui/viewAdapters/usePhotoSelectionViewAdapter");
    usePhotoSelectionViewAdapter.mockReturnValue(adapter);

    const screen = render(
      <PhotoSelectionScreen {...baseScreenProps} uploadImmediately={false} />,
    );

    expect(screen.getByTestId("photo-selection__preview")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__preview_tools_band")).toBeTruthy();
    expect(screen.queryByTestId("photo-selection__annotate")).toBeNull();
    expect(screen.queryByTestId("photo-selection__preview_caption")).toBeNull();
    expect(screen.getByTestId("photo-selection__tool_rotate")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tool_crop")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tool_draw")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tool_reset")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__preview_thumb_0")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__preview_thumb_1")).toBeTruthy();

    fireEvent.press(screen.getByTestId("photo-selection__tool_rotate"));
    expect(adapter.handleRotatePhoto).toHaveBeenCalledWith(0);

    fireEvent.press(screen.getByTestId("photo-selection__tool_draw"));
    expect(screen.getByTestId("photo-selection__draw_overlay")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tool_draw_undo")).toBeTruthy();
    expect(screen.getByTestId("photo-selection__tool_draw_done")).toBeTruthy();

    fireEvent.press(screen.getByTestId("photo-selection__tool_draw"));
    expect(screen.queryByTestId("photo-selection__draw_overlay")).toBeNull();

    fireEvent.press(screen.getByTestId("photo-selection__tool_reset"));
    expect(adapter.handleResetEdits).toHaveBeenCalledWith(0);

    fireEvent.press(screen.getByTestId("photo-selection__preview_confirm"));
    expect(adapter.setEnlargedPhotoIndex).toHaveBeenCalledWith(null);
    expect(adapter.handleUploadPhotos).not.toHaveBeenCalled();
  });
});
