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

import { render } from '@testing-library/react-native';
import CreateTaskScreen from '../../screens/CreateTaskScreen';
import { NavigationContainer } from '@react-navigation/native';

const mockUseTaskStore = jest.fn();

// Mock dependencies
jest.mock('../../state/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', companyId: 'test-company', name: 'Test User' }
  })
}));

jest.mock('../../state/taskStore.supabase', () => ({
  useTaskStore: () => mockUseTaskStore()
}));

jest.mock('../../state/userStore.supabase', () => ({
  useUserStoreWithInit: () => ({
    getUsersByRole: () => []
  }),
  useUserStore: () => ({
    getAllUsers: () => []
  }),
}));

jest.mock('../../state/projectStore.supabase', () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectsByUser: () => [],
    getProjectUserAssignments: () => [],
    fetchProjectUserAssignments: jest.fn().mockResolvedValue(undefined),
  })
}));

jest.mock('../../state/projectFilterStore', () => ({
  useProjectFilterStore: (selector: (state: { selectedProjectId: string | null }) => unknown) =>
    selector({ selectedProjectId: null }),
}));

jest.mock('../../utils/useTranslation', () => ({
  useTranslation: () => ({
    tasks: { createTask: 'Create Task', title: 'Title', description: 'Description' },
    createTask: { 
      textInput: 'Input', 
      textInputPlaceholder: 'Text',
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
      common: { done: 'Done', selected: 'Selected' }
  })
}));

jest.mock('../../utils/dateFormatter', () => ({
  useDateFormatter: () => ({
    formatDateWithWeekday: (d: Date) => 'Today',
    locale: 'en'
  })
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

jest.mock('../../components/StandardHeader', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="StandardHeader" {...props} /> };
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
  return { SafeAreaView: (props: any) => <View testID="SafeAreaView" {...props} /> };
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
  useNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn((cb) => cb()),
  NavigationContainer: ({ children }: any) => <>{children}</>
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
    });
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
});
