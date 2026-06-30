jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = require('react-native');
  return (props) => <View {...props} testID="MockModal" />;
});


jest.mock('react/jsx-runtime', () => {
  const original = jest.requireActual('react/jsx-runtime');
  return {
    ...original,
    jsx: (type, ...args) => {
      if (type === undefined) console.error('UNDEFINED JSX ELEMENT DETECTED!', args);
      return original.jsx(type, ...args);
    },
    jsxs: (type, ...args) => {
      if (type === undefined) console.error('UNDEFINED JSXS ELEMENT DETECTED!', args);
      return original.jsxs(type, ...args);
    }
  };
});

import React from 'react';

const originalCreateElement = React.createElement;
React.createElement = function (type, ...args) {
  if (type === undefined) {
    console.error('UNDEFINED ELEMENT DETECTED! args:', args);
  }
  return originalCreateElement(type, ...args);
};

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CreateTaskScreen from '../../screens/CreateTaskScreen';
import { NavigationContainer } from '@react-navigation/native';

const mockUseTaskStore = jest.fn();
const mockCreateTask = jest.fn();
const mockCreateSubTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockGetProjectsByUser = jest.fn();
const mockGetProjectUserAssignments = jest.fn();
const mockFetchProjectUserAssignments = jest.fn();
const mockShowPhotoSelectionDialog = jest.fn();
const mockNavigate = jest.fn();
let mockSelectedProjectId: string | null = null;

// Mock dependencies
jest.mock('../../state/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', companyId: 'test-company', name: 'Test User' }
  })
}));

jest.mock('../../state/companyStore', () => ({
  useCompanyStore: () => ({
    getCompanyBanner: () => null,
  }),
}));

jest.mock('../../state/themeStore', () => ({
  useThemeStore: () => ({
    isDarkMode: false,
  }),
}));

jest.mock('../../state/taskStore.supabase', () => ({
  useTaskStore: (selector?: (state: ReturnType<typeof mockUseTaskStore>) => unknown) => {
    const state = mockUseTaskStore();
    return typeof selector === 'function' ? selector(state) : state;
  }
}));

jest.mock('../../state/userStore.supabase', () => ({
  useUserStoreWithInit: () => ({
    getUsersByRole: () => [],
    getAllUsers: () => [],
  }),
  useUserStore: () => ({
    getAllUsers: () => []
  }),
}));

jest.mock('../../state/projectStore.supabase', () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectsByUser: mockGetProjectsByUser,
    getProjectUserAssignments: mockGetProjectUserAssignments,
    fetchProjectUserAssignments: mockFetchProjectUserAssignments,
  })
}));

jest.mock('../../state/projectFilterStore', () => ({
  useProjectFilterStore: (selector: (state: { selectedProjectId: string | null }) => unknown) =>
    selector({ selectedProjectId: mockSelectedProjectId }),
}));

jest.mock('../../utils/useTranslation', () => ({
  useTranslation: () => ({
    tasks: { createTask: 'Create Task', title: 'Title', description: 'Description' },
    userManagement: { pending: 'Pending' },
    createTask: { 
      textInput: 'Input', 
      textInputPlaceholder: 'Text',
      nestedUnder: 'Nested under:',
      subTaskOf: 'Sub-task of:',
      editTask: 'Edit Task',
      createSubTask: 'Create Sub-Task',
      nestedSubTask: 'Nested Sub-Task',
      createNewTask: 'Create New Task',
      createTaskButton: 'Create Task',
      updateTaskButton: 'Update Task',
      creating: 'Creating...',
      updating: 'Updating...',
      filesAdded: (count: number) => `${count} file(s) added`,
      usersAvailable: () => 'Users Available',
      usersSelected: () => 'Users Selected',
       selectUsersToAssign: 'Select Users',
       doneSelected: () => 'Done',
       assigneesLocked: 'Assignees cannot be changed (task accepted)'
     },
      taskDetail: {
        editReasonTitle: 'Edit Reason',
        editReasonSubtitle: 'Why',
        editReasonPlaceholder: 'Reason',
        submitReason: 'Submit',
        cancel: 'Cancel'
      },
      common: { done: 'Done', selected: 'Selected', save: 'Save', cancel: 'Cancel' }
  })
}));

jest.mock('../../utils/dateFormatter', () => ({
  useDateFormatter: () => ({
    formatDateWithWeekday: (d: Date) => 'Today',
    locale: 'en'
  })
}));

jest.mock('../../utils/usePhotoSelection', () => ({
  usePhotoSelection: () => ({
    showPhotoSelectionDialog: mockShowPhotoSelectionDialog,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (props: any) => <View testID="Ionicons" {...props} /> };
});

jest.mock('../../components/ModalHandle', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="ModalHandle" {...props} /> };
});
jest.mock('../../components/ReassignTaskModal', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="ReassignTaskModal" {...props} /> };
});
jest.mock('expo-status-bar', () => {
  const { View } = require('react-native');
  return { StatusBar: (props: any) => <View testID="StatusBar" {...props} /> };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: (props: any) => <View testID="SafeAreaView" {...props} />,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="DateTimePicker" {...props} /> };
});
jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="Slider" {...props} /> };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn((cb) => cb()),
  NavigationContainer: ({ children }: any) => <>{children}</>
}));

jest.mock('../../components/ProfileMenu', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="ProfileMenu" {...props} /> };
});

jest.mock('../../api/supabase', () => ({
  checkSupabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../utils/environmentDetector', () => ({
  detectEnvironment: () => ({ mode: 'test' }),
  getEnvironmentStyles: () => ({}),
}));

describe('CreateTaskScreen Integration', () => {
  beforeEach(() => {
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      createTask: jest.fn(),
      createSubTask: jest.fn(),
      updateTask: jest.fn(),
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
    });
    mockCreateTask.mockResolvedValue('task-1');
    mockCreateSubTask.mockResolvedValue('subtask-1');
    mockUpdateTask.mockResolvedValue(undefined);
    mockSelectedProjectId = 'project-1';
    mockGetProjectsByUser.mockReturnValue([
      { id: 'project-1', name: 'Project Alpha', location: 'Tower A' },
    ]);
    mockGetProjectUserAssignments.mockReturnValue([]);
    mockFetchProjectUserAssignments.mockResolvedValue(undefined);
    mockShowPhotoSelectionDialog.mockReset();
    mockNavigate.mockReset();
  });

  it('renders correctly with adapter bindings', () => {
    console.log('CreateTaskScreen is:', CreateTaskScreen);
    console.log('NavigationContainer is:', NavigationContainer);
    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );
    
    // The screen should mount and show the title input
    expect(getByTestId('createTask-title')).toBeTruthy();
    expect(getByTestId('createTask-description')).toBeTruthy();
  });

  it('renders the create-mode header title and marker and wires the visible back button', () => {
    const onNavigateBack = jest.fn();

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} />
      </NavigationContainer>
    );

    expect(getByText('Create New Task')).toBeTruthy();
    expect(getByText('Modern UI')).toBeTruthy();

    fireEvent.press(getByTestId('modernHeader-back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('renders the update action header title and marker without a visible back button', () => {
    const { getByText, queryByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
      </NavigationContainer>
    );

    expect(getByText('Update Progress')).toBeTruthy();
    expect(getByText('Modern UI')).toBeTruthy();
    expect(queryByTestId('modernHeader-back')).toBeNull();
  });

  it('locks assignee editing for submitted-for-review tasks using status without legacy accepted', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Submitted task',
          description: 'Ready for review',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'submitted_for_review',
          completionPercentage: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: jest.fn(),
      createSubTask: jest.fn(),
      updateTask: jest.fn(),
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
    });

    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" />
      </NavigationContainer>
    );

    expect(getByText('Assignees cannot be changed (task accepted)')).toBeTruthy();
  });

  it('does not render assignee removal controls when assignees are locked', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Submitted task',
          description: 'Ready for review',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'submitted_for_review',
          completionPercentage: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: jest.fn(),
      createSubTask: jest.fn(),
      updateTask: jest.fn(),
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
    });

    const { getAllByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" />
      </NavigationContainer>
    );

    expect(
      getAllByTestId('Ionicons').filter((icon) => icon.props.name === 'close-circle')
    ).toHaveLength(0);
  });

  it('renders the parent banner for nested subtask creation', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-parent',
          projectId: 'project-1',
          title: 'Parent task',
          description: 'Parent',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'new',
          completionPercentage: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'task-child',
          projectId: 'project-1',
          title: 'Nested child',
          description: 'Child',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'new',
          completionPercentage: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          parentTaskId: 'task-parent',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
    });

    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          parentTaskId="task-parent"
          parentSubTaskId="task-child"
        />
      </NavigationContainer>
    );

    expect(getByText('Nested under:')).toBeTruthy();
    expect(getByText('Nested child')).toBeTruthy();
  });

  it('submits create mode and navigates back after a valid task creation', async () => {
    const onNavigateBack = jest.fn();

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} />
      </NavigationContainer>
    );

    fireEvent.changeText(getByTestId('createTask-title'), 'Install guard rails');
    fireEvent.changeText(getByTestId('createTask-description'), 'Complete level 2 edge protection');
    fireEvent.press(getByTestId('createTask-submit'));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Install guard rails',
          description: 'Complete level 2 edge protection',
        }),
      );
    });

    expect(onNavigateBack).toHaveBeenCalled();
  });

  it('submits edit mode and navigates back after a valid task update', async () => {
    const onNavigateBack = jest.fn();

    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Existing task',
          description: 'Existing description',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'new',
          completionPercentage: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} editTaskId="task-1" />
      </NavigationContainer>
    );

    fireEvent.changeText(getByTestId('createTask-title'), 'Existing task updated');
    fireEvent.press(getByTestId('createTask-submit'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Existing task updated',
        }),
      );
    });

    expect(onNavigateBack).toHaveBeenCalled();
  });

  it('does not navigate away when create submission fails validation', async () => {
    const onNavigateBack = jest.fn();
    mockCreateTask.mockClear();

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId('createTask-submit'));

    await waitFor(() => {
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    expect(onNavigateBack).not.toHaveBeenCalled();
  });

  it('requires an edit reason before submitting locked-status edits', async () => {
    const onNavigateBack = jest.fn();
    mockUpdateTask.mockClear();

    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Submitted task',
          description: 'Ready for review',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'submitted_for_review',
          completionPercentage: 100,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addAssignerComment: jest.fn(),
    });

    const { getByPlaceholderText, getByTestId, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} editTaskId="task-1" />
      </NavigationContainer>
    );

    fireEvent.changeText(getByTestId('createTask-title'), 'Submitted task updated');
    fireEvent.press(getByTestId('createTask-submit'));

    await waitFor(() => {
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    expect(onNavigateBack).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText('Reason'), 'Clarified scope');
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Submitted task updated',
          _editReason: 'Clarified scope',
        }),
      );
    });

    expect(onNavigateBack).toHaveBeenCalled();
  });

  it('opens the create-task photo selection flow from the attachment CTA', async () => {
    mockShowPhotoSelectionDialog.mockResolvedValue(undefined);

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    fireEvent.press(getByTestId('createTask-add-photos'));

    await waitFor(() => {
      expect(mockShowPhotoSelectionDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          allowClipboard: true,
          allowMultiple: true,
          onPhotosSelected: expect.any(Function),
        }),
      );
    });
  });

  it('renders translated attachment state for pending selected photos', () => {
    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          selectedPhotos={[
            {
              uri: 'file:///photo-1.jpg',
              fileName: 'photo-1.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('(1 file(s) added)')).toBeTruthy();
  });
});
