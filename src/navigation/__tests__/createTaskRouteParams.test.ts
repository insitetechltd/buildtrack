import {
  buildCreateTaskPhotoReturnParams,
  resolveCreateTaskEntryParams,
} from "../createTaskRouteParams";
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
      resumeAsCreate: undefined,
      actionType: undefined,
      cameraLaunchContext: undefined,
      postCaptureDefault: undefined,
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
      resumeAsCreate: undefined,
      actionType: "edit",
      cameraLaunchContext: undefined,
      postCaptureDefault: undefined,
      selectedPhotos: undefined,
      uploadedPhotoUrls: ["https://example.com/photo-1.jpg"],
      clearForm: undefined,
      _timestamp: undefined,
    });
  });

  it("preserves global camera routing params when returning photos to create task", () => {
    expect(
      buildCreateTaskPhotoReturnParams({
        routeParams: {
          actionType: "photos",
          cameraLaunchContext: "global",
          postCaptureDefault: "create_task",
        },
        uploadedPhotoUrls: ["https://example.com/photo-2.jpg"],
      }),
    ).toEqual({
      parentTaskId: undefined,
      parentSubTaskId: undefined,
      editTaskId: undefined,
      resumeAsCreate: undefined,
      actionType: "photos",
      cameraLaunchContext: "global",
      postCaptureDefault: "create_task",
      selectedPhotos: undefined,
      uploadedPhotoUrls: ["https://example.com/photo-2.jpg"],
      clearForm: undefined,
      _timestamp: undefined,
    });
  });

  it("preserves resumeAsCreate when returning photos to an unfinished draft", () => {
    expect(
      buildCreateTaskPhotoReturnParams({
        routeParams: {
          editTaskId: "draft-1",
          resumeAsCreate: true,
          sourceScreen: "dashboard",
        },
        selectedPhotos: [
          {
            uri: "file:///draft.jpg",
            fileName: "draft.jpg",
            isAnnotated: false,
          },
        ],
      }),
    ).toMatchObject({
      editTaskId: "draft-1",
      resumeAsCreate: true,
      sourceScreen: "dashboard",
    });
  });
});

describe("resolveCreateTaskEntryParams", () => {
  it("strips stale task-action params when a fresh create-task reset is requested", () => {
    expect(
      resolveCreateTaskEntryParams({
        editTaskId: "task-1",
        actionType: "photos",
        updateTargetSubTaskId: "subtask-1",
        sourceScreen: "tasks",
        sourceTaskId: "task-1",
        sourceSubTaskId: "subtask-1",
        cameraLaunchContext: "task_detail",
        postCaptureDefault: "same_task_update",
        selectedPhotos: [
          {
            uri: "file:///photo-1.jpg",
            fileName: "photo-1.jpg",
            isAnnotated: false,
          },
        ],
        uploadedPhotoUrls: ["https://example.com/photo-1.jpg"],
        clearForm: true,
        _timestamp: 12345,
      }),
    ).toEqual({
      parentTaskId: undefined,
      parentSubTaskId: undefined,
      editTaskId: undefined,
      resumeAsCreate: undefined,
      actionType: undefined,
      updateTargetSubTaskId: undefined,
      sourceTaskId: undefined,
      sourceSubTaskId: undefined,
      sourceScreen: undefined,
      cameraLaunchContext: undefined,
      postCaptureDefault: undefined,
      selectedPhotos: undefined,
      uploadedPhotoUrls: undefined,
      clearForm: true,
      _timestamp: 12345,
    });
  });

  it("leaves ordinary create-task photo return params untouched when no reset is requested", () => {
    expect(
      resolveCreateTaskEntryParams({
        selectedPhotos: [
          {
            uri: "file:///photo-2.jpg",
            fileName: "photo-2.jpg",
            isAnnotated: false,
          },
        ],
      }),
    ).toEqual({
      selectedPhotos: [
        {
          uri: "file:///photo-2.jpg",
          fileName: "photo-2.jpg",
          isAnnotated: false,
        },
      ],
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
