import React from "react";
import { render } from "@testing-library/react-native";

import TaskDetailEvidenceStrip from "../TaskDetailEvidenceStrip";

describe("TaskDetailEvidenceStrip", () => {
  it("renders task detail photos through expo-image with a stable cache key", () => {
    const model = {
      id: "stage-1",
      density: "standard" as const,
      structuralState: "stale" as const,
      stageMode: "photo" as const,
      title: "Latest task entry",
      summary: "Added evidence",
      actorLabel: "Alex",
      timestampLabel: "Now",
      photos: [
        "company-1/task-updates/update-1/photo-a.jpg",
        "https://example.com/external.jpg",
      ],
      activePhotoIndex: 0,
    };

    const screen = render(<TaskDetailEvidenceStrip model={model} />);

    expect(screen.getByTestId("task-detail__active_stage_photo_featured").props.contentFit).toBe(
      "cover",
    );
    expect(screen.getByTestId("task-detail__active_stage_photo_featured").props.cachePolicy).toBe(
      "memory-disk",
    );
    expect(screen.getByTestId("task-detail__active_stage_photo_featured").props.cacheKey).toBe(
      "company-1/task-updates/update-1/photo-a.jpg",
    );
    expect(screen.getByTestId("task-detail__active_stage_photo_1").props.cacheKey).toBe(
      "https://example.com/external.jpg",
    );
  });
});
