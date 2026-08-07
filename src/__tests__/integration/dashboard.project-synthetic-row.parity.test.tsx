import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ActivityStyleRowCard from "../../components/cards/ActivityStyleRowCard";

const SYNTHETIC_ROW_TEST_ID = "dashboard-synthetic-project:test-proj-123";
const PHOTOS_COUNT = 7;
const HEADLINE = `${PHOTOS_COUNT} photos captured`;
const SUBTITLE = "Synthetic batch aggregated from device cache";
const BADGE = "Saved to project";
const META = "Just now";

const NAV_PRESS_MOCK = jest.fn();

describe("Da: Synthetic project:* row - disabled plumbing", () => {
  beforeEach(() => {
    NAV_PRESS_MOCK.mockClear();
  });

  test("Da.1 disabled=true → Pressable respects disabled (onPress NOT called via fireEvent.press)", () => {
    const { getByTestId } = render(
      <ActivityStyleRowCard
        testID={SYNTHETIC_ROW_TEST_ID}
        title={HEADLINE}
        subtitle={SUBTITLE}
        metaLabel={META}
        badgeLabel={BADGE}
        onPress={NAV_PRESS_MOCK}
        disabled={true}
      />,
    );

    const row = getByTestId(SYNTHETIC_ROW_TEST_ID);
    expect(row).toBeTruthy();
    fireEvent.press(row);
    expect(NAV_PRESS_MOCK).toHaveBeenCalledTimes(0);
  });

  test("Da.2 disabled=false → Pressable enables onPress (fireEvent calls handler 1x)", () => {
    const { getByTestId } = render(
      <ActivityStyleRowCard
        testID="normal-task-456"
        title="Install wall framing"
        subtitle="Main building 2nd floor"
        metaLabel="Due today"
        badgeLabel="In progress"
        onPress={NAV_PRESS_MOCK}
        disabled={false}
      />,
    );

    const row = getByTestId("normal-task-456");
    expect(row).toBeTruthy();
    fireEvent.press(row);
    expect(NAV_PRESS_MOCK).toHaveBeenCalledTimes(1);
  });
});

describe("Db: Pressing disabled synthetic row does NOT fire navigation", () => {
  beforeEach(() => {
    NAV_PRESS_MOCK.mockClear();
  });

  test("Db.1 fireEvent.press on disabled row → onPress 0 invocations", () => {
    const { getByTestId } = render(
      <ActivityStyleRowCard
        testID={SYNTHETIC_ROW_TEST_ID}
        title={HEADLINE}
        subtitle={SUBTITLE}
        metaLabel={META}
        badgeLabel={BADGE}
        onPress={NAV_PRESS_MOCK}
        disabled={true}
      />,
    );

    fireEvent.press(getByTestId(SYNTHETIC_ROW_TEST_ID));
    expect(NAV_PRESS_MOCK).toHaveBeenCalledTimes(0);
  });

  test("Db.2 fireEvent.press on enabled row → onPress called 1x (sanity control)", () => {
    const { getByTestId } = render(
      <ActivityStyleRowCard
        testID="enabled-row-789"
        title="Enabled row sanity"
        subtitle="Clickable"
        metaLabel="Now"
        badgeLabel="Active"
        onPress={NAV_PRESS_MOCK}
        disabled={false}
      />,
    );

    fireEvent.press(getByTestId("enabled-row-789"));
    expect(NAV_PRESS_MOCK).toHaveBeenCalledTimes(1);
  });
});

describe("Dc: Synthetic row text/badge rendering matches project-batch contract", () => {
  test("Dc.1 headline renders `${N} photos captured`", () => {
    const { getByText } = render(
      <ActivityStyleRowCard
        testID={SYNTHETIC_ROW_TEST_ID}
        title={HEADLINE}
        subtitle={SUBTITLE}
        metaLabel={META}
        badgeLabel={BADGE}
        onPress={NAV_PRESS_MOCK}
        disabled={true}
      />,
    );

    expect(getByText(`${PHOTOS_COUNT} photos captured`)).toBeTruthy();
  });

  test("Dc.2 badge 'Saved to project' renders", () => {
    const { getByText } = render(
      <ActivityStyleRowCard
        testID={SYNTHETIC_ROW_TEST_ID}
        title={HEADLINE}
        subtitle={SUBTITLE}
        metaLabel={META}
        badgeLabel={BADGE}
        onPress={NAV_PRESS_MOCK}
        disabled={true}
      />,
    );

    expect(getByText("Saved to project")).toBeTruthy();
  });
});
