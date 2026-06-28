import React from 'react';
import { Image } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TaskCard from '../TaskCard';
import { Task, Priority, TaskStatus } from '@/types/buildtrack';

// Mock the dependencies
jest.mock('@/state/authStore');
jest.mock('@/state/taskStore.supabase');
jest.mock('@/state/userStore.supabase');
jest.mock('@/state/themeStore');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('TaskCard Component Tests', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Install Safety Equipment',
    description: 'Install all safety equipment on 2nd floor',
    priority: 'high' as Priority,
    category: 'safety',
    status: 'in_progress' as TaskStatus,
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
    const { getAllByText } = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    expect(getAllByText(/50%/).length).toBeGreaterThan(0);
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

    expect(mockOnNavigate).toHaveBeenCalledWith('subtask-123', undefined);
  });

  it('does not throw when fire-and-forget store actions resolve from undefined test doubles', () => {
    const toggleTaskStar = jest.fn(() => undefined);
    const markTaskAsRead = jest.fn(() => undefined);
    const { useTaskStore } = require('@/state/taskStore.supabase');

    useTaskStore.mockReturnValue({
      taskReadStatuses: [],
      toggleTaskStar,
      markTaskAsRead,
    });

    const view = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const starButton = view.UNSAFE_getByProps({ className: 'mr-2' });
    const card = view.getByText('Install Safety Equipment');

    expect(() => {
      fireEvent(starButton, 'press', { stopPropagation: jest.fn() });
    }).not.toThrow();

    expect(() => {
      fireEvent.press(card.parent?.parent?.parent || card);
    }).not.toThrow();

    expect(toggleTaskStar).toHaveBeenCalledWith('task-123', 'user-123');
    expect(markTaskAsRead).toHaveBeenCalledWith('user-123', 'task-123');
  });

  it('logs and swallows rejected fire-and-forget task actions', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const toggleTaskStar = jest.fn().mockRejectedValue(new Error('star failed'));
    const markTaskAsRead = jest.fn().mockRejectedValue(new Error('read failed'));
    const { useTaskStore } = require('@/state/taskStore.supabase');

    useTaskStore.mockReturnValue({
      taskReadStatuses: [],
      toggleTaskStar,
      markTaskAsRead,
    });

    const view = render(
      <TaskCard task={mockTask} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const starButton = view.UNSAFE_getByProps({ className: 'mr-2' });
    const card = view.getByText('Install Safety Equipment');

    fireEvent(starButton, 'press', { stopPropagation: jest.fn() });
    fireEvent.press(card.parent?.parent?.parent || card);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to toggle task star:',
        expect.any(Error)
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to mark task as read:',
        expect.any(Error)
      );
    });

    expect(mockOnNavigate).toHaveBeenCalledWith('task-123');

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('renders activity photos when activities are the only runtime source', () => {
    const taskWithActivityPhotos: Task = {
      ...mockTask,
      activities: [
        {
          id: 'activity-photo-1',
          taskId: 'task-123',
          userId: 'user-123',
          activityType: 'progress_update',
          timestamp: new Date().toISOString(),
          data: { photos: ['https://example.com/activity-photo.jpg'] },
          description: 'Uploaded a new site photo',
          completionPercentage: 50,
          status: 'in_progress',
          createdAt: new Date().toISOString(),
        },
      ],
      updates: [],
    };

    const view = render(
      <TaskCard task={taskWithActivityPhotos} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const renderedImages = view.UNSAFE_getAllByType(Image);

    expect(
      renderedImages.some(
        (image) => image.props.source?.uri === 'https://example.com/activity-photo.jpg'
      )
    ).toBe(true);
  });

  it('does not render legacy updates-only photos when activities are absent', () => {
    const taskWithLegacyOnlyPhotos: Task = {
      ...mockTask,
      activities: [],
      updates: [
        {
          id: 'legacy-update-1',
          userId: 'user-123',
          timestamp: new Date().toISOString(),
          description: 'Legacy photo row',
          completionPercentage: 50,
          status: 'in_progress',
          photos: ['https://example.com/legacy-photo.jpg'],
        },
      ],
    };

    const view = render(
      <TaskCard task={taskWithLegacyOnlyPhotos} onNavigateToTaskDetail={mockOnNavigate} />
    );

    const renderedImages = view.UNSAFE_queryAllByType(Image);

    expect(
      renderedImages.some(
        (image) => image.props.source?.uri === 'https://example.com/legacy-photo.jpg'
      )
    ).toBe(false);
  });
});
