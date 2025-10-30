# BuildTrack Comprehensive Test Plan

## 📋 Overview
This document outlines the complete testing strategy for BuildTrack, covering all user workflows and functionalities from frontend interactions to database operations.

## 🎯 Test Coverage Goals
- **Total Tests**: 100+ test cases
- **Coverage Target**: 80%+ code coverage
- **Test Types**: Unit, Integration, Component, E2E Workflow

---

## 📦 Test Suite Organization

### 1. Authentication Workflow Tests (15 tests)
**Location**: `src/state/__tests__/authStore.test.ts`

- ✅ User Registration
  - Register with valid email/password
  - Register with duplicate email (should fail)
  - Register with invalid email format (should fail)
  - Register with weak password (should fail)
  
- ✅ User Login
  - Login with valid credentials
  - Login with invalid credentials (should fail)
  - Login with non-existent user (should fail)
  - Login persistence across app restarts
  
- ✅ Session Management
  - Maintain session after app reload
  - Auto-logout on token expiration
  - Refresh token handling
  
- ✅ Logout
  - Successful logout
  - Clear local storage on logout
  - Redirect to login screen after logout

---

### 2. Task Management Workflow Tests (25 tests)
**Location**: `src/state/__tests__/taskStore.workflow.test.ts`

- ✅ Task Creation
  - Create task with all required fields
  - Create task with optional fields
  - Create task with attachments
  - Validate required fields
  - Set task priority levels
  - Set task categories
  
- ✅ Task Assignment
  - Assign task to single user
  - Assign task to multiple users
  - Reassign task to different user
  - Remove user from task assignment
  
- ✅ Task Status Updates
  - Update task status to in_progress
  - Update task status to completed
  - Update task status to rejected
  - Track status change history
  
- ✅ Task Updates & Progress
  - Add text update to task
  - Add photo update to task
  - Calculate completion percentage
  - Track update timestamps
  
- ✅ Task Filtering & Queries
  - Get tasks by user
  - Get tasks by project
  - Get overdue tasks
  - Get tasks by status
  - Get tasks by priority
  - Filter starred tasks ("Today's Tasks")
  
- ✅ Task Actions
  - Accept assigned task
  - Decline assigned task with reason
  - Delete task
  - Edit task details

---

### 3. Subtask Management Tests (12 tests)
**Location**: `src/state/__tests__/taskStore.subtasks.test.ts`

- ✅ Subtask Creation
  - Create subtask under parent task
  - Create nested subtask (subtask of subtask)
  - Create multiple subtasks
  
- ✅ Subtask Assignment
  - Assign subtask to user
  - Accept subtask assignment
  - Decline subtask assignment
  
- ✅ Subtask Status
  - Update subtask status
  - Update subtask completion percentage
  - Parent task completion updates when subtask completes
  
- ✅ Subtask Management
  - Edit subtask details
  - Delete subtask
  - Add updates to subtask

---

### 4. Project Management Workflow Tests (15 tests)
**Location**: `src/state/__tests__/projectStore.workflow.test.ts`

- ✅ Project Creation
  - Create project with required fields
  - Create project with optional fields
  - Create project with lead project manager
  - Validate project data
  
- ✅ Project Updates
  - Edit project name
  - Edit project description
  - Update project status
  - Update project dates
  
- ✅ User Assignments
  - Assign user to project with category
  - Remove user from project
  - Update user's project category
  - Get all users on project
  
- ✅ Project Queries
  - Get all projects
  - Get projects by user
  - Get project by ID
  - Get project statistics
  
- ✅ Project Management
  - Archive completed project
  - Delete project
  - Restore archived project

---

### 5. File Upload Workflow Tests (12 tests)
**Location**: `src/api/__tests__/fileUploadService.test.ts`

- ✅ Image Upload
  - Upload single image
  - Upload multiple images
  - Compress image before upload (>2MB)
  - Skip compression for small images (<2MB)
  
- ✅ Document Upload
  - Upload PDF document
  - Upload other document types
  - Validate file size limits
  
- ✅ Image Compression
  - Compress large image (5MB → 2MB)
  - Maintain image quality during compression
  - Handle compression errors
  
- ✅ File Management
  - Delete uploaded file
  - Get file metadata
  - Generate public URL for file

---

### 6. User Management Tests (10 tests)
**Location**: `src/state/__tests__/userStore.test.ts`

- ✅ User Profile
  - Get current user profile
  - Update user profile
  - Update user phone number
  - Update user position
  
- ✅ User Queries
  - Get all users in company
  - Get user by ID
  - Get users by role
  - Search users by name
  
- ✅ User Permissions
  - Check admin permissions
  - Check manager permissions
  - Check worker permissions

---

### 7. Company Management Tests (8 tests)
**Location**: `src/state/__tests__/companyStore.test.ts`

- ✅ Company Data
  - Fetch company information
  - Update company details
  - Update company banner
  - Update company logo
  
- ✅ Company Users
  - Get all company users
  - Get company statistics
  
- ✅ Company Settings
  - Update company contact info
  - Update license information

---

### 8. Component Tests (20 tests)

#### TaskCard Component (5 tests)
**Location**: `src/components/__tests__/TaskCard.test.tsx`

- Render task card with all data
- Display correct priority color
- Display assigned users
- Handle task press action
- Show overdue indicator

#### PhotoUploadSection Component (5 tests)
**Location**: `src/components/__tests__/PhotoUploadSection.test.tsx`

- Render upload button
- Open camera on camera button press
- Open gallery on gallery button press
- Display uploaded photos
- Handle photo deletion

#### ProjectForm Component (5 tests)
**Location**: `src/components/__tests__/ProjectForm.test.tsx`

- Render all form fields
- Validate required fields
- Handle form submission
- Display validation errors
- Pre-fill form in edit mode

#### ContactPicker Component (3 tests)
**Location**: `src/components/__tests__/ContactPicker.test.tsx`

- Display list of contacts
- Filter contacts by search
- Handle contact selection

#### FullScreenImageViewer Component (2 tests)
**Location**: `src/components/__tests__/FullScreenImageViewer.test.tsx`

- Display image in fullscreen
- Handle close action

---

### 9. Integration Workflow Tests (15 tests)
**Location**: `src/__tests__/integration/workflows.test.ts`

- ✅ Complete Task Workflow
  - Create task → Assign to user → User accepts → Add update → Mark complete
  
- ✅ Project Setup Workflow
  - Create project → Assign users → Create tasks → Assign tasks to users
  
- ✅ File Upload Workflow
  - Select image → Compress → Upload → Attach to task → View in task detail
  
- ✅ Task Delegation Workflow
  - Manager creates task → Assigns to worker → Worker creates subtasks → Assigns subtasks
  
- ✅ Status Update Workflow
  - Worker updates task → Adds photo → Updates status → Manager reviews
  
- ✅ Task Rejection Workflow
  - Worker rejects task → Provides reason → Manager reassigns
  
- ✅ Project Completion Workflow
  - Complete all tasks → Mark project as complete → Generate report
  
- ✅ User Onboarding Workflow
  - Admin creates user → User logs in → Views assigned projects → Accepts first task
  
- ✅ Multi-User Collaboration
  - Multiple users assigned to task → Each adds updates → Track all contributions
  
- ✅ Cross-Company Workflow
  - Company A creates project → Invites Company B → Company B users work on tasks
  
- ✅ Today's Tasks Workflow
  - User stars important tasks → Views "Today" filter → Completes starred tasks
  
- ✅ Overdue Task Workflow
  - Task becomes overdue → Appears in overdue filter → Manager reassigns
  
- ✅ Task History Tracking
  - Create task → Multiple updates → Status changes → View complete history
  
- ✅ Bulk Task Operations
  - Create multiple tasks → Bulk assign to users → Filter and manage
  
- ✅ Error Recovery Workflow
  - Network failure during upload → Retry mechanism → Success confirmation

---

## 🏗️ Test Structure

### Directory Organization
```
src/
├── __tests__/
│   └── integration/
│       └── workflows.test.ts
├── api/
│   └── __tests__/
│       ├── fileUploadService.test.ts
│       ├── imageCompressionService.test.ts
│       └── supabase.test.ts
├── components/
│   └── __tests__/
│       ├── TaskCard.test.tsx
│       ├── PhotoUploadSection.test.tsx
│       ├── ProjectForm.test.tsx
│       ├── ContactPicker.test.tsx
│       └── FullScreenImageViewer.test.tsx
├── state/
│   └── __tests__/
│       ├── authStore.test.ts
│       ├── taskStore.workflow.test.ts
│       ├── taskStore.subtasks.test.ts
│       ├── projectStore.workflow.test.ts
│       ├── userStore.test.ts
│       └── companyStore.test.ts
└── utils/
    └── __tests__/
        ├── useFileUpload.test.ts
        └── databaseUtils.test.ts
```

---

## 📊 Test Metrics

| Category | Test Count | Priority |
|----------|-----------|----------|
| Authentication | 15 | High |
| Task Management | 25 | High |
| Subtask Management | 12 | Medium |
| Project Management | 15 | High |
| File Upload | 12 | High |
| User Management | 10 | Medium |
| Company Management | 8 | Low |
| Component Tests | 20 | Medium |
| Integration Workflows | 15 | High |
| **TOTAL** | **132** | - |

---

## 🚀 Implementation Order

### Phase 1: Core Workflows (Priority: High)
1. Authentication tests
2. Task management tests
3. Project management tests
4. File upload tests

### Phase 2: Integration (Priority: High)
5. Integration workflow tests
6. End-to-end user journeys

### Phase 3: Components (Priority: Medium)
7. Component interaction tests
8. UI component tests

### Phase 4: Supporting Features (Priority: Medium/Low)
9. User management tests
10. Company management tests
11. Utility tests

---

## ✅ Success Criteria

- [ ] All 132 tests passing
- [ ] 80%+ code coverage
- [ ] All critical workflows tested
- [ ] Tests run in CI/CD pipeline
- [ ] Test execution time < 5 minutes
- [ ] Zero flaky tests

---

## 📝 Test Conventions

### Naming
- Test files: `*.test.ts` or `*.test.tsx`
- Test descriptions: Use "should" format
- Example: `it('should create task with valid data', ...)`

### Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should perform expected action', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Mocking
- Mock Supabase for all database operations
- Mock file system for upload tests
- Mock AsyncStorage for persistence tests
- Use real implementations where possible

---

## 🔧 Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test taskStore.workflow

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run integration tests only
npm test -- integration
```

---

*Last Updated: October 30, 2025*

