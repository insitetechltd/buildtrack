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
import { Alert } from 'react-native';

const originalCreateElement = React.createElement;
React.createElement = function (type, ...args) {
  if (type === undefined) {
    console.error('UNDEFINED ELEMENT DETECTED! args:', args);
  }
  return originalCreateElement(type, ...args);
};

import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
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
const mockAddTaskUpdate = jest.fn();
const mockAddSubTaskUpdate = jest.fn();
const mockAddAssignerComment = jest.fn();
const mockUploadFileWithVerification = jest.fn();
const mockFetchProjectLocations = jest.fn();
const mockEnsureProjectLocation = jest.fn();
let mockSelectedProjectId: string | null = null;
let mockIsAdmin = false;

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
    tasks: {
      createTask: 'Create Task',
      title: 'Title',
      description: 'Description',
      priority: 'Priority',
      dueDate: 'Due Date',
      category: 'Category',
      assignTo: 'Assign To',
    },
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
      headerCreateSubtitle: 'Field workflow',
      headerEditSubtitle: 'Task editor localized',
      createTaskButton: 'Create Task',
      updateTaskButton: 'Update Task',
      taskBasicsTitle: 'Task Basics',
      taskBasicsSubtitle: 'Start with the essentials',
      scheduleTitle: 'Schedule',
      scheduleSubtitle: 'Set the target date',
      moreDetailsTitle: 'More Details',
      moreDetailsSubtitle: 'Optional context for downstream work',
      locationOnSite: 'Location on Site',
      selectLocationOnSite: 'Select a location on site',
      addNewLocation: 'Add new location',
      addNewLocationPlaceholder: 'Enter a new location on site',
      saveNewLocation: 'Save location',
      changeLocation: 'Change location',
      selectLocationOnSiteFirstProject: 'Select a project to add a location on site',
      creating: 'Creating...',
      updating: 'Updating...',
      taskCreated: 'Task Created',
      subTaskCreated: 'Sub-Task Created',
      nestedSubTaskCreatedSuccess: 'Nested sub-task created successfully and assigned to the selected users.',
      subTaskCreatedSuccess: 'Sub-task created successfully and assigned to the selected users.',
      taskCreatedSuccess: 'Task created successfully and assigned to the selected users.',
      attachments: 'Attachments',
      tapToAddFiles: 'Tap to add files',
      filesAdded: (count: number) => `${count} file(s) added`,
      usersAvailable: () => 'Users Available',
      usersSelected: () => 'Users Selected',
       selectUsersToAssign: 'Select Users',
       doneSelected: () => 'Done',
       assigneesLocked: 'Assignees cannot be changed (task accepted)',
       adminCannotCreateTasks: 'Administrator accounts cannot create or be assigned tasks. This function is reserved for managers and workers.'
     },
      taskDetail: {
        editReasonTitle: 'Edit Reason',
        editReasonSubtitle: 'Why',
        editReasonPlaceholder: 'Reason',
        progressUpdate: 'Update Progress',
        photosAndFiles: 'Photos and Files',
        tapToAddFiles: 'Tap to add files',
        updateDescription: 'Update Description',
        updateDescriptionPlaceholder: 'Describe progress',
        completionPercentage: 'Completion Percentage',
        submitUpdate: 'Submit Update',
        submitReason: 'Submit',
        cancel: 'Cancel'
      },
      common: { done: 'Done', selected: 'Selected', save: 'Save', cancel: 'Cancel', ok: 'OK' }
  })
}));

jest.mock('../../types/buildtrack', () => {
  const actual = jest.requireActual('../../types/buildtrack');

  return {
    ...actual,
    isAdmin: () => mockIsAdmin,
  };
});

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
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
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

const mockNavigationDispatch = jest.fn();
const mockNavigationAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setParams: jest.fn(),
    dispatch: mockNavigationDispatch,
    addListener: mockNavigationAddListener,
  }),
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

jest.mock('../../api/fileUploadService', () => ({
  uploadFileWithVerification: (...args: unknown[]) => mockUploadFileWithVerification(...args),
}));

jest.mock('../../utils/environmentDetector', () => ({
  detectEnvironment: () => ({ mode: 'test' }),
  getEnvironmentStyles: () => ({}),
}));

describe('CreateTaskScreen Integration', () => {
  beforeEach(() => {
    mockIsAdmin = false;
    mockShowPhotoSelectionDialog.mockReset();
    mockNavigate.mockReset();
    mockAddTaskUpdate.mockReset();
    mockAddSubTaskUpdate.mockReset();
    mockAddAssignerComment.mockReset();
    mockUploadFileWithVerification.mockReset();
    mockFetchProjectLocations.mockReset();
    mockEnsureProjectLocation.mockReset();
    mockNavigationDispatch.mockReset();
    mockNavigationAddListener.mockReset();
    mockNavigationAddListener.mockReturnValue(jest.fn(() => jest.fn()));
    let persistedProjectLocations: string[] = [];
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      createTask: jest.fn(),
      createSubTask: jest.fn(),
      updateTask: jest.fn(),
      fetchTaskById: jest.fn(),
      fetchProjectLocations: mockFetchProjectLocations.mockImplementation(async () =>
        persistedProjectLocations.map((label, index) => ({
          id: `location-${index + 1}`,
          projectId: 'project-1',
          label,
        })),
      ),
      ensureProjectLocation: mockEnsureProjectLocation.mockImplementation(async (_projectId, label) => {
        const normalizedLabel = String(label).replace(/\s+/g, ' ').trim();
        if (normalizedLabel && !persistedProjectLocations.includes(normalizedLabel)) {
          persistedProjectLocations = [...persistedProjectLocations, normalizedLabel];
        }
      }),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
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

  it('renders the create-mode header title and workspace menu trigger and wires the visible back button', () => {
    const onNavigateBack = jest.fn();

    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} />
      </NavigationContainer>
    );

    expect(getByText('Create New Task')).toBeTruthy();
    expect(getByTestId('app-screen-header__profile-trigger')).toBeTruthy();

    fireEvent.press(getByTestId('app-screen-header__back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('localizes the branded create-task header subtitle from translations', () => {
    const { getByText, queryByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(getByText('Field workflow')).toBeTruthy();
    expect(queryByText('Create task')).toBeNull();
  });

  it('renders the update action header title and workspace menu trigger and wires the visible back button', () => {
    const onNavigateBack = jest.fn();
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} editTaskId="task-1" actionType="update" />
      </NavigationContainer>
    );

    expect(getByText('Update Progress')).toBeTruthy();
    expect(getByTestId('app-screen-header__profile-trigger')).toBeTruthy();

    fireEvent.press(getByTestId('app-screen-header__back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the update action screen stable when the task loads after the first render', () => {
    const taskStoreState = {
      tasks: [],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    };

    mockUseTaskStore.mockImplementation(() => taskStoreState);

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
      </NavigationContainer>
    );

    expect(screen.getByText('Loading task...')).toBeTruthy();

    taskStoreState.tasks = [
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
        status: 'in_progress',
        completionPercentage: 25,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    screen.rerender(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
      </NavigationContainer>
    );

    expect(screen.getByPlaceholderText('Describe progress')).toBeTruthy();
    expect(screen.queryByText('Loading task...')).toBeNull();
  });

  it('renders the create task form as one continuous sheet with simplified section chrome', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    const renderedTree = JSON.stringify(screen.toJSON());
    expect(screen.getByTestId('create-task__continuous_form')).toBeTruthy();
    expect(renderedTree.indexOf('create-task__attachments_section')).toBeGreaterThan(-1);
    expect(renderedTree.indexOf('create-task__attachments_section')).toBeLessThan(
      renderedTree.indexOf('createTask-title'),
    );
    expect(screen.queryByText('Task Basics')).toBeNull();
    expect(screen.getByText(/Assign To/)).toBeTruthy();
    expect(screen.getByText('Location on Site')).toBeTruthy();
    expect(screen.queryByText('Project')).toBeNull();
    expect(screen.queryByText('Assignment')).toBeNull();
    expect(screen.queryByText('Schedule')).toBeNull();
    expect(screen.queryByText('More Details')).toBeNull();
    expect(screen.queryByText('Attachments')).toBeNull();
    expect(screen.getByText('Add photos / files')).toBeTruthy();
  });

  it('uses a shared field stack spacing rule instead of per-field bottom margins', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__field-stack').props.className).toContain('gap-4');
    expect(
      screen
        .getAllByTestId('create-task__input-field')
        .every((field) => !(field.props.className || '').includes('mb-4'))
    ).toBe(true);
  });

  it('opens and closes the due date picker from the flattened form trigger', async () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.queryByTestId('DateTimePicker')).toBeNull();

    fireEvent.press(screen.getByTestId('create-task__due-date-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('DateTimePicker')).toBeTruthy();
    });

    fireEvent(
      screen.getByTestId('DateTimePicker'),
      'onChange',
      { type: 'set' },
      new Date('2099-02-01T00:00:00.000Z')
    );

    fireEvent.press(screen.getByTestId('create-task__due-date-done'));

    await waitFor(() => {
      expect(screen.queryByTestId('DateTimePicker')).toBeNull();
    });
  });

  it('renders a top attachment CTA with a single larger plus icon inside the continuous form', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.getByTestId('createTask-add-photos').props.className).toContain('py-5');
    expect(screen.getByTestId('create-task__attachments_cta_plus_icon').props.className).toContain('border-2');
    expect(screen.queryByText('Tap to add files')).toBeNull();
  });

  it('renders an inline thumbnail-sized CTA when photos are already attached', () => {
    const screen = render(
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

    const inlineCta = screen.getByTestId('createTask-add-photos');
    expect(inlineCta.props.className).toContain('w-24');
    expect(inlineCta.props.className).toContain('h-24');
    expect(inlineCta.props.className).not.toContain('py-5');
    expect(screen.queryByTestId('create-task__attachments_cta_plus_icon')).toBeNull();
  });

  it('renders the submit action inline below attachments instead of using the old bottom action layer', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__submit-inline')).toBeTruthy();
    expect(screen.getByTestId('createTask-submit-focus-target')).toBeTruthy();
  });

  it('keeps the branded create-task shell styling while preserving the inline submit flow', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__root').props.className).toContain('bg-[#E7F4F8]');
    expect(screen.getByTestId('create-task__header').props.className).toContain('bg-[#08576E]');
    expect(screen.getByTestId('create-task__submit-inline')).toBeTruthy();
    expect(screen.queryByTestId('create-task__bottom_action_bar')).toBeNull();
  });

  it('keeps the branded shell visible when admins are blocked from creating tasks', () => {
    mockIsAdmin = true;

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__root').props.className).toContain('bg-[#E7F4F8]');
    expect(screen.getByTestId('create-task__header').props.className).toContain('bg-[#08576E]');
    expect(screen.getByTestId('app-screen-header__profile-trigger')).toBeTruthy();
    expect(
      screen.getByText(
        'Administrator accounts cannot create or be assigned tasks. This function is reserved for managers and workers.',
      ),
    ).toBeTruthy();
  });

  it('surfaces project-scoped location options with an add-new path', async () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    fireEvent.press(screen.getByTestId('create-task__location-picker-trigger'));

    await waitFor(() => {
      expect(screen.getByText('Add new location')).toBeTruthy();
    });
    expect(screen.getAllByText('Add new location')[0]).toBeTruthy();
  });

  it('creates a new location inside the modal, selects it for the task, and returns to the form', async () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    fireEvent.press(screen.getByTestId('create-task__location-picker-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('create-task__location-option-add-new')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('create-task__location-option-add-new'));

    expect(screen.getByTestId('create-task__location-input')).toBeTruthy();
    expect(screen.getByTestId('create-task__location-save')).toBeTruthy();
    expect(screen.queryByTestId('create-task__location-picker-trigger')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('create-task__location-input'), '  Level 9 Rooftop  ');
    fireEvent.press(screen.getByTestId('create-task__location-save'));

    await waitFor(() => {
      expect(screen.queryByTestId('create-task__location-input')).toBeNull();
    });
    expect(mockEnsureProjectLocation).toHaveBeenCalledWith('project-1', 'Level 9 Rooftop', 'test-user');
    const locationTrigger = screen.getByTestId('create-task__location-picker-trigger');
    expect(locationTrigger).toBeTruthy();
    expect(within(locationTrigger).getByText('Level 9 Rooftop')).toBeTruthy();

    fireEvent.press(locationTrigger);

    await waitFor(() => {
      expect(screen.getAllByText('Level 9 Rooftop').length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.changeText(screen.getByTestId('createTask-title'), 'Install guard rails');
    fireEvent.changeText(screen.getByTestId('createTask-description'), 'Complete level 2 edge protection');
    fireEvent.press(screen.getByText('Create Task'));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Install guard rails',
          description: 'Complete level 2 edge protection',
          locationOnSite: 'Level 9 Rooftop',
        }),
      );
    });
  });

  it('advances through the create-task text fields in order and treats the submit action as the final target', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    const title = screen.getByTestId('createTask-title');
    const description = screen.getByTestId('createTask-description');
    const taskReference = screen.getByTestId('createTask-taskReference');
    const submitFocusTarget = screen.getByTestId('createTask-submit-focus-target');

    fireEvent(title, 'onKeyPress', {
      nativeEvent: { key: 'Tab', shiftKey: false },
    });

    expect(description.props.accessibilityState?.selected).toBe(true);

    fireEvent(description, 'onKeyPress', {
      nativeEvent: { key: 'Tab', shiftKey: false },
    });

    expect(taskReference.props.accessibilityState?.selected).toBe(true);

    fireEvent(taskReference, 'onKeyPress', {
      nativeEvent: { key: 'Tab', shiftKey: false },
    });

    expect(submitFocusTarget.props.accessibilityState?.selected).toBe(true);

    fireEvent(taskReference, 'onKeyPress', {
      nativeEvent: { key: 'Tab', shiftKey: true },
    });

    expect(description.props.accessibilityState?.selected).toBe(true);
  });

  it('hydrates selected photos into update action submissions after a round-trip', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="update"
          selectedPhotos={[
            {
              uri: 'file:///progress-photo.jpg',
              fileName: 'progress-photo.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: {
        public_url: 'https://cdn.example.com/progress-photo.jpg',
      },
    });

    fireEvent.changeText(getByPlaceholderText('Describe progress'), 'Installed wall framing');
    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: 'Installed wall framing',
          photos: ['https://cdn.example.com/progress-photo.jpg'],
        }),
      );
    });
  });

  it('resets the local update draft after a successful selected-photo submit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const onNavigateBack = jest.fn();
    const onClearDraftPayloads = jest.fn();

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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: {
        public_url: 'https://cdn.example.com/progress-photo.jpg',
      },
    });

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          onClearDraftPayloads={onClearDraftPayloads}
          editTaskId="task-1"
          actionType="update"
          selectedPhotos={[
            {
              uri: 'file:///progress-photo.jpg',
              fileName: 'progress-photo.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    fireEvent.changeText(screen.getByPlaceholderText('Describe progress'), 'Installed wall framing');
    fireEvent(screen.getByTestId('Slider'), 'onValueChange', 55);
    fireEvent.press(screen.getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: 'Installed wall framing',
          completionPercentage: 55,
          photos: ['https://cdn.example.com/progress-photo.jpg'],
        }),
      );
    });

    await waitFor(() => {
      expect(onClearDraftPayloads).toHaveBeenCalledTimes(1);
      expect(onNavigateBack).toHaveBeenCalledTimes(1);
      expect(screen.getByPlaceholderText('Describe progress').props.value).toBe('');
    });

    expect(screen.getByText('25%')).toBeTruthy();

    fireEvent.press(screen.getByTestId('app-screen-header__back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(2);
    alertSpy.mockRestore();
  });

  it('allows submitting an update with uploaded photos and no description', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getAllByText, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="update"
          uploadedPhotoUrls={['https://cdn.example.com/photo-update.jpg']}
        />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Submit Update')).toBeTruthy();
    });

    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: '',
          photos: ['https://cdn.example.com/photo-update.jpg'],
        }),
      );
    });
  });

  it('clears draft payload callbacks after a successful uploaded-photo update submit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const onNavigateBack = jest.fn();
    const onClearDraftPayloads = jest.fn();

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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          onClearDraftPayloads={onClearDraftPayloads}
          editTaskId="task-1"
          actionType="update"
          uploadedPhotoUrls={['https://cdn.example.com/photo-update.jpg']}
        />
      </NavigationContainer>
    );

    fireEvent.press(screen.getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: '',
          photos: ['https://cdn.example.com/photo-update.jpg'],
        }),
      );
    });

    await waitFor(() => {
      expect(onClearDraftPayloads).toHaveBeenCalledTimes(1);
      expect(onNavigateBack).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('app-screen-header__back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(2);
    alertSpy.mockRestore();
  });

  it('still blocks empty updates when there is no description and no photo', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="update" />
      </NavigationContainer>
    );

    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).not.toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Please provide a description for this update');
    alertSpy.mockRestore();
  });

  it('keeps the comment composer visible after entering from Add Photos', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByText, getByPlaceholderText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} editTaskId="task-1" actionType="photos" />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(mockShowPhotoSelectionDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          allowClipboard: true,
          allowMultiple: true,
          onPhotosSelected: expect.any(Function),
        }),
      );
    });

    expect(getByText('Update Description')).toBeTruthy();
    expect(getByPlaceholderText('Describe progress')).toBeTruthy();
  });

  it('merges returned photos into the same update composer when entering from Add Photos', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: {
        public_url: 'https://cdn.example.com/photo-1.jpg',
      },
    });

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="photos"
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

    await waitFor(() => {
      expect(screen.getByText('Photos and Files')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('Describe progress'), 'Installed wall framing');
    fireEvent.press(screen.getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: 'Installed wall framing',
          photos: ['https://cdn.example.com/photo-1.jpg'],
        }),
      );
    });
  });

  it('opens Add Comment in the shared composer without auto-opening photo selection and keeps the comment field ready', () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="comment"
        />
      </NavigationContainer>
    );

    expect(mockShowPhotoSelectionDialog).not.toHaveBeenCalled();
    expect(screen.getByText('Update Description')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe progress').props.autoFocus).toBe(true);
  });

  it('still allows Add Comment mode to add photos afterward from the shared composer', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="comment"
        />
      </NavigationContainer>
    );

    fireEvent.press(screen.getByText('Tap to add files'));

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

  it('uses addSubTaskUpdate for shortcut submits targeting a subtask', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'subtask-1',
          projectId: 'project-1',
          title: 'Existing subtask',
          description: 'Existing subtask description',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'in_progress',
          completionPercentage: 80,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="update"
          {...({ updateTargetSubTaskId: 'subtask-1' } as any)}
          uploadedPhotoUrls={['https://cdn.example.com/photo-update.jpg']}
        />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Submit Update')).toBeTruthy();
    });

    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddSubTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        'subtask-1',
        expect.objectContaining({
          completionPercentage: 80,
          photos: ['https://cdn.example.com/photo-update.jpg'],
        }),
      );
    });
  });

  it('prompts before leaving a dirty photo-driven draft instead of navigating back immediately', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          editTaskId="task-1"
          actionType="update"
          uploadedPhotoUrls={['https://cdn.example.com/photo-update.jpg']}
        />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('app-screen-header__back')).toBeTruthy();
    });

    fireEvent.press(getByTestId('app-screen-header__back'));

    expect(alertSpy).toHaveBeenCalled();
    expect(onNavigateBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('prompts before leaving create mode after a photo return', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const onNavigateBack = jest.fn();

    const { getByTestId, getAllByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          selectedPhotos={[
            {
              uri: 'file:///create-task-photo.jpg',
              fileName: 'create-task-photo.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getAllByText('1 file(s) added').length).toBeGreaterThan(0);
    });

    fireEvent.press(getByTestId('app-screen-header__back'));

    expect(onNavigateBack).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('navigates back immediately from the shared update composer when no draft changes exist', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          editTaskId="task-1"
          actionType="update"
        />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('app-screen-header__back')).toBeTruthy();
    });

    fireEvent.press(getByTestId('app-screen-header__back'));

    expect(onNavigateBack).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('hydrates uploaded photo urls into comment-first shared composer submissions after a round-trip', async () => {
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
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="comment"
          uploadedPhotoUrls={['https://cdn.example.com/comment-photo.jpg']}
        />
      </NavigationContainer>
    );

    fireEvent.changeText(getByPlaceholderText('Describe progress'), 'Please review this issue');
    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          description: 'Please review this issue',
          photos: ['https://cdn.example.com/comment-photo.jpg'],
        }),
      );
    });

    expect(mockAddAssignerComment).not.toHaveBeenCalled();
  });

  it('targets the subtask when submitting a comment-first shared composer update from a subtask action flow', async () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Parent task',
          description: 'Existing description',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-01T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'subtask-1',
          projectId: 'project-1',
          title: 'Child task',
          description: 'Subtask description',
          taskReference: '',
          billingStatus: 'non_billable',
          priority: 'medium',
          category: 'general',
          dueDate: '2099-01-02T00:00:00.000Z',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
          attachments: [],
          status: 'in_progress',
          completionPercentage: 25,
          createdAt: '2026-01-01T00:00:00.000Z',
          parentTaskId: 'task-1',
        },
      ],
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchTaskById: jest.fn(),
      addTaskUpdate: mockAddTaskUpdate,
      addSubTaskUpdate: mockAddSubTaskUpdate,
      addAssignerComment: mockAddAssignerComment,
    });

    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          editTaskId="task-1"
          actionType="comment"
          updateTargetSubTaskId="subtask-1"
        />
      </NavigationContainer>
    );

    fireEvent.changeText(getByPlaceholderText('Describe progress'), 'Subtask note');
    fireEvent.press(getByText('Submit Update'));

    await waitFor(() => {
      expect(mockAddSubTaskUpdate).toHaveBeenCalledWith(
        'task-1',
        'subtask-1',
        expect.objectContaining({
          description: 'Subtask note',
        }),
      );
    });

    expect(mockAddAssignerComment).not.toHaveBeenCalled();
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

  it('submits create mode, shows a success confirmation, and routes through create-success instead of generic back navigation', async () => {
    const onNavigateBack = jest.fn();
    const onCreateSuccess = jest.fn();

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={onNavigateBack}
          onCreateSuccess={onCreateSuccess}
        />
      </NavigationContainer>
    );

    fireEvent.changeText(getByTestId('createTask-title'), 'Install guard rails');
    fireEvent.changeText(getByTestId('createTask-description'), 'Complete level 2 edge protection');
    fireEvent.press(getByText('Create Task'));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Install guard rails',
          description: 'Complete level 2 edge protection',
        }),
      );
    });

    expect(mockCreateTask.mock.calls[0][0]).toHaveProperty('tags');
    expect(mockCreateTask.mock.calls[0][0]).toHaveProperty('primaryAssigneeId');
    expect(mockCreateTask.mock.calls[0][0]).toHaveProperty('delegatedUserIds');

    await waitFor(() => {
      expect(getByTestId('create-task__submit-success-message')).toBeTruthy();
      expect(getByTestId('create-task__submit-success-confirm')).toBeTruthy();
    });

    expect(onNavigateBack).not.toHaveBeenCalled();
    expect(onCreateSuccess).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('create-task__submit-success-confirm'));

    expect(onCreateSuccess).toHaveBeenCalledTimes(1);
    expect(onNavigateBack).not.toHaveBeenCalled();
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

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} editTaskId="task-1" />
      </NavigationContainer>
    );

    fireEvent.changeText(getByTestId('createTask-title'), 'Existing task updated');
    fireEvent.press(getByText('Update Task'));

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

    const { getByText } = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={onNavigateBack} />
      </NavigationContainer>
    );

    fireEvent.press(getByText('Create Task'));

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
    fireEvent.press(getByText('Update Task'));

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
    const screen = render(
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

    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getAllByText('1 file(s) added').length).toBeGreaterThan(0);
  });

  it('shows the post-capture routing sheet when global camera capture returns with selected photos', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          actionType="photos"
          cameraLaunchContext="global"
          postCaptureDefault="create_task"
          selectedPhotos={[
            {
              uri: 'file:///photo.jpg',
              fileName: 'photo.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__post_capture_routing_sheet')).toBeTruthy();
    expect(screen.getByText('What should this photo become?')).toBeTruthy();
    expect(screen.getByTestId('create-task__routing_choice_create')).toBeTruthy();
    expect(screen.getByTestId('create-task__routing_choice_existing')).toBeTruthy();
  });

  it('does not show the post-capture routing sheet during normal create-task mode', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen onNavigateBack={jest.fn()} />
      </NavigationContainer>
    );

    expect(screen.queryByTestId('create-task__post_capture_routing_sheet')).toBeNull();
    expect(screen.queryByText('What should this photo become?')).toBeNull();
  });

  it('keeps the create-new-task route selected and active by default for the global camera path', () => {
    const screen = render(
      <NavigationContainer>
        <CreateTaskScreen
          onNavigateBack={jest.fn()}
          actionType="photos"
          cameraLaunchContext="global"
          selectedPhotos={[
            {
              uri: 'file:///photo.jpg',
              fileName: 'photo.jpg',
              isAnnotated: false,
            },
          ]}
        />
      </NavigationContainer>
    );

    expect(screen.getByTestId('create-task__routing_choice_create').props.accessibilityState?.selected).toBe(true);
    expect(screen.getByTestId('create-task__routing_choice_existing').props.accessibilityState?.selected).toBe(false);
    expect(screen.getByText('Photos will be attached to the new task you create below.')).toBeTruthy();
    expect(screen.getByText('Create Task')).toBeTruthy();
  });
});
