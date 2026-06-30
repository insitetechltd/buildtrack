import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import TaskDetailScreen from "../../screens/TaskDetailScreen";
import { useTaskDetailViewAdapter } from "../../ui/viewAdapters/useTaskDetailViewAdapter";

jest.mock("../../ui/viewAdapters/useTaskDetailViewAdapter", () => ({
  useTaskDetailViewAdapter: jest.fn(),
}));

jest.mock("../../components/StandardHeader", () => ({
  __esModule: true,
  default: function MockStandardHeader(props: {
    title: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
    onBack?: () => void;
    rightElement?: React.ReactNode;
  }) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");

    return (
      <View testID="StandardHeader">
        {props.showBackButton ? (
          <Pressable testID="standardHeader-back" onPress={props.onBackPress ?? props.onBack} />
        ) : null}
        <Text>{props.title}</Text>
        {props.rightElement}
      </View>
    );
  },
}));

jest.mock("../../components/primitives/container/ContainerCard", () => ({
  __esModule: true,
  default: function MockContainerCard() {
    return null;
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("TaskDetailScreen header regression", () => {
  const mockUseTaskDetailViewAdapter = useTaskDetailViewAdapter as jest.MockedFunction<
    typeof useTaskDetailViewAdapter
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the loading header title and marker while data is unavailable", () => {
    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: false,
        },
      },
      actions: {},
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();
  });

  it("renders the loaded header title and calls the provided back callback", () => {
    const onNavigateBack = jest.fn();

    mockUseTaskDetailViewAdapter.mockReturnValue({
      output: {
        readiness: {
          hasUsableData: true,
        },
        header: {
          title: "Task Details",
        },
        banners: [],
        detailSections: [],
        assigners: [],
        assignees: [],
        activities: [],
        childTasks: [],
        actionItems: [],
      },
      actions: {
        acceptTask: jest.fn(),
        declineTask: jest.fn(),
        submitForReview: jest.fn(),
        approveTask: jest.fn(),
      },
    } as ReturnType<typeof useTaskDetailViewAdapter>);

    const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={onNavigateBack} />);

    expect(screen.getByText("Task Details")).toBeTruthy();
    expect(screen.getByText("Modern UI")).toBeTruthy();

    fireEvent.press(screen.getByTestId("standardHeader-back"));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });
});
