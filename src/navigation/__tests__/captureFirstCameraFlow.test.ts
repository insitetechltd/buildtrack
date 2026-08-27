import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CommonActions } from "@react-navigation/native";

import {
  clearCaptureFirstReturnTab,
  exitCaptureFirstFlow,
  getCaptureFirstReturnTab,
  handOffCaptureFirstToUpdateProgress,
  launchCaptureFirstCamera,
  navigateToAddPhotosCaptureSession,
  promptCaptureFirstDestination,
  promptCaptureFirstSource,
  rememberCaptureFirstOrigin,
} from "../captureFirstCameraFlow";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("../../utils/draftMediaCache", () => ({
  pinDraftMedia: jest.fn(async (uri: string) => uri),
}));

describe("captureFirstCameraFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCaptureFirstReturnTab();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore?.();
  });

  it("remembers Activity or Tasks as cancel-return origin", () => {
    rememberCaptureFirstOrigin({
      index: 2,
      routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
    });
    expect(getCaptureFirstReturnTab()).toBe("Tasks");

    rememberCaptureFirstOrigin({
      index: 0,
      routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
    });
    expect(getCaptureFirstReturnTab()).toBe("Activity");
  });

  it("promptCaptureFirstSource opens CaptureSession and records origin", () => {
    const navigate = jest.fn();
    promptCaptureFirstSource(
      { navigate },
      {
        index: 0,
        routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
      },
    );

    expect(getCaptureFirstReturnTab()).toBe("Activity");
    expect(navigate).toHaveBeenCalledWith("Camera", {
      screen: "CaptureSession",
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("navigateToAddPhotosCaptureSession pushes CaptureSession with addPhotos entry", () => {
    const push = jest.fn();
    navigateToAddPhotosCaptureSession(
      { navigate: jest.fn(), push },
      {
        returnScreen: "CreateTask",
        companyId: "c1",
        userId: "u1",
      },
    );
    expect(push).toHaveBeenCalledWith(
      "CaptureSession",
      expect.objectContaining({
        entry: "addPhotos",
        returnScreen: "CreateTask",
        companyId: "c1",
        userId: "u1",
      }),
    );
  });

  it("launchCaptureFirstCamera tries multi then navigates PhotoSelection with assets", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file://a.jpg", fileName: "a.jpg" },
        { uri: "file://b.jpg", fileName: "b.jpg" },
      ],
    });

    const navigate = jest.fn();
    await launchCaptureFirstCamera({ navigate });

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true }),
    );
    expect(navigate).toHaveBeenCalledWith(
      "Camera",
      expect.objectContaining({
        screen: "PhotoSelection",
        params: expect.objectContaining({
          captureFirstFlow: true,
          initialPhotos: [
            expect.objectContaining({ uri: "file://a.jpg" }),
            expect.objectContaining({ uri: "file://b.jpg" }),
          ],
        }),
      }),
    );
  });

  it("promptCaptureFirstDestination Create keeps Select Photos under CreateTaskMain", () => {
    const dispatch = jest.fn();
    const navigate = jest.fn();
    const photos = [{ uri: "file://x.jpg", fileName: "x.jpg", isAnnotated: false }];

    promptCaptureFirstDestination({ navigation: { dispatch, navigate }, photos });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    buttons.find((b) => b.text === "Create new task")?.onPress?.();

    expect(dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: "PhotoSelection",
            params: expect.objectContaining({
              captureFirstFlow: true,
              initialPhotos: photos,
            }),
          },
          {
            name: "CreateTaskMain",
            params: expect.objectContaining({
              selectedPhotos: photos,
              captureFirstFlow: true,
            }),
          },
        ],
      }),
    );
    const resetAction = dispatch.mock.calls[0][0];
    expect(resetAction.payload.routes[1].params.cameraLaunchContext).toBeUndefined();
    expect(resetAction.payload.routes[1].params.actionType).toBeUndefined();
  });

  it("promptCaptureFirstDestination Update keeps Select Photos under CaptureTaskPicker", () => {
    const dispatch = jest.fn();
    const photos = [{ uri: "file://x.jpg", fileName: "x.jpg", isAnnotated: false }];

    promptCaptureFirstDestination({ navigation: { dispatch }, photos });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    buttons.find((b) => b.text === "Update existing task")?.onPress?.();

    expect(dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: "PhotoSelection",
            params: expect.objectContaining({
              captureFirstFlow: true,
              initialPhotos: photos,
            }),
          },
          {
            name: "CaptureTaskPicker",
            params: { selectedPhotos: photos },
          },
        ],
      }),
    );
  });

  it("exitCaptureFirstFlow returns to remembered tab and clears camera stack", () => {
    rememberCaptureFirstOrigin({
      index: 2,
      routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
    });
    const dispatch = jest.fn();
    const parentNavigate = jest.fn();
    exitCaptureFirstFlow({
      dispatch,
      navigate: jest.fn(),
      getParent: () => ({ navigate: parentNavigate }),
    });

    expect(dispatch).toHaveBeenCalled();
    expect(parentNavigate).toHaveBeenCalledWith("Tasks");
    expect(getCaptureFirstReturnTab()).toBeNull();
  });

  it("handOffCaptureFirstToUpdateProgress opens Update Progress on origin tab", () => {
    rememberCaptureFirstOrigin({
      index: 2,
      routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
    });
    jest.useFakeTimers();
    const dispatch = jest.fn();
    const parentNavigate = jest.fn();
    const photos = [{ uri: "file://x.jpg", fileName: "x.jpg", isAnnotated: false }];

    handOffCaptureFirstToUpdateProgress({
      navigation: {
        dispatch,
        navigate: jest.fn(),
        getParent: () => ({
          navigate: parentNavigate,
          getState: () => ({ routeNames: ["Activity", "Camera", "Tasks"] }),
        }),
      },
      taskId: "task-1",
      photos,
    });

    expect(parentNavigate).toHaveBeenCalledWith("Tasks", {
      screen: "UpdateProgress",
      params: expect.objectContaining({
        taskId: "task-1",
        selectedPhotos: photos,
        sourceScreen: "tasks",
      }),
    });
    expect(dispatch).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(dispatch).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
