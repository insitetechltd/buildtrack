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

// Mock dependencies
jest.mock('../../state/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', companyId: 'test-company', name: 'Test User' }
  })
}));

jest.mock('../../state/taskStore.supabase', () => ({
  useTaskStore: () => ({
    tasks: [],
    createTask: jest.fn(),
    createSubTask: jest.fn(),
    updateTask: jest.fn(),
    fetchTaskById: jest.fn()
  })
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
       doneSelected: () => 'Done'
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
});
