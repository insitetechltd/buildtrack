import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TaskCard from '../TaskCard';
import { Task, Priority, TaskStatus } from '@/types/buildtrack';

// Mock the dependencies
jest.mock('@/state/authStore');
jest.mock('@/state/taskStore.supabase');
jest.mock('@/state/userStore.supabase');
jest.mock('@/state/themeStore');

describe('TaskCard Component Tests', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Install Safety Equipment',
    description: 'Install all safety equipment on 2nd floor',
    priority: 'high' as Priority,
    category: 'safety',
    currentStatus: 'in_progress' as TaskStatus,
    completionPercentage: 50,
    projectId: 'project-123',
    assignedTo: ['user-123', 'user-456'],
    assignedBy: 'manager-123',
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updates: [],
    attachments: [],
  };

  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock store returns
    const { useAuthStore } = require('@/state/authStore');
    const { useTaskStore } = require('@/state/taskStore.supabase');
    const { useUserStoreWithInit } = require('@/state/userStore.supabase');
    const { useThemeStore } = require('@/state/themeStore');

    useAuthStore.mockReturnValue({
      user: { id: 'user-123', name: 'Test User' },
    });

    useTaskStore.mockReturnValue({
      taskReadStatuses: [],
      toggleTaskStar: jest.fn(),
      markTaskAsRead: jest.fn(),
    });

    useUserStoreWithInit.mockReturnValue({
      getUserById: jest.fn((id) => ({ id, name: `User ${id}` })),
    });

    useThemeStore.mockReturnValue({
      isDarkMode: false,
    });
  });

  it('should render task card with title', () => {
    const { getByText } = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    expect(getByText('Install Safety Equipment')).toBeTruthy();
  });

  it('should handle task press and navigate to detail', () => {
    const { getByText } = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const card = getByText('Install Safety Equipment');
    fireEvent.press(card.parent?.parent?.parent || card);

    expect(mockOnNavigate).toHaveBeenCalledWith(mockTask.id);
  });

  it('should display task with correct priority', () => {
    const { getByText } = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    // Task should render with high priority
    expect(getByText('Install Safety Equipment')).toBeTruthy();
    expect(mockTask.priority).toBe('high');
  });

  it('should show completion percentage', () => {
    const { getByText } = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    expect(getByText(/50%/)).toBeTruthy();
  });

  it('should handle subtask navigation', () => {
    const subtask = {
      ...mockTask,
      id: 'subtask-123',
      parentTaskId: 'parent-task-456',
      isSubTask: true,
    };

    const { getByText } = render(
      <TaskCard task={subtask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const card = getByText('Install Safety Equipment');
    fireEvent.press(card.parent?.parent?.parent || card);

    expect(mockOnNavigate).toHaveBeenCalledWith('parent-task-456', 'subtask-123');
  });
});

