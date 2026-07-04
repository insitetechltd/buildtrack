import { buildCreateTaskPhotoReturnParams } from "../createTaskRouteParams";
import type { RootTabParamList, TasksStackParamList } from "../navigationTypes";

describe("buildCreateTaskPhotoReturnParams", () => {
  it("drops one-time clear-form flags when returning selected photos", () => {
    const selectedPhotos = [
      {
        uri: "file:///photo-1.jpg",
        fileName: "photo-1.jpg",
        isAnnotated: false,
      },
    ];

    expect(
      buildCreateTaskPhotoReturnParams({
        routeParams: {
          parentTaskId: "task-1",
          parentSubTaskId: "subtask-1",
          clearForm: true,
          _timestamp: 12345,
        },
        selectedPhotos,
      }),
    ).toEqual({
      parentTaskId: "task-1",
      parentSubTaskId: "subtask-1",
      editTaskId: undefined,
      actionType: undefined,
      selectedPhotos,
      uploadedPhotoUrls: undefined,
      clearForm: undefined,
      _timestamp: undefined,
    });
  });

  it("drops one-time clear-form flags when returning uploaded photo URLs", () => {
    expect(
      buildCreateTaskPhotoReturnParams({
        routeParams: {
          editTaskId: "task-2",
          actionType: "edit",
          clearForm: true,
          _timestamp: 67890,
        },
        uploadedPhotoUrls: ["https://example.com/photo-1.jpg"],
      }),
    ).toEqual({
      parentTaskId: undefined,
      parentSubTaskId: undefined,
      editTaskId: "task-2",
      actionType: "edit",
      selectedPhotos: undefined,
      uploadedPhotoUrls: ["https://example.com/photo-1.jpg"],
      clearForm: undefined,
      _timestamp: undefined,
    });
  });
});

describe("TasksList route params", () => {
  it("allows queue launch params when targeting TasksList through the Tasks tab", () => {
    const params: TasksStackParamList["TasksList"] = {
      launchQueue: "my_queue",
      launchBucket: "wip",
      launchSource: "activity_dashboard",
      launchNonce: 123,
    };

    const tabParams: RootTabParamList["Tasks"] = {
      screen: "TasksList",
      params,
    };

    expect(tabParams).toEqual({
      screen: "TasksList",
      params: {
        launchQueue: "my_queue",
        launchBucket: "wip",
        launchSource: "activity_dashboard",
        launchNonce: 123,
      },
    });
  });

  it("still allows navigating to TasksList without launch params", () => {
    const params: TasksStackParamList["TasksList"] = undefined;

    expect(params).toBeUndefined();
  });
});
