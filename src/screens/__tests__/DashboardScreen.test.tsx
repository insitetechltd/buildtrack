import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../DashboardScreen';

jest.mock('@/state/authStore');
jest.mock('@/state/taskStore.supabase');
jest.mock('@/state/projectStore.supabase');
jest.mock('@/state/projectFilterStore');
jest.mock('@/state/companyStore');
jest.mock('@/state/themeStore');
jest.mock('@/state/userStore.supabase');
jest.mock('@/utils/useTranslation');
jest.mock('@/components/LoadingIndicator', () => ({
  LoadingIndicator: 'LoadingIndicator',
}));
jest.mock('@/components/StandardHeader', () => 'StandardHeader');
jest.mock('@/components/ExpandableUtilityFAB', () => 'ExpandableUtilityFAB');
jest.mock('@/components/TaskCard', () => 'TaskCard');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const { useAuthStore } = require('@/state/authStore');
    const { useTaskStore } = require('@/state/taskStore.supabase');
    const { useProjectStoreWithInit } = require('@/state/projectStore.supabase');
    const { useProjectFilterStore } = require('@/state/projectFilterStore');
    const { useCompanyStore } = require('@/state/companyStore');
    const { useThemeStore } = require('@/state/themeStore');
    const { useUserStore } = require('@/state/userStore.supabase');
    const { useTranslation } = require('@/utils/useTranslation');

    useAuthStore.mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      logout: jest.fn(),
    });

    useTaskStore.mockReturnValue({
      tasks: [],
      fetchTasks: jest.fn(),
      getStarredTasks: jest.fn(() => []),
      toggleTaskStar: jest.fn(),
      isLoading: false,
    });

    useProjectStoreWithInit.mockReturnValue({
      getProjectsByUser: jest.fn(() => [
        { id: 'project-1', name: 'Project One', status: 'active' },
      ]),
      getProjectById: jest.fn(() => null),
      fetchProjects: jest.fn(),
      fetchUserProjectAssignments: jest.fn(),
      isLoading: false,
      projects: [{ id: 'project-1', name: 'Project One', status: 'active' }],
      getUserProjectAssignments: jest.fn(() => []),
    });

    useProjectFilterStore.mockReturnValue({
      selectedProjectId: null,
      setSelectedProject: jest.fn(),
      setSectionFilter: jest.fn(),
      setStatusFilter: jest.fn(),
      setButtonLabel: jest.fn(),
      getLastSelectedProject: jest.fn(async () => null),
    });

    useCompanyStore.mockReturnValue({});

    useThemeStore.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: jest.fn(),
    });

    useUserStore.mockReturnValue({
      fetchUsers: jest.fn(),
      isLoading: false,
    });

    useTranslation.mockReturnValue({
      nav: { dashboard: 'Dashboard' },
      dashboard: {
        loadingProjects: 'Loading projects...',
        loadingTasks: 'Loading tasks...',
        loadingUsers: 'Loading users...',
        loadingData: 'Loading data...',
        noProjectsYet: 'No Projects Yet',
        noProjectsMessage: 'You have no projects',
        selectAProject: 'Select a Project',
        selectProjectMessage: 'Please select a project to view your dashboard',
      },
    });
  });

  it('shows a non-blank fallback when projects exist but no project is selected', async () => {
    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToProjectPicker={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Select a Project')).toBeTruthy();
      expect(
        screen.getByText('Please select a project to view your dashboard'),
      ).toBeTruthy();
    });
  });
});

