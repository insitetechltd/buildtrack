// ============================================
// USER ROLES vs USER CATEGORIES - IMPORTANT!
// ============================================
// See ROLE_VS_CATEGORY_GUIDE.md for complete documentation
//
// USER ROLE (Job Title):
//   - System-wide permission level
//   - Examples: "admin", "manager", "worker"
//   - Stored in: users.role
//   - Controls: What features you can access
//   - Changes: Rarely
//
// USER CATEGORY (Project Role):
//   - Project-specific capacity
//   - Examples: "contractor", "inspector", "lead_project_manager"
//   - Stored in: user_project_assignments.category
//   - Controls: What you do on a specific project
//   - Changes: Per project assignment
//
// Example: Sarah is a "manager" (role) but works as "contractor" 
//          on Project A and "inspector" on Project B
// ============================================

/**
 * USER ROLE (Job Title)
 * 
 * System-wide permission level that determines what a user can do
 * across the entire BuildTrack application.
 * 
 * - admin: Full system access, can manage everything
 * - manager: Can manage projects, tasks, and assign users
 * - worker: Can view and update assigned tasks only
 * 
 * Stored in: users.role
 * Scope: System-wide
 * Frequency: Rarely changes
 */
export type UserRole = "admin" | "manager" | "worker";

export type CompanyType = "general_contractor" | "subcontractor" | "supplier" | "consultant" | "owner";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type Priority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "not_started" | "in_progress" | "rejected" | "completed";

/**
 * TASK CATEGORY (not to be confused with USER CATEGORY)
 * 
 * Describes the type of work in a task.
 * This is different from UserCategory which describes a user's role.
 */
export type TaskCategory = "safety" | "electrical" | "plumbing" | "structural" | "general" | "materials";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

/**
 * USER CATEGORY (Project Role)
 * 
 * Defines what a user does on a SPECIFIC project.
 * Same user can have different categories on different projects.
 * 
 * Examples:
 * - lead_project_manager: Oversees entire project, sees all tasks
 * - contractor: Main contractor for project work
 * - subcontractor: Specialized contractor for specific tasks
 * - inspector: Reviews and inspects work quality
 * - architect: Provides architectural guidance
 * - engineer: Provides engineering guidance
 * - worker: Executes assigned tasks
 * - foreman: Supervises workers on-site
 * 
 * Stored in: user_project_assignments.category
 * Scope: Project-specific
 * Frequency: Can change per project
 * 
 * Note: "worker" appears in both UserRole AND UserCategory!
 *       - UserRole "worker" = job title with limited system permissions
 *       - UserCategory "worker" = project role doing general labor
 */
export type UserCategory = "lead_project_manager" | "contractor" | "subcontractor" | "inspector" | "architect" | "engineer" | "worker" | "foreman";

/**
 * ROLE NAME (New Role System)
 * 
 * Combined type for the new role system that includes BOTH:
 * - Job titles (admin, manager, worker)
 * - Project roles (lead_project_manager, contractor, etc.)
 * 
 * WARNING: This mixes two different concepts! 
 * Future refactoring should separate these into JobTitle and ProjectRole types.
 * 
 * See REFACTORING_ROLES_CATEGORIES.md for migration plan.
 */
export type RoleName = "admin" | "manager" | "worker" | "lead_project_manager" | "contractor" | "subcontractor" | "inspector" | "architect" | "engineer" | "foreman";

export interface Role {
  id: string;
  name: RoleName;
  displayName: string;
  description?: string;
  level: number; // 1=Admin, 2=Manager, 3=Worker
  permissions?: Record<string, boolean>;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  taxId?: string; // Tax ID or business registration number
  licenseNumber?: string;
  insuranceExpiry?: string;
  banner?: {
    text: string;
    backgroundColor: string;
    textColor: string;
    isVisible: boolean;
    imageUri?: string; // Custom uploaded banner image (overrides text/colors when set)
  };
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  invitedBy: string; // User ID who sent the invitation
  invitedByCompanyId: string; // Company of the inviter
  inviteeEmail?: string; // Either email or phone must be provided
  inviteePhone?: string;
  inviteeUserId?: string; // Set after user accepts (if they already have an account)
  status: InvitationStatus;
  proposedCategory: UserCategory; // Suggested role for the project
  message?: string; // Optional message to invitee
  createdAt: string;
  expiresAt: string; // Invitations expire after X days
  respondedAt?: string;
  declineReason?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budget?: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  clientInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  createdBy: string;
  companyId?: string; // Company that owns this project
  createdAt: string;
  updatedAt: string;
}

/**
 * USER PROJECT ASSIGNMENT (DEPRECATED)
 * 
 * Links a user to a project with a specific PROJECT ROLE (category).
 * 
 * @deprecated Use UserProjectRole instead
 */
export interface UserProjectAssignment {
  userId: string;
  projectId: string;
  
  /** 
   * PROJECT ROLE (UserCategory) - What the user does on THIS project
   * Examples: "contractor", "inspector", "lead_project_manager"
   * 
   * NOTE: This is NOT the user's job title! A "manager" (role) can be 
   * assigned as "contractor" (category) on a project.
   */
  category: UserCategory;
  
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

/**
 * USER PROJECT ROLE (NEW)
 * 
 * Replaces UserProjectAssignment with better support for the new role system.
 */
export interface UserProjectRole {
  id: string;
  userId: string;
  projectId: string;
  roleId: string;
  
  /** 
   * PROJECT ROLE (UserCategory) - What the user does on THIS project
   * Optional in new system, defined by roleId instead
   */
  category?: UserCategory;
  
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

/**
 * USER
 * 
 * Represents a user in the BuildTrack system.
 */
export interface User {
  id: string;
  email?: string; // Optional - can use phone as username
  name: string;
  
  /** 
   * JOB TITLE (UserRole) - System-wide permission level
   * 
   * Values: "admin" | "manager" | "worker"
   * 
   * This determines what the user CAN do across the entire system:
   * - admin: Full access to everything
   * - manager: Can manage projects and assign users
   * - worker: Limited to viewing assigned tasks
   * 
   * @deprecated Use defaultRole/defaultRoleId instead (new role system)
   */
  role: UserRole;
  
  /** 
   * NEW: Default role reference (new role system)
   * Will eventually replace the "role" field above
   */
  defaultRole?: Role;
  
  /** 
   * NEW: Default role ID (new role system)
   * Will eventually replace the "role" field above
   */
  defaultRoleId?: string;
  
  companyId: string; // Required - must belong to a company
  
  /** 
   * POSITION - Human-readable job position
   * 
   * Examples: "Senior Construction Manager", "Electrician", "Site Supervisor"
   * 
   * This is different from "role" (job title):
   * - role: System permission level (admin/manager/worker)
   * - position: Actual job title for display
   */
  position: string;
  
  phone: string; // Required - primary identifier
  createdAt: string;
  updatedAt?: string;
  
  // Project assignments (with PROJECT ROLES) are handled separately 
  // in UserProjectRole or UserProjectAssignment tables
}

export interface TaskUpdate {
  id: string;
  description: string;
  photos: string[];
  completionPercentage: number;
  status: TaskStatus;
  timestamp: string;
  userId: string;
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  projectId: string; // Same project as parent
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  category: TaskCategory; // Add category
  attachments: string[]; // Add attachments
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  assignedTo: string[];
  assignedBy: string;
  originalAssignedBy?: string; // Original creator before any delegation
  createdAt: string;
  updates: TaskUpdate[]; // Add updates
  currentStatus: TaskStatus;
  completionPercentage: number;
  accepted?: boolean;
  acceptedBy?: string; // User ID who accepted the subtask
  acceptedAt?: string; // When the subtask was accepted
  declineReason?: string;
  subTasks?: SubTask[]; // Recursive nesting
  delegationHistory?: Array<{ // Track subtask delegation
    fromUserId: string;
    toUserId: string;
    reason?: string;
    timestamp: string;
  }>;
  starredByUsers?: string[]; // Array of user IDs who starred this subtask
}

export interface Task {
  id: string;
  projectId: string; // Tasks now belong to projects
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  category: TaskCategory;
  attachments: string[];
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  assignedTo: string[];
  assignedBy: string;
  originalAssignedBy?: string; // Original creator before any delegation
  createdAt: string;
  updates: TaskUpdate[];
  currentStatus: TaskStatus;
  completionPercentage: number;
  accepted?: boolean;
  acceptedBy?: string; // User ID who accepted the task
  acceptedAt?: string; // When the task was accepted
  declineReason?: string;
  subTasks?: SubTask[]; // Add subtasks array
  delegationHistory?: Array<{ // Track task delegation
    fromUserId: string;
    toUserId: string;
    reason?: string;
    timestamp: string;
  }>;
  
  // Today's Tasks feature - track which users starred this task
  starredByUsers?: string[]; // Array of user IDs who starred this for today
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  assignmentNotifications: boolean;
  updateNotifications: boolean;
  deadlineReminders: boolean;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  notifications: NotificationSettings;
  offlineMode: boolean;
  autoSync: boolean;
}

export interface TaskReadStatus {
  userId: string;
  taskId: string;
  isRead: boolean;
  readAt?: string;
}