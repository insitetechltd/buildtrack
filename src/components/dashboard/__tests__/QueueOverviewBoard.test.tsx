import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import QueueOverviewBoard, {
  formatLaneLabel,
  shortLaneLabel,
} from "../QueueOverviewBoard";
import type { DashboardQueueDashboard } from "@/ui/contracts/viewAdapters";

const MODEL: DashboardQueueDashboard = {
  groups: [
    {
      id: "dashboard-queue:my_queue",
      title: "My Queue",
      cells: [
        {
          id: "dashboard-queue:my_queue:new",
          queue: "my_queue",
          bucket: "new",
          title: "New",
          countLabel: "0",
        },
        {
          id: "dashboard-queue:my_queue:wip",
          queue: "my_queue",
          bucket: "wip",
          title: "Doing",
          countLabel: "6",
        },
        {
          id: "dashboard-queue:my_queue:review",
          queue: "my_queue",
          bucket: "review",
          title: "Review",
          countLabel: "0",
        },
      ],
    },
    {
      id: "dashboard-queue:team_queue",
      title: "Team Queue",
      cells: [
        {
          id: "dashboard-queue:team_queue:new",
          queue: "team_queue",
          bucket: "new",
          title: "New",
          countLabel: "2",
        },
        {
          id: "dashboard-queue:team_queue:wip",
          queue: "team_queue",
          bucket: "wip",
          title: "Doing",
          countLabel: "4",
        },
        {
          id: "dashboard-queue:team_queue:review",
          queue: "team_queue",
          bucket: "review",
          title: "Review",
          countLabel: "1",
        },
      ],
    },
  ],
};

describe("QueueOverviewBoard", () => {
  it("formats short lane labels for the Queue column", () => {
    expect(formatLaneLabel("My Queue")).toBe("My\nQueue");
    expect(shortLaneLabel("My Queue")).toBe("My");
    expect(shortLaneLabel("Team Queue")).toBe("Team");
    expect(shortLaneLabel("我的佇列")).toBe("我的");
  });

  it("renders Queue | New | Doing | Review with short My/Team rows", () => {
    const { getByTestId, getByText } = render(
      <QueueOverviewBoard
        model={MODEL}
        queueColumnHeader="Queue"
        shortLaneLabels={{ my_queue: "My", team_queue: "Team" }}
        onCellPress={jest.fn()}
      />,
    );

    expect(getByTestId("dashboard-screen__queue_column_header")).toBeTruthy();
    expect(getByText("Queue")).toBeTruthy();
    expect(getByText("My")).toBeTruthy();
    expect(getByText("Team")).toBeTruthy();
    expect(getByText("New")).toBeTruthy();
    expect(getByText("Doing")).toBeTruthy();
    expect(getByText("Review")).toBeTruthy();
  });

  it("keeps queue dashboard and cell testIDs and navigates with launch params", () => {
    const onCellPress = jest.fn();
    const { getByTestId } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={onCellPress} />,
    );

    expect(getByTestId("dashboard-screen__queue_dashboard")).toBeTruthy();
    expect(getByTestId("dashboard-screen__queue_spine")).toBeTruthy();

    fireEvent.press(getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onCellPress).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });

    fireEvent.press(getByTestId("dashboard-screen__queue_cell_team_queue_review"));
    expect(onCellPress).toHaveBeenCalledWith({
      launchQueue: "team_queue",
      launchBucket: "review",
      launchSource: "activity_dashboard",
    });
  });

  it("mutes zero counts and underlines non-zero Review", () => {
    const { getByTestId, getByText } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={jest.fn()} />,
    );

    const zeroNew = getByTestId("dashboard-screen__queue_cell_my_queue_new");
    const zeroLabel = zeroNew.findByType(require("react-native").Text);
    expect(zeroLabel.props.style).toEqual(
      expect.objectContaining({ color: "#8AA3AD" }),
    );

    const reviewHot = getByTestId("dashboard-screen__queue_cell_team_queue_review");
    const reviewLabel = reviewHot.findByType(require("react-native").Text);
    expect(reviewLabel.props.style).toEqual(
      expect.objectContaining({
        color: "#0D2630",
        borderBottomWidth: 3,
        borderBottomColor: "#F59E0B",
      }),
    );

    expect(getByText("Queue Overview")).toBeTruthy();
  });

  it("uses equal count size for My and Team lanes", () => {
    const { getByTestId } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={jest.fn()} />,
    );

    const myDoing = getByTestId("dashboard-screen__queue_cell_my_queue_wip").findByType(
      require("react-native").Text,
    );
    const teamNew = getByTestId("dashboard-screen__queue_cell_team_queue_new").findByType(
      require("react-native").Text,
    );
    expect(myDoing.props.style).toEqual(expect.objectContaining({ fontSize: 30 }));
    expect(teamNew.props.style).toEqual(expect.objectContaining({ fontSize: 30 }));
  });

  it("places lane titles in a dedicated label column beside the count grid", () => {
    const { getByTestId } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={jest.fn()} />,
    );

    expect(getByTestId("dashboard-screen__queue_column_header")).toBeTruthy();
    expect(
      getByTestId("dashboard-screen__queue_lane_label_dashboard-queue:my_queue"),
    ).toBeTruthy();
    expect(
      getByTestId("dashboard-screen__queue_lane_label_dashboard-queue:team_queue"),
    ).toBeTruthy();

    const myNew = getByTestId("dashboard-screen__queue_cell_my_queue_new");
    expect(myNew.findAllByType(require("react-native").Text)).toHaveLength(1);
  });

  it("places a divider between the Queue label column and New", () => {
    const { getByTestId } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={jest.fn()} />,
    );

    const myNew = getByTestId("dashboard-screen__queue_cell_my_queue_new");
    expect(myNew.props.style).toEqual(
      expect.objectContaining({
        borderLeftWidth: 1,
        borderLeftColor: "#E7F4F8",
      }),
    );
  });

  it("exposes accessible labels including full queue name, bucket, and count", () => {
    const { getByLabelText } = render(
      <QueueOverviewBoard model={MODEL} onCellPress={jest.fn()} />,
    );

    expect(getByLabelText("My Queue, New, 0")).toBeTruthy();
    expect(getByLabelText("Team Queue, Review, 1")).toBeTruthy();
  });
});
