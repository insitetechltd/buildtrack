import {
  dismissPhotoFlowScreens,
  returnToPhotoSelectionFlat,
} from "../photoFlowNavigation";

describe("photoFlowNavigation", () => {
  it("dismissPhotoFlowScreens pops all library/select layers back to the form", () => {
    const dispatch = jest.fn();
    dismissPhotoFlowScreens({
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
        payload: expect.objectContaining({ count: 2 }),
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
});
