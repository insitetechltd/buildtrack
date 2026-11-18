import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskDetailFilesSection from "@/components/taskDetail/TaskDetailFilesSection";
import type { TaskDetailFileModel } from "@/ui/contracts/viewAdapters";

function photo(id: string): TaskDetailFileModel {
  return {
    id,
    name: `${id}.jpg`,
    uri: `https://example.com/${id}.jpg`,
    kind: "image",
  };
}

function layoutStrip(screen: ReturnType<typeof render>) {
  fireEvent(screen.getByTestId("task-detail__files__strip"), "layout", {
    nativeEvent: { layout: { width: 328, height: 80 } },
  });
}

describe("TaskDetailFilesSection", () => {
  it("hides both sections when there is nothing to show", () => {
    const screen = render(
      <TaskDetailFilesSection photosTitle="Photos" filesTitle="Files" files={[]} />,
    );
    expect(screen.queryByTestId("task-detail__files__photos")).toBeNull();
    expect(screen.queryByTestId("task-detail__files__documents")).toBeNull();
  });

  it("shows four photo slots and opens the catalog from +N without photo names", () => {
    const screen = render(
      <TaskDetailFilesSection
        photosTitle="Photos"
        filesTitle="Files"
        files={[photo("a"), photo("b"), photo("c"), photo("d"), photo("e"), photo("f")]}
      />,
    );

    layoutStrip(screen);

    expect(screen.getByText("Photos")).toBeTruthy();
    expect(screen.queryByText("a.jpg")).toBeNull();
    expect(screen.getByTestId("task-detail__files__photo-a")).toBeTruthy();
    expect(screen.getByTestId("task-detail__files__photo-c")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__files__photo-d")).toBeNull();
    expect(screen.getByTestId("task-detail__files__more")).toHaveTextContent("+3");
    expect(screen.queryByTestId("task-detail__files__documents")).toBeNull();

    fireEvent.press(screen.getByTestId("task-detail__files__more"));

    expect(screen.getByTestId("task-detail__files__catalog")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__files__more")).toBeNull();
    expect(screen.getByTestId("task-detail__files__photo-f")).toBeTruthy();
  });

  it("keeps documents in Files and out of the photo strip", () => {
    const screen = render(
      <TaskDetailFilesSection
        photosTitle="Photos"
        filesTitle="Files"
        files={[
          photo("site"),
          {
            id: "spec",
            name: "spec.pdf",
            uri: "https://example.com/spec.pdf",
            kind: "pdf",
          },
        ]}
      />,
    );

    layoutStrip(screen);

    expect(screen.queryByText("site.jpg")).toBeNull();
    expect(screen.getByTestId("task-detail__files__photo-site")).toBeTruthy();
    expect(screen.queryByTestId("task-detail__files__more")).toBeNull();
    expect(screen.getByText("Files")).toBeTruthy();
    expect(screen.getByText("spec.pdf")).toBeTruthy();
  });
});
