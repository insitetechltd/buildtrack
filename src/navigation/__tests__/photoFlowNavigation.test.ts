import {
  dismissPhotoFlowScreens,
  cancelInAppLibraryPicker,
  exitUpdateProgressScreen,
  returnToPhotoSelectionFlat,
} from "../photoFlowNavigation";

describe("photoFlowNavigation", () => {
  it("dismissPhotoFlowScreens pops a form-reopened library back to Create Task (no Select Photos under it)", () => {
    const dispatch = jest.fn();
    const goBack = jest.fn();
    dismissPhotoFlowScreens({
      getState: () => ({
        index: 1,
        routes: [
          { key: "a", name: "CreateTaskMain" },
          { key: "c", name: "InAppLibraryPicker" },
        ],
      }),
      dispatch,
      goBack,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
    expect(goBack).not.toHaveBeenCalled();
  });

  it("cancelInAppLibraryPicker pops only the library when Select Photos is underneath", () => {
    const dispatch = jest.fn();
    cancelInAppLibraryPicker({
      getState: () => ({
        index: 2,
        routes: [
          { key: "a", name: "CreateTaskMain" },
          { key: "b", name: "PhotoSelection" },
          { key: "c", name: "InAppLibraryPicker" },
        ],
      }),
      dispatch,
      goBack: jest.fn(),
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
  });

  it("cancelInAppLibraryPicker dismisses photo flow when Create Task sits above a stale Select Photos", () => {
    const dispatch = jest.fn();
    cancelInAppLibraryPicker({
      getState: () => ({
        index: 4,
        routes: [
          { key: "a", name: "CreateTaskMain" },
          { key: "b", name: "InAppLibraryPicker" },
          { key: "c", name: "PhotoSelection" },
          { key: "d", name: "CreateTaskMain" },
          { key: "e", name: "InAppLibraryPicker" },
        ],
      }),
      dispatch,
      goBack: jest.fn(),
    });
    // Immediate parent is CreateTaskMain → dismiss only the top library
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
  });

  it("cancelInAppLibraryPicker dismisses the whole photo flow when library is root", () => {
    const dispatch = jest.fn();
    cancelInAppLibraryPicker({
      getState: () => ({
        index: 1,
        routes: [
          { key: "a", name: "CreateTaskMain" },
          { key: "c", name: "InAppLibraryPicker" },
        ],
      }),
      dispatch,
      goBack: jest.fn(),
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
  });

  it("returnToPhotoSelectionFlat updates the existing Select Photos and pops library", () => {
    const dispatch = jest.fn();
    const replace = jest.fn();
    returnToPhotoSelectionFlat(
      {
        getState: () => ({
          index: 2,
          routes: [
            { key: "a", name: "CreateTaskMain" },
            { key: "b", name: "PhotoSelection" },
            { key: "c", name: "InAppLibraryPicker" },
          ],
        }),
        dispatch,
        goBack: jest.fn(),
        replace,
      },
      {
        initialPhotos: [{ uri: "file://1", fileName: "1.jpg", isAnnotated: false }],
        selectionRevision: 1,
      },
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SET_PARAMS",
        source: "b",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("returnToPhotoSelectionFlat navigates (push) when Select Photos is not on the stack", () => {
    const navigate = jest.fn();
    const replace = jest.fn();
    returnToPhotoSelectionFlat(
      {
        getState: () => ({
          index: 1,
          routes: [
            { key: "a", name: "CreateTaskMain" },
            { key: "c", name: "InAppLibraryPicker" },
          ],
        }),
        dispatch: jest.fn(),
        goBack: jest.fn(),
        navigate,
        replace,
      },
      {
        initialPhotos: [{ uri: "file://1", fileName: "1.jpg", isAnnotated: false }],
      },
    );
    expect(navigate).toHaveBeenCalledWith(
      "PhotoSelection",
      expect.objectContaining({
        initialPhotos: [expect.objectContaining({ uri: "file://1" })],
      }),
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("exitUpdateProgressScreen pops Update Progress and photo picking back to the anchor screen", () => {
    const dispatch = jest.fn();
    const goBack = jest.fn();
    exitUpdateProgressScreen({
      getState: () => ({
        index: 4,
        routes: [
          { key: "a", name: "TasksList" },
          { key: "b", name: "TaskDetail" },
          { key: "c", name: "UpdateProgress" },
          { key: "d", name: "InAppLibraryPicker" },
          { key: "e", name: "UpdateProgress" },
        ],
      }),
      dispatch,
      goBack,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 3 }),
      }),
    );
    expect(goBack).not.toHaveBeenCalled();
  });

  it("exitUpdateProgressScreen pops a lone Update Progress screen back to the tab root", () => {
    const dispatch = jest.fn();
    exitUpdateProgressScreen({
      getState: () => ({
        index: 1,
        routes: [
          { key: "a", name: "TasksList" },
          { key: "b", name: "UpdateProgress" },
        ],
      }),
      dispatch,
      goBack: jest.fn(),
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
  });
});
