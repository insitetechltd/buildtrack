import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FileUploadHarness, {
  FILE_UPLOAD_HARNESS_ADD_TEST_ID,
  FILE_UPLOAD_HARNESS_DEFAULT_TITLE,
  FILE_UPLOAD_HARNESS_PLUS_TEST_ID,
  FILE_UPLOAD_HARNESS_ROOT_TEST_ID,
} from "../ui/FileUploadHarness";

jest.mock("../../utils/useTranslation", () => ({
  useTranslation: () => ({
    userManagement: { pending: "Pending" },
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("FileUploadHarness", () => {
  it("renders the dashed Add tile as the first grid cell", () => {
    const onAdd = jest.fn();
    const screen = render(<FileUploadHarness onAdd={onAdd} />);

    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ROOT_TEST_ID)).toBeTruthy();
    expect(screen.getByText(FILE_UPLOAD_HARNESS_DEFAULT_TITLE)).toBeTruthy();
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_PLUS_TEST_ID)).toBeTruthy();
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID).props.className).toContain("border-dashed");
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID).props.className).toContain("w-24");
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID).props.className).toContain("h-24");

    fireEvent.press(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("keeps the dashed Add tile in the first grid slot when items are attached", () => {
    const onRemove = jest.fn();
    const screen = render(
      <FileUploadHarness
        onAdd={jest.fn()}
        items={[
          {
            id: "photo-1",
            uri: "file:///photo-1.jpg",
            status: "pending",
            onRemove,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("file-upload-harness__preview_0")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID).props.className).toContain("w-24");
    expect(screen.getByTestId(FILE_UPLOAD_HARNESS_ADD_TEST_ID).props.className).toContain("h-24");

    fireEvent.press(screen.getByTestId("file-upload-harness__preview_remove_0"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
