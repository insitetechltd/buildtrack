import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProjectStore } from '../projectStore';
import { supabase } from '@/api/supabase';
import { ProjectStatus, UserCategory } from '@/types/buildtrack';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Project Management Workflow Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockCompany = {
    id: 'company-123',
    name: 'BuildTrack Construction Inc.',
  };

  const mockUser = {
    id: 'user-123',
    name: 'John Manager',
    role: 'manager' as const,
  };

  const mockWorker = {
    id: 'worker-456',
    name: 'Sarah Worker',
    role: 'worker' as const,
  };

  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      userAssignments: [],
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe('Project Creation', () => {
    it('should create project with required fields', async () => {
      const newProject = {
        name: 'Downtown Office Building',
        description: 'New commercial construction project',
        status: 'planning' as ProjectStatus,
        companyId: mockCompany.id,
        startDate: new Date().toISOString(),
        createdBy: mockUser.id,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'project-123',
                ...newProject,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      let projectId: string;
      await act(async () => {
        projectId = await result.current.createProject(newProject);
      });

      expect(projectId).toBe('project-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should create project with optional fields', async () => {
      const projectWithOptionals = {
        name: 'Residential Complex',
        description: 'Luxury apartment building',
        status: 'planning' as ProjectStatus,
        companyId: mockCompany.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days from now
        createdBy: mockUser.id,
        budget: 5000000,
        location: '123 Main St, City, State 12345',
        clientName: 'ABC Properties Inc.',
        projectManager: mockUser.id,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'project-456', ...projectWithOptionals },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      let projectId: string;
      await act(async () => {
        projectId = await result.current.createProject(projectWithOptionals);
      });

      expect(projectId).toBe('project-456');
    });

    it('should create project with lead project manager', async () => {
      const projectWithLeadPM = {
        name: 'Bridge Construction',
        description: 'Highway bridge project',
        status: 'planning' as ProjectStatus,
        companyId: mockCompany.id,
        startDate: new Date().toISOString(),
        createdBy: mockUser.id,
        leadProjectManager: mockUser.id,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'project-789', ...projectWithLeadPM },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.createProject(projectWithLeadPM);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should validate project data', async () => {
      const invalidProject = {
        name: '', // Empty name should fail
        description: 'Test description',
        status: 'planning' as ProjectStatus,
        companyId: mockCompany.id,
        startDate: new Date().toISOString(),
        createdBy: mockUser.id,
      };

      const { result } = renderHook(() => useProjectStore());

      await expect(async () => {
        await act(async () => {
          await result.current.createProject(invalidProject);
        });
      }).rejects.toThrow();
    });
  });

  describe('Project Updates', () => {
    const mockProject = {
      id: 'project-123',
      name: 'Original Project Name',
      description: 'Original description',
      status: 'planning' as ProjectStatus,
    };

    beforeEach(() => {
      useProjectStore.setState({ projects: [mockProject] });
    });

    it('should edit project name', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProject, name: 'Updated Project Name' },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(mockProject.id, {
          name: 'Updated Project Name',
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should edit project description', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProject, description: 'Updated description' },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(mockProject.id, {
          description: 'Updated description',
        });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should update project status', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProject, status: 'active' },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(mockProject.id, {
          status: 'active' as ProjectStatus,
        });
      });

      const updateCall = (mockSupabase.from as jest.Mock).mock.results[0].value.update.mock.calls[0][0];
      expect(updateCall.status).toBe('active');
    });

    it('should update project dates', async () => {
      const newEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProject, endDate: newEndDate },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(mockProject.id, {
          endDate: newEndDate,
        });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('User Assignments', () => {
    const mockProject = {
      id: 'project-123',
      name: 'Test Project',
    };

    it('should assign user to project with category', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                userId: mockWorker.id,
                projectId: mockProject.id,
                category: 'contractor' as UserCategory,
                assignedBy: mockUser.id,
                assignedAt: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.assignUserToProject(
          mockWorker.id,
          mockProject.id,
          'contractor',
          mockUser.id
        );
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_project_assignments');
    });

    it('should remove user from project', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.removeUserFromProject(mockWorker.id, mockProject.id);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_project_assignments');
    });

    it('should update user\'s project category', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { category: 'foreman' },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateUserProjectCategory(
          mockWorker.id,
          mockProject.id,
          'foreman'
        );
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should get all users on project', async () => {
      const mockAssignments = [
        {
          userId: mockUser.id,
          projectId: mockProject.id,
          category: 'lead_project_manager' as UserCategory,
        },
        {
          userId: mockWorker.id,
          projectId: mockProject.id,
          category: 'contractor' as UserCategory,
        },
        {
          userId: 'worker-2',
          projectId: mockProject.id,
          category: 'worker' as UserCategory,
        },
      ];

      useProjectStore.setState({ userAssignments: mockAssignments });

      const { result } = renderHook(() => useProjectStore());

      const projectUsers = result.current.getProjectUserAssignments(mockProject.id);

      expect(projectUsers).toHaveLength(3);
      expect(projectUsers[0].userId).toBe(mockUser.id);
      expect(projectUsers[0].category).toBe('lead_project_manager');
    });
  });

  describe('Project Queries', () => {
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Project Alpha',
        status: 'active' as ProjectStatus,
        companyId: mockCompany.id,
        createdBy: mockUser.id,
      },
      {
        id: 'project-2',
        name: 'Project Beta',
        status: 'planning' as ProjectStatus,
        companyId: mockCompany.id,
        createdBy: mockUser.id,
      },
      {
        id: 'project-3',
        name: 'Project Gamma',
        status: 'completed' as ProjectStatus,
        companyId: mockCompany.id,
        createdBy: mockUser.id,
      },
    ];

    const mockAssignments = [
      { userId: mockUser.id, projectId: 'project-1', category: 'lead_project_manager' as UserCategory },
      { userId: mockUser.id, projectId: 'project-2', category: 'lead_project_manager' as UserCategory },
      { userId: mockWorker.id, projectId: 'project-1', category: 'contractor' as UserCategory },
    ];

    beforeEach(() => {
      useProjectStore.setState({
        projects: mockProjects,
        userAssignments: mockAssignments,
      });
    });

    it('should get all projects', () => {
      const { result } = renderHook(() => useProjectStore());

      const allProjects = result.current.getAllProjects();

      expect(allProjects).toHaveLength(3);
    });

    it('should get projects by user', () => {
      const { result } = renderHook(() => useProjectStore());

      const userProjects = result.current.getProjectsByUser(mockUser.id);

      expect(userProjects).toHaveLength(2);
      expect(userProjects[0].id).toBe('project-1');
      expect(userProjects[1].id).toBe('project-2');
    });

    it('should get project by ID', () => {
      const { result } = renderHook(() => useProjectStore());

      const project = result.current.getProjectById('project-1');

      expect(project).toBeDefined();
      expect(project?.name).toBe('Project Alpha');
    });

    it('should get project statistics', () => {
      const projectWithUsers = {
        id: 'project-stats',
        userAssignments: [
          { category: 'lead_project_manager' as UserCategory },
          { category: 'contractor' as UserCategory },
          { category: 'contractor' as UserCategory },
          { category: 'worker' as UserCategory },
          { category: 'worker' as UserCategory },
          { category: 'worker' as UserCategory },
        ],
      };

      useProjectStore.setState({
        userAssignments: [
          { projectId: 'project-stats', category: 'lead_project_manager' as UserCategory },
          { projectId: 'project-stats', category: 'contractor' as UserCategory },
          { projectId: 'project-stats', category: 'contractor' as UserCategory },
          { projectId: 'project-stats', category: 'worker' as UserCategory },
          { projectId: 'project-stats', category: 'worker' as UserCategory },
          { projectId: 'project-stats', category: 'worker' as UserCategory },
        ],
      });

      const { result } = renderHook(() => useProjectStore());

      const stats = result.current.getProjectStats('project-stats');

      expect(stats.totalUsers).toBe(6);
      expect(stats.usersByCategory.contractor).toBe(2);
      expect(stats.usersByCategory.worker).toBe(3);
    });
  });

  describe('Project Management', () => {
    it('should archive completed project', async () => {
      const projectToArchive = {
        id: 'project-archive',
        name: 'Completed Project',
        status: 'completed' as ProjectStatus,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...projectToArchive, archived: true },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(projectToArchive.id, {
          archived: true,
        });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should delete project', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.deleteProject('project-to-delete');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should restore archived project', async () => {
      const archivedProject = {
        id: 'project-restore',
        name: 'Archived Project',
        archived: true,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...archivedProject, archived: false },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useProjectStore());

      await act(async () => {
        await result.current.updateProject(archivedProject.id, {
          archived: false,
        });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });
});

