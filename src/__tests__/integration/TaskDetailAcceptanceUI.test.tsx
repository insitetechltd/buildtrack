import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TaskDetailScreen from "../../../src/screens/TaskDetailScreen";

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    getState: () => ({ routes: [] }),
    getParent: () => ({ navigate: jest.fn() })
  }),
  useFocusEffect: jest.fn(),
}));

// Mock stores
jest.mock("../../../src/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("../../../src/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("../../../src/state/userStore.supabase", () => ({
  useUserStore: () => ({
    getUserById: jest.fn((id) => ({ id, name: `User ${id}` })),
    getAllUsers: jest.fn(() => []),
  }),
}));

jest.mock("../../../src/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectUserAssignments: jest.fn(() => []),
  }),
}));

jest.mock("../../../src/state/companyStore", () => ({
  useCompanyStore: () => ({
    getCompanyBanner: jest.fn(),
  }),
}));

jest.mock("../../../src/state/userPreferencesStore", () => ({
  useUserPreferencesStore: () => ({
    isFavoriteUser: jest.fn(),
    toggleFavoriteUser: jest.fn(),
  }),
}));

jest.mock("../../../src/utils/useFileUpload", () => ({
  useFileUpload: () => ({
    pickAndUploadImages: jest.fn(),
    isUploading: false,
    uploadProgress: 0,
    isCompressing: false,
    compressionProgress: 0,
  }),
}));

jest.mock("../../../src/state/uploadFailureStore", () => ({
  useUploadFailureStore: () => ({
    getFailuresForTask: jest.fn(() => []),
    dismissFailure: jest.fn(),
    incrementRetryCount: jest.fn(),
  }),
}));

jest.mock("../../../src/utils/useTranslation", () => ({
  useTranslation: () => ({
    common: { back: "Back", cancel: "Cancel", yes: "Yes", no: "No", ok: "OK" },
    tasks: { taskDetails: "Task Details", noTasks: "No tasks", dueDate: "Due Date" },
    taskDetail: {
      accept: "Accept",
      decline: "Decline",
      acceptTask: "Accept Task",
      declineTask: "Decline Task",
      updateTask: "Update Progress",
      photosUpdates: "Photos & Updates",
      assignedTo: "Assigned To",
      assignedBy: "Assigned By",
      due: "Due",
      noAssignees: "No assignees",
      editTaskDetails: "Edit Task Details",
      completionAccepted: "Completion Accepted",
      acceptCompletionConfirm: "Approve Completion?",
      taskApproved: "Task Approved",
      taskDeclined: "Task Declined",
      taskRejected: "Task Rejected",
      submittedForReview: "Submitted for Review",
      updates: "Updates",
      noUpdates: "No updates",
    },
    errors: { success: "Success", error: "Error" },
    dashboard: { overdue: "Overdue" },
    projects: { unknown: "Unknown" },
    phrases: { users: "users" }
  }),
}));

jest.mock("../../../src/utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDateShort: jest.fn(() => "Oct 10, 2026"),
  }),
}));

jest.mock("../../../src/utils/usePhotoSelection", () => ({
  usePhotoSelection: () => ({
    showPhotoSelectionDialog: jest.fn(),
  }),
}));

// Mock third-party components that might cause issues in testing
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("react-native-modal", () => ({ children }: any) => children);

// Mock child components that rely on unmocked deep translation paths
jest.mock("../../../src/components/StandardHeader", () => {
  return function MockStandardHeader() {
    return <></>;
  };
});

jest.mock("../../../src/components/TaskDetailUtilityFAB", () => {
  return function MockTaskDetailUtilityFAB() {
    return <></>;
  };
});

jest.mock("../../../src/components/TaskCard", () => {
  return function MockTaskCard() {
    return <></>;
  };
});

import { useAuthStore } from "../../../src/state/authStore";
import { useTaskStore } from "../../../src/state/taskStore.supabase";

describe("TaskDetailScreen Acceptance UI Regression", () => {
  const mockOnNavigateBack = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupTaskStoreMock = (taskData: any) => {
    (useTaskStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        tasks: [taskData],
        fetchTaskById: jest.fn().mockResolvedValue(undefined),
        fetchTasks: jest.fn().mockResolvedValue(undefined),
        markTaskAsRead: jest.fn().mockResolvedValue(undefined),
        acceptTask: jest.fn().mockResolvedValue(undefined),
        declineTask: jest.fn().mockResolvedValue(undefined),
        acceptTaskCompletion: jest.fn().mockResolvedValue(undefined),
        rejectTaskCompletion: jest.fn().mockResolvedValue(undefined),
        submitTaskForReview: jest.fn().mockResolvedValue(undefined),
      };
      return selector ? selector(state) : state;
    });
  };

  it("shows Accept/Decline buttons when user is assignee and task is 'new'", () => {
    const userId = "user-123";
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: userId, name: "Test User", companyId: "comp-1" } });
    
    setupTaskStoreMock({
      id: "task-1",
      title: "Test Task",
      status: "new",
      assignedTo: [userId], // User is assigned
      assignedBy: "other-user", // User is NOT the creator
      completionPercentage: 0,
      activities: [],
      updates: [],
      dueDate: new Date().toISOString(),
    });

    const { getByText, queryByText } = render(
      <TaskDetailScreen taskId="task-1" onNavigateBack={mockOnNavigateBack} />
    );

    // Expect Accept and Decline to be visible
    expect(getByText("Accept")).toBeTruthy();
    expect(getByText("Decline")).toBeTruthy();
    
    // Expect Approve/Reject to NOT be visible
    expect(queryByText("Approve")).toBeNull();
    expect(queryByText("Reject")).toBeNull();
  });

  it("handles string vs number type mismatch for user IDs gracefully (Regression Fix)", () => {
    const userId = "12345"; // String ID in Auth
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: userId, name: "Test User", companyId: "comp-1" } });
    
    setupTaskStoreMock({
      id: "task-2",
      title: "Test Task 2",
      status: "new",
      assignedTo: [12345], // Number ID in Task (mismatch)
      assignedBy: "other-user",
      completionPercentage: 0,
      activities: [],
      updates: [],
      dueDate: new Date().toISOString(),
    });

    const { getByText } = render(
      <TaskDetailScreen taskId="task-2" onNavigateBack={mockOnNavigateBack} />
    );

    // Should STILL show Accept/Decline because of the `String(id) === String(user.id)` fix
    expect(getByText("Accept")).toBeTruthy();
    expect(getByText("Decline")).toBeTruthy();
  });

  it("hides Accept/Decline buttons once the task is accepted", () => {
    const userId = "user-123";
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: userId, name: "Test User", companyId: "comp-1" } });
    
    setupTaskStoreMock({
      id: "task-3",
      title: "Test Task 3",
      status: "in_progress", // Already accepted
      assignedTo: [userId],
      assignedBy: "other-user",
      completionPercentage: 10,
      activities: [],
      updates: [],
      dueDate: new Date().toISOString(),
    });

    const { queryByText, getByText } = render(
      <TaskDetailScreen taskId="task-3" onNavigateBack={mockOnNavigateBack} />
    );

    // Accept/Decline should be hidden
    expect(queryByText("Accept")).toBeNull();
    expect(queryByText("Decline")).toBeNull();
    
    // Should show Update Progress instead
    expect(getByText("Update Progress")).toBeTruthy();
  });

  it("shows Approve/Reject buttons when user is creator and task is 100% submitted for review", () => {
    const userId = "creator-123";
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: userId, name: "Test Creator", companyId: "comp-1" } });
    
    setupTaskStoreMock({
      id: "task-4",
      title: "Test Task 4",
      status: "submitted_for_review",
      assignedTo: ["other-user"], // Someone else is assigned
      assignedBy: userId, // User IS the creator
      completionPercentage: 100, // Fully complete
      activities: [],
      updates: [],
      dueDate: new Date().toISOString(),
    });

    const { getByText, queryByText } = render(
      <TaskDetailScreen taskId="task-4" onNavigateBack={mockOnNavigateBack} />
    );

    // Expect Approve and Reject to be visible
    expect(getByText("Approve")).toBeTruthy();
    expect(getByText("Reject")).toBeTruthy();
    
    // Expect Accept/Decline to NOT be visible
    expect(queryByText("Accept")).toBeNull();
    expect(queryByText("Decline")).toBeNull();
  });
});
