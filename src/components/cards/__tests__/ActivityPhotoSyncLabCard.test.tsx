import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ActivityPhotoSyncLabCard from "../ActivityPhotoSyncLabCard";

describe("ActivityPhotoSyncLabCard (Phase 2 Option A lab)", () => {
  const events = [
    {
      id: "e1",
      action: "Rejected",
      actorLabel: "Sara",
      timestampLabel: "8:20 AM",
      dotTone: "negative" as const,
      photoUris: ["https://example.com/a.jpg"],
    },
    {
      id: "e2",
      action: "Submitted",
      actorLabel: "Bob",
      timestampLabel: "7:55 AM",
      dotTone: "caution" as const,
      photoUris: ["https://example.com/b.jpg"],
    },
    {
      id: "e3",
      action: "Progress",
      actorLabel: "Bob",
      timestampLabel: "7:10 AM",
      dotTone: "caution" as const,
      photoUris: ["https://example.com/c.jpg"],
    },
    {
      id: "e4",
      action: "Accepted",
      actorLabel: "Bob",
      timestampLabel: "4:02 PM",
      dotTone: "positive" as const,
    },
    {
      id: "e5",
      action: "Created",
      actorLabel: "Sam",
      timestampLabel: "3:40 PM",
      dotTone: "info" as const,
    },
  ];

  it("builds visible-only gallery and expands to include more photos", () => {
    const screen = render(
      <ActivityPhotoSyncLabCard
        testID="lab"
        taskTitle="Door punch"
        events={events}
      />,
    );

    // Collapsed: latest + 2 priors with photos → 1 + 1 + 1 = 3 slides hint
    expect(screen.getByTestId("lab:active-event-hint")).toHaveTextContent(
      "Photo 1/3 · event e1",
    );
    expect(screen.getByTestId("lab:expand-earlier")).toBeTruthy();

    fireEvent.press(screen.getByTestId("lab:expand-earlier"));
    // Still 3 photo events (e4/e5 have none) — gallery size unchanged but collapse appears
    expect(screen.getByTestId("lab:collapse-earlier")).toBeTruthy();
    expect(screen.getByTestId("lab:meta-column").props.style).toEqual(
      expect.objectContaining({ width: 140 }),
    );
  });
});
