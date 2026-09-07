// ============================================
// SYSTEM PERMISSIONS vs PROJECT ROLES - IMPORTANT!
// ============================================
// See ROLE_SYSTEM_ANALYSIS.md for complete documentation
//
// SYSTEM PERMISSION (System-wide access level):
//   - System-wide permission level
//   - Examples: "admin", "manager", "member"
//   - Stored in: users.role (database) / users.systemPermission (app)
//   - Controls: What features you can access system-wide
//   - Changes: Rarely
//
// PROJECT ROLE (Project-specific capacity):
//   - Project-specific capacity
//   - Examples: "contractor", "inspector", "lead_project_manager"
//   - Stored in: user_project_assignments.category (database) / projectRole (app)
//   - Controls: What you do on a specific project
//   - Changes: Per project assignment
//
// Example: Sarah has "manager" system permission but works as "contractor" 
//          on Project A and "inspector" on Project B
// ============================================

/**
 * SYSTEM PERMISSION (System-wide access level)
 * 
 * System-wide permission level that determines what a user can do
 * across the entire BuildTrack application.
 * 
 * - admin: Full system access, can manage everything
 * - manager: Can manage projects, tasks, and assign users
 * - member: Can view and update assigned tasks only (formerly "worker")
 * 
 * Stored in: users.role (database field name for backward compatibility)
 * Scope: System-wide
 * Frequency: Rarely changes
 * 
 * @deprecated Use SystemPermission instead. UserRole is kept for backward compatibility.
 */
export type UserRole = "admin" | "manager" | "worker" | "member";

/**
 * SYSTEM PERMISSION (System-wide access level)
 * 
 * System-wide permission level that determines what a user can do
 * across the entire BuildTrack application.
 * 
 * - admin: Full system access, can manage everything
 * - manager: Can manage projects, tasks, and assign users
 * - member: Can view and update assigned tasks only
 * 
 * Stored in: users.role (database field name for backward compatibility)
 * Scope: System-wide
 * Frequency: Rarely changes
 */
export type SystemPermission = "admin" | "manager" | "member";

export type CompanyType = "general_contractor" | "subcontractor" | "supplier" | "consultant" | "owner";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type Priority = "low" | "medium" | "high" | "critical";

// Unified task status system - replaces old currentStatus + accepted + readyForReview + reviewAccepted
export type TaskStatus = 
  | "reported"               // Field issue/snag reported by worker, awaiting PM triage
  | "resolved"               // Report closed without promotion; row kept for audit
  | "new"                    // Created by assigner, waiting for assignee response
  | "declined"               // Declined by assignee (goes back to assigner)
  | "accepted"               // Accepted by assignee (ready to start work)
  | "in_progress"            // Work has started (after acceptance)
  | "submitted_for_review"   // Completed and submitted for review (100% complete)
  | "approved"               // Review approved by assigner
  | "rejected"               // Review rejected by assigner (needs rework)
  | "cancelled"              // Task cancelled by creator
  | "dismissed"              // Legacy: issue dismissed during triage (prefer resolved)
  // Legacy statuses kept for backward compatibility during the migration sweep
  | "not_started"
  | "completed"
  | "received"
  | "reviewing"
  | "wip"
  | "done"
  | "assigned";

export type BillingStatus = "billable" | "non_billable" | "billed";

/**
 * TASK CATEGORY (not to be confused with USER CATEGORY)
 * 
 * Describes the type of work in a task.
 * This is different from UserCategory which describes a user's role.
 */
export type TaskCategory = "safety" | "electrical" | "plumbing" | "structural" | "general" | "materials" | "commercial";

export type ProjectStatus = "planning" | "active" | "completed" | "cancelled";

/**
 * PROJECT ROLE (Project-specific capacity)
 * 
 * Defines what a user does on a SPECIFIC project.
 * Same user can have different project roles on different projects.
 * 
 * Examples:
 * - lead_project_manager: Oversees entire project, sees all tasks
 * - contractor: Main contractor for project work
 * - subcontractor: Specialized contractor for specific tasks
 * - inspector: Reviews and inspects work quality
 * - architect: Provides architectural guidance
 * - engineer: Provides engineering guidance
 * - worker: Executes assigned tasks (project-specific, not system permission)
 * - foreman: Supervises workers on-site
 * 
 * Stored in: user_project_assignments.category (database field name for backward compatibility)
 * Scope: Project-specific
 * Frequency: Can change per project
 * 
 * @deprecated Use ProjectRole instead. UserCategory is kept for backward compatibility.
 */
export type UserCategory = "lead_project_manager" | "contractor" | "subcontractor" | "inspector" | "architect" | "engineer" | "worker" | "foreman";

/**
 * PROJECT ROLE (Project-specific capacity)
 * 
 * Defines what a user does on a SPECIFIC project.
 * Same user can have different project roles on different projects.
 * 
 * Examples:
 * - lead_project_manager: Oversees entire project, sees all tasks
 * - contractor: Main contractor for project work
 * - subcontractor: Specialized contractor for specific tasks
 * - inspector: Reviews and inspects work quality
 * - architect: Provides architectural guidance
 * - engineer: Provides engineering guidance
 * - worker: Executes assigned tasks (project-specific role)
 * - foreman: Supervises workers on-site
 * 
 * Stored in: user_project_assignments.category (database field name for backward compatibility)
 * Scope: Project-specific
 * Frequency: Can change per project
 */
export type ProjectRole = "lead_project_manager" | "contractor" | "subcontractor" | "inspector" | "architect" | "engineer" | "worker" | "foreman";

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
export type RoleName =
  | "admin"
  | "manager"
  | "member"
  | "worker"
  | "lead_project_manager"
  | "contractor"
  | "subcontractor"
  | "inspector"
  | "architect"
  | "engineer"
  | "foreman";

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
    /** Durable buildtrack-files object key — company-wide for all seats. */
    imageStoragePath?: string;
    /**
     * Legacy / local preview only. Do not persist file:// or data: URIs —
     * use imageStoragePath after upload.
     */
    imageUri?: string;
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
  location: string; // Full address in a single field
  clientInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  createdBy: string;
  companyId?: string; // Company that owns this project
  createdAt: string;
  updatedAt: string;
  archived?: boolean; // Legacy compatibility
}

/**
 * USER PROJECT ASSIGNMENT (DEPRECATED)
 * 
 * Links a user to a project with a specific PROJECT ROLE (category).
 * 
 * @deprecated Use UserProjectRole instead
 */
export interface UserProjectAssignment {
  id?: string;
  userId: string;
  projectId: string;
  
  /** 
   * PROJECT ROLE - What the user does on THIS project
   * Examples: "contractor", "inspector", "lead_project_manager"
   * 
   * NOTE: This is NOT the user's system permission! A user with "manager" 
   * system permission can be assigned as "contractor" project role on a project.
   * 
   * @deprecated Use projectRole instead. category is kept for backward compatibility.
   */
  category: UserCategory;
  
  /**
   * PROJECT ROLE - What the user does on THIS project
   * 
   * This defines the user's capacity on this specific project, not their
   * system-wide permissions.
   * 
   * Stored in: user_project_assignments.category (database field name for backward compatibility)
   */
  projectRole?: ProjectRole;
  
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
   * PROJECT ROLE - What the user does on THIS project
   * Optional in new system, defined by roleId instead
   * 
   * @deprecated Use projectRole instead. category is kept for backward compatibility.
   */
  category?: UserCategory;
  
  /**
   * PROJECT ROLE - What the user does on THIS project
   * 
   * This defines the user's capacity on this specific project.
   * Stored in: user_project_assignments.category (database field name for backward compatibility)
   */
  projectRole?: ProjectRole;
  
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
   * SYSTEM PERMISSION - System-wide permission level
   * 
   * Values: "admin" | "manager" | "member"
   * 
   * This determines what the user CAN do across the entire system:
   * - admin: Full access to everything
   * - manager: Can manage projects, tasks, and assign users
   * - member: Limited to viewing assigned tasks (formerly "worker")
   * 
   * @deprecated Use systemPermission instead. role is kept for backward compatibility.
   */
  role: UserRole;
  
  /**
   * SYSTEM PERMISSION - System-wide permission level
   * 
   * This determines what the user CAN do across the entire system:
   * - admin: Full access to everything
   * - manager: Can manage projects, tasks, and assign users
   * - member: Limited to viewing assigned tasks
   * 
   * Stored in: users.role (database field name for backward compatibility)
   * Scope: System-wide
   */
  systemPermission?: SystemPermission;

  /**
   * Deployable seat (PM vs Worker) — independent of company-admin authority.
   * CA (`admin`) defaults to worker when unset. Set to `pm` when CA is upgraded
   * to a PM seat (subject to pm_seats entitlement).
   */
  deployableSeat?: "pm" | "worker" | null;
  
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
  company_id?: string; // Legacy compatibility
  
  /** 
   * POSITION - Human-readable job position
   * 
   * Examples: "Senior Construction Manager", "Electrician", "Site Supervisor"
   * 
   * This is different from systemPermission:
   * - systemPermission: System access level (admin/manager/member)
   * - position: Actual job title for display
   */
  position: string;
  
  phone: string; // Required - primary identifier
  createdAt: string;
  updatedAt?: string;
  
  /**
   * Last selected project ID (synced across devices)
   * Stored in database for cross-device synchronization
   */
  lastSelectedProjectId?: string | null;
  
  /**
   * User approval status for joining a company
   * - isPending: true = waiting for admin approval, false = approved/active
   * - approvedBy: User ID of the admin who approved this user
   * - approvedAt: Timestamp when user was approved
   */
  isPending?: boolean;
  is_pending?: boolean; // Legacy compatibility
  approvedBy?: string | null;
  approvedAt?: string | null;
  /**
   * Soft seat flag. When false, profile is retained but the seat is vacated
   * for invite / billing caps (User Management swipe-to-inactive).
   */
  isActive?: boolean;
  is_active?: boolean;
  /** Set when login/contact were deleted; name stays for jobsite history. */
  deletedAt?: string | null;
  deleted_at?: string | null;
  /** HTTPS invite landing URL; shown on User Management until first sign-in. */
  inviteSignInLink?: string | null;
  /** Invitees must choose a password after first magic-link sign-in. */
  mustSetPassword?: boolean;
  must_set_password?: boolean;

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

/**
 * Task Status Change History
 * Tracks all status transitions for audit trail and progress display
 */
export interface TaskStatusChange {
  id: string;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string; // User ID
  changedAt: string; // Timestamp
  reason?: string; // Optional reason (for declined/rejected)
  notes?: string; // Optional additional notes
}

/**
 * Task Edit History - Audit log for task metadata changes
 * Tracks who changed what, when, and why (for fairness and transparency)
 * 
 * @deprecated Use TaskActivity with activityType 'metadata_edit' instead
 */
export interface TaskEditHistory {
  id: string;
  taskId: string;
  editedBy: string;
  editedAt: string;
  changes: Record<string, { old: any; new: any }>;
  editReason?: string;
  notificationsSent: boolean;
  notifiedAt?: string;
  createdAt: string;
}

/**
 * Unified Task Activity
 * 
 * Replaces TaskUpdate, TaskStatusChange, and TaskEditHistory with a single
 * unified structure that tracks all task activities in chronological order.
 * 
 * All task changes (progress updates, status changes, metadata edits, etc.)
 * are now tracked in the task_activities table.
 */
export type ActivityType = 
  | 'progress_update'
  | 'status_change'
  | 'metadata_edit'
  | 'assignment'
  | 'creation'
  | 'cancellation'
  | 'review_submission'
  | 'review_acceptance'
  | 'review_rejection'
  | 'assigner_comment'
  | 'delegation_added'
  | 'delegation_removed'
  | 'photo_batch_attached'
  | 'draft_completed'
  | 'issue_reported'
  | 'triaged_to_task'
  | 'issue_dismissed'
  | 'issue_resolved';

// Type-specific data structures for each activity type
export interface ProgressUpdateData {
  description: string;
  photos: string[];
  completionPercentage: number;
  status: TaskStatus;
}

export interface StatusChangeData {
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  reason?: string;
  notes?: string;
}

export interface MetadataEditData {
  changes: Record<string, { old: any; new: any }>;
  editReason?: string;
}

export interface AssignmentData {
  assignedTo: string[];
  assignedBy: string;
}

export interface CreationData {
  title: string;
  assignedTo: string[];
  assignedBy: string;
}

export interface CancellationData {
  reason?: string;
}

export interface ReviewSubmissionData {
  completionPercentage: number;
}

export interface ReviewAcceptanceData {
  reviewedBy: string;
}

export interface ReviewRejectionData {
  reviewedBy: string;
  reason: string;
}

export interface AssignerCommentData {
  description: string;
  photos: string[];
  completionPercentage?: number; // Completion percentage at the time of the comment
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  activityType: ActivityType;
  timestamp: string;
  
  // Activity-specific data (type-safe based on activityType)
  data: 
    | ProgressUpdateData
    | StatusChangeData
    | MetadataEditData
    | AssignmentData
    | CreationData
    | CancellationData
    | ReviewSubmissionData
    | ReviewAcceptanceData
    | ReviewRejectionData
    | AssignerCommentData;
  
  // Common fields
  description: string; // Human-readable description
  completionPercentage?: number; // Snapshot at time of activity (0-100)
  status?: TaskStatus; // Snapshot at time of activity
  
  // Notification tracking
  notificationsSent?: boolean;
  notifiedAt?: string;
  
  createdAt: string;
}

/**
 * TASK (Unified)
 * 
 * After migration: tasks and sub_tasks are now unified into a single table.
 * - Top-level tasks have parentTaskId = null
 * - Nested tasks have parentTaskId set to their parent
 * - Unlimited nesting depth via self-referential structure
 */
export interface Task {
  id: string;
  projectId: string;
  
  // ✅ NEW: Self-referential parent for unlimited nesting
  parentTaskId?: string | null; // NULL = top-level task, UUID = nested task
  nestingLevel?: number; // 0 = top-level, 1+ = nested depth
  rootTaskId?: string | null; // Reference to the top-level task in the tree
  
  // Core fields
  title: string;
  description: string;
  taskReference?: string; // Optional task reference number
  billingStatus?: BillingStatus; // Billing status: "billable", "non_billable", or "billed" (defaults to "non_billable")
  priority: Priority;
  dueDate: string;
  category: TaskCategory;
  attachments: string[];
  locationOnSite?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  assignedTo: string[];
  primaryAssigneeId?: string;
  delegatedUserIds?: string[];
  assignedBy: string;
  originalAssignedBy?: string; // Original creator before any delegation
  containerId?: string;
  subContainerId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  updates: TaskUpdate[];
  
  // UNIFIED STATUS (replaces currentStatus, accepted, readyForReview, reviewAccepted)
  status: TaskStatus;
  currentStatus?: TaskStatus; // Legacy compatibility
  completionPercentage: number; // 0-100
  
  // STATUS METADATA (for logging and history)
  statusHistory?: TaskStatusChange[]; // Array of all status changes (loaded separately) - @deprecated use activities
  declinedReason?: string; // Reason when status = "declined" (renamed from declineReason)
  declineReason?: string; // Legacy compatibility
  rejectedReason?: string; // Reason when status = "rejected"
  
  // UNIFIED ACTIVITY LOG (replaces updates, statusHistory, and editHistory)
  activities?: TaskActivity[]; // All task activities in chronological order
  
  // AUDIT TRAIL FIELDS (kept for historical tracking)
  acceptedBy?: string; // User ID who accepted (when status changes to "accepted")
  accepted?: boolean; // Legacy compatibility
  acceptedAt?: string | null; // When status changed to "accepted"
  reviewedBy?: string | null; // User ID who reviewed (when status changes to "approved"/"rejected")
  reviewedAt?: string | null; // When status changed to "approved"/"rejected"
  
  // Client-side only: Children loaded dynamically
  children?: Task[]; // For tree rendering - populated by app logic
  subTasks?: Task[]; // Legacy compatibility
  assigneesLocked?: boolean; // Legacy compatibility
  
  delegationHistory?: Array<{
    fromUserId: string;
    toUserId: string;
    reason?: string;
    timestamp: string;
  }>;
  
  // Today's Tasks feature
  starredByUsers?: string[];
  
  // Cancellation (soft delete)
  cancelledAt?: string | null; // Timestamp when cancelled, null if not cancelled
  cancelledBy?: string; // User ID who cancelled the task
  
  // Deletion (soft delete - for audit trail)
  deletedAt?: string | null; // Timestamp when deleted, null if not deleted
  deletedBy?: string; // User ID who deleted the task (only assigner can delete)
  
  // Archiving (soft delete)
  archivedAt?: string | null; // Timestamp when archived, null if not archived
  archivedBy?: string; // User ID who archived the task
  
  // Edit history and notifications
  editHistory?: TaskEditHistory[]; // Loaded separately or on-demand - @deprecated use activities
  hasUnreadChanges?: boolean; // Flag for assignees to know task was edited
  lastEditedAt?: string; // When was it last edited
  
  // Note: activities array above replaces updates, statusHistory, and editHistory
  // For backward compatibility, old fields are kept but should use activities instead
}

/**
 * @deprecated SubTask type is deprecated. Use Task with parentTaskId instead.
 * This type alias is kept for backward compatibility during migration.
 */
export type SubTask = Task;

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

// ============================================
// HELPER FUNCTIONS FOR PERMISSIONS AND ROLES
// ============================================

/**
 * Get the system permission from a user, handling both old (role) and new (systemPermission) fields
 * Also handles backward compatibility with "worker" → "member" migration
 */
export function getUserSystemPermission(user: User): SystemPermission {
  // Prefer new field if available
  if (user.systemPermission) {
    return user.systemPermission;
  }

  // Fall back to old field and migrate "worker" to "member"
  if (user.role === "worker") {
    return "member";
  }

  // Live DB vocabulary (M-SUPABASE-03a): supervisor = PM seat; company_admin = CA
  if (user.role === "supervisor" || user.role === "manager") {
    return "manager";
  }
  if (user.role === "admin" || user.role === "company_admin") {
    return "admin";
  }
  if (user.role === "member") {
    return "member";
  }

  // Default fallback
  return "member";
}

/**
 * Check if a user has a specific system permission
 */
export function hasSystemPermission(user: User | null | undefined, permission: SystemPermission): boolean {
  if (!user) return false;
  return getUserSystemPermission(user) === permission;
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User | null | undefined): boolean {
  return hasSystemPermission(user, "admin");
}

/**
 * Check if a user is a manager or admin
 */
export function isManagerOrAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const perm = getUserSystemPermission(user);
  return perm === "admin" || perm === "manager";
}

/**
 * Get the project role from an assignment, handling both old (category) and new (projectRole) fields
 */
export function getProjectRole(assignment: UserProjectAssignment | UserProjectRole): ProjectRole {
  // Prefer new field if available
  if ('projectRole' in assignment && assignment.projectRole) {
    return assignment.projectRole;
  }
  
  // Fall back to old field
  if ('category' in assignment && assignment.category) {
    return assignment.category as ProjectRole;
  }
  
  // Default fallback (shouldn't happen in practice)
  return "worker";
}

/**
 * Check if a user is a Lead Project Manager on a specific project
 */
export function isLeadProjectManager(assignment: UserProjectAssignment | UserProjectRole | null | undefined): boolean {
  if (!assignment) return false;
  return getProjectRole(assignment) === "lead_project_manager";
}
