import {
  buildPhotoShortcutCreateTaskParams,
  shouldReturnToCreateTaskShortcut,
} from "../photoShortcutRoutes";

describe("photo shortcut route helpers", () => {
  it("normalizes update action photo returns back into CreateTask shortcut params", () => {
    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "UpdateProgress",
        actionType: "update",
      }),
    ).toBe(true);

    expect(
      buildPhotoShortcutCreateTaskParams({
        taskId: "task-1",
        subTaskId: "subtask-1",
        actionType: "update",
        selectedPhotos: [{ uri: "file:///photo-1.jpg" }],
      }),
    ).toEqual(
      expect.objectContaining({
        editTaskId: "task-1",
        actionType: "update",
        updateTargetSubTaskId: "subtask-1",
        selectedPhotos: [{ uri: "file:///photo-1.jpg" }],
      }),
    );
  });

  it("keeps existing non-shortcut branches out of CreateTask normalization", () => {
    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "AddComment",
        actionType: undefined,
      }),
    ).toBe(false);

    expect(
      shouldReturnToCreateTaskShortcut({
        returnScreen: "UpdateProgress",
        actionType: undefined,
      }),
    ).toBe(false);
  });
});
