# 🧪 Automated Frontend Testing Guide for BuildTrack

## Overview

Automated testing for React Native/Expo apps can be implemented at three levels:

1. **Unit Tests** - Test individual functions and components (Jest + React Native Testing Library)
2. **Integration Tests** - Test component interactions and state management
3. **E2E Tests** - Test full user flows (Detox or Maestro)

---

## 📊 Testing Strategy Recommendation

### For BuildTrack, I recommend:

```
┌─────────────────────────────────────────────────────────┐
│                  TESTING PYRAMID                         │
└─────────────────────────────────────────────────────────┘

                    ▲
                   ╱ ╲
                  ╱ E2E╲         Few (10-20 tests)
                 ╱ Tests╲        Critical user flows
                ╱─────────╲       Maestro/Detox
               ╱           ╲
              ╱ Integration╲     Moderate (30-50 tests)
             ╱    Tests     ╲    Component interactions
            ╱───────────────╲   React Native Testing Library
           ╱                 ╲
          ╱   Unit Tests      ╲  Many (100+ tests)
         ╱                     ╲ Functions, utilities
        ╱───────────────────────╲ Jest
```

**Priority Order:**
1. ⚡ **Unit Tests** (Start here - easiest, fastest)
2. 🔶 **Integration Tests** (Medium priority)
3. 🟡 **E2E Tests** (Nice to have, more complex)

---

## 🚀 Quick Start: Unit Testing (Jest)

### 1. Setup (Already included with Expo!)

Good news: Jest is already configured in Expo projects!

Check your `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

If not present, add it.

### 2. Install Testing Libraries

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

### 3. Configure Jest

Create/update `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### 4. Create `jest-setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock Supabase
jest.mock('./src/api/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } })),
      })),
    },
  },
}));

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

---

## 📝 Example Tests

### 1. Unit Test: Image Compression Service

Create `src/api/__tests__/imageCompressionService.test.ts`:

```typescript
import { compressImage, formatFileSize, needsCompression } from '../imageCompressionService';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Mock the Expo modules
jest.mock('expo-image-manipulator');
jest.mock('expo-file-system');

describe('imageCompressionService', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1048576)).toBe('1.00 MB');
      expect(formatFileSize(5242880)).toBe('5.00 MB');
    });
  });

  describe('needsCompression', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true for files larger than target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 3 * 1024 * 1024, // 3MB
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(true);
    });

    it('returns false for files smaller than target', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1 * 1024 * 1024, // 1MB
      });

      const result = await needsCompression('test.jpg', 2 * 1024 * 1024);
      expect(result).toBe(false);
    });
  });

  describe('compressImage', () => {
    it('compresses large images', async () => {
      // Mock file info
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024, // 5MB
      });

      // Mock image manipulation
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'compressed.jpg',
        width: 1920,
        height: 1440,
      });

      const result = await compressImage('test.jpg', 2 * 1024 * 1024);

      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });
  });
});
```

### 2. Component Test: FileAttachmentPreview

Create `src/components/__tests__/FileAttachmentPreview.test.tsx`:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FileAttachmentPreview } from '../FileAttachmentPreview';

describe('FileAttachmentPreview', () => {
  const mockAttachment = {
    id: '123',
    file_name: 'test.jpg',
    file_type: 'image' as const,
    file_size: 1024000,
    mime_type: 'image/jpeg',
    storage_path: '/path/to/file',
    public_url: 'https://example.com/test.jpg',
    entity_type: 'task' as const,
    entity_id: 'task-123',
    uploaded_by: 'user-123',
    company_id: 'company-123',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  };

  it('renders image preview correctly', () => {
    const { getByText } = render(
      <FileAttachmentPreview attachment={mockAttachment} />
    );

    expect(getByText('test.jpg')).toBeTruthy();
  });

  it('calls onDelete when delete button is pressed', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <FileAttachmentPreview 
        attachment={mockAttachment} 
        onDelete={onDelete}
      />
    );

    const deleteButton = getByTestId('delete-button');
    fireEvent.press(deleteButton);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when preview is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <FileAttachmentPreview 
        attachment={mockAttachment} 
        onPress={onPress}
      />
    );

    const preview = getByTestId('file-preview');
    fireEvent.press(preview);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('displays document icon for non-image files', () => {
    const pdfAttachment = {
      ...mockAttachment,
      file_type: 'document' as const,
      file_name: 'test.pdf',
      mime_type: 'application/pdf',
    };

    const { getByTestId } = render(
      <FileAttachmentPreview attachment={pdfAttachment} />
    );

    expect(getByTestId('document-icon')).toBeTruthy();
  });
});
```

### 3. Integration Test: File Upload Hook

Create `src/utils/__tests__/useFileUpload.test.ts`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFileUpload } from '../useFileUpload';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/api/fileUploadService';
import { compressImage } from '@/api/imageCompressionService';

jest.mock('@/api/fileUploadService');
jest.mock('@/api/imageCompressionService');

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.isCompressing).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.compressionProgress).toBe(0);
  });

  it('compresses and uploads images successfully', async () => {
    // Mock permissions
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'granted' });

    // Mock image picker
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file://test.jpg',
        fileName: 'test.jpg',
        type: 'image',
      }],
    });

    // Mock compression
    (compressImage as jest.Mock).mockResolvedValue({
      uri: 'file://compressed.jpg',
      size: 1024000,
      originalSize: 5242880,
      compressionRatio: 0.2,
      width: 1920,
      height: 1440,
    });

    // Mock upload
    (uploadFile as jest.Mock).mockResolvedValue({
      id: '123',
      file_name: 'test.jpg',
      public_url: 'https://example.com/test.jpg',
    });

    const { result } = renderHook(() => useFileUpload());

    let uploadedFiles;
    await act(async () => {
      uploadedFiles = await result.current.pickAndUploadImages({
        entityType: 'task',
        entityId: 'task-123',
        companyId: 'company-123',
        userId: 'user-123',
      }, 'library');
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isCompressing).toBe(false);
    });

    expect(compressImage).toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalled();
    expect(uploadedFiles).toHaveLength(1);
  });

  it('handles permission denial gracefully', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock)
      .mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useFileUpload());

    let uploadedFiles;
    await act(async () => {
      uploadedFiles = await result.current.pickAndUploadImages({
        entityType: 'task',
        entityId: 'task-123',
        companyId: 'company-123',
        userId: 'user-123',
      }, 'library');
    });

    expect(uploadedFiles).toHaveLength(0);
    expect(compressImage).not.toHaveBeenCalled();
  });
});
```

### 4. State Management Test: Task Store

Create `src/state/__tests__/taskStore.test.ts`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore';

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTaskStore.getState().tasks = [];
  });

  it('creates a task successfully', async () => {
    const { result } = renderHook(() => useTaskStore());

    const newTask = {
      title: 'Test Task',
      description: 'Test Description',
      priority: 'high' as const,
      category: 'general' as const,
      due_date: new Date().toISOString(),
      project_id: 'project-123',
      assigned_to: ['user-123'],
    };

    await act(async () => {
      await result.current.createTask(newTask);
    });

    await waitFor(() => {
      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    const createdTask = result.current.tasks[0];
    expect(createdTask.title).toBe('Test Task');
    expect(createdTask.priority).toBe('high');
  });

  it('updates a task successfully', async () => {
    const { result } = renderHook(() => useTaskStore());

    // Create a task first
    const taskId = 'task-123';
    act(() => {
      result.current.tasks = [{
        id: taskId,
        title: 'Original Title',
        description: 'Original Description',
        priority: 'low' as const,
        category: 'general' as const,
        due_date: new Date().toISOString(),
        current_status: 'not_started' as const,
        project_id: 'project-123',
        assigned_to: ['user-123'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
    });

    // Update the task
    await act(async () => {
      await result.current.updateTask(taskId, {
        title: 'Updated Title',
        priority: 'high' as const,
      });
    });

    const updatedTask = result.current.tasks.find(t => t.id === taskId);
    expect(updatedTask?.title).toBe('Updated Title');
    expect(updatedTask?.priority).toBe('high');
  });

  it('deletes a task successfully', async () => {
    const { result } = renderHook(() => useTaskStore());

    const taskId = 'task-123';
    act(() => {
      result.current.tasks = [{
        id: taskId,
        title: 'Task to Delete',
        description: 'Description',
        priority: 'low' as const,
        category: 'general' as const,
        due_date: new Date().toISOString(),
        current_status: 'not_started' as const,
        project_id: 'project-123',
        assigned_to: ['user-123'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
    });

    expect(result.current.tasks.length).toBe(1);

    await act(async () => {
      await result.current.deleteTask(taskId);
    });

    expect(result.current.tasks.length).toBe(0);
  });
});
```

---

## 🎯 E2E Testing with Maestro (Recommended)

Maestro is easier to set up than Detox and works great with Expo.

### 1. Install Maestro

```bash
# macOS
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH
export PATH="$PATH":"$HOME/.maestro/bin"
```

### 2. Create Test Flows

Create `maestro/login-flow.yaml`:

```yaml
appId: com.buildtrack.app
---
- launchApp
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Dashboard"
```

Create `maestro/create-task-flow.yaml`:

```yaml
appId: com.buildtrack.app
---
- launchApp
# Login first
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Dashboard"

# Navigate to tasks
- tapOn: "Tasks"
- assertVisible: "Tasks Screen"

# Create new task
- tapOn: "Create Task"
- tapOn: "Title"
- inputText: "Test Task from Maestro"
- tapOn: "Description"
- inputText: "This is a test task"
- tapOn: "Priority"
- tapOn: "High"
- tapOn: "Save"

# Verify task created
- assertVisible: "Test Task from Maestro"
```

Create `maestro/upload-photo-flow.yaml`:

```yaml
appId: com.buildtrack.app
---
- launchApp
# Login
- tapOn: "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"

# Navigate to task
- tapOn: "Tasks"
- tapOn: "Test Task"

# Upload photo
- tapOn: "Add Photos"
- tapOn: "Choose from Library"
- tapOn:
    id: "photo-selector"
    index: 0
- tapOn: "Choose"

# Wait for compression and upload
- assertVisible: "Optimizing..."
- waitForAnimationToEnd

# Verify photo uploaded
- assertVisible: "test-image.jpg"
```

### 3. Run Maestro Tests

```bash
# Start iOS simulator
npx expo run:ios

# Run a test flow
maestro test maestro/login-flow.yaml

# Run all tests
maestro test maestro/
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash
      
      - name: Build iOS app
        run: npx expo run:ios --configuration Release
      
      - name: Run Maestro tests
        run: |
          export PATH="$PATH":"$HOME/.maestro/bin"
          maestro test maestro/
```

---

## 📋 Test Coverage Goals

### Recommended Coverage Targets:

```
Unit Tests:
- Utilities/Services: 80%+ coverage
- State Management: 70%+ coverage
- Components: 60%+ coverage

Integration Tests:
- Critical flows: 100% coverage
- Common flows: 80% coverage

E2E Tests:
- Happy paths: 100% coverage
- Error scenarios: 50% coverage
```

---

## 🎯 Priority Test Cases for BuildTrack

### High Priority (Implement First):

1. **Authentication**
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials
   - [ ] Logout
   - [ ] Session persistence

2. **Task Management**
   - [ ] Create task
   - [ ] Edit task
   - [ ] Delete task
   - [ ] Update task status
   - [ ] Assign task to user

3. **File Upload** (New Feature!)
   - [ ] Upload single image
   - [ ] Upload multiple images
   - [ ] Image compression works
   - [ ] File size validation
   - [ ] Delete uploaded file

4. **State Management**
   - [ ] Task store CRUD operations
   - [ ] User store operations
   - [ ] Project store operations

### Medium Priority:

5. **Navigation**
   - [ ] Navigate between screens
   - [ ] Deep linking
   - [ ] Back button behavior

6. **Forms**
   - [ ] Form validation
   - [ ] Required fields
   - [ ] Date picker
   - [ ] Dropdown selection

### Low Priority:

7. **UI Components**
   - [ ] Component rendering
   - [ ] Button states
   - [ ] Loading states
   - [ ] Error states

---

## 📝 Example Test Script

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "maestro test maestro/",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

---

## 🚀 Quick Start Checklist

- [ ] Install testing libraries (`@testing-library/react-native`)
- [ ] Create `jest.config.js`
- [ ] Create `jest-setup.js`
- [ ] Write first unit test (e.g., `formatFileSize`)
- [ ] Write first component test (e.g., `FileAttachmentPreview`)
- [ ] Write first integration test (e.g., `useFileUpload`)
- [ ] Install Maestro (for E2E)
- [ ] Create first E2E flow (e.g., login)
- [ ] Set up GitHub Actions CI/CD
- [ ] Run tests locally
- [ ] Fix any failing tests
- [ ] Achieve 70%+ coverage

---

## 💡 Best Practices

1. **Write tests as you code** - Don't wait until the end
2. **Test behavior, not implementation** - Focus on what users see
3. **Keep tests simple** - One assertion per test when possible
4. **Use descriptive test names** - "should upload image when user selects from gallery"
5. **Mock external dependencies** - Supabase, Expo modules, etc.
6. **Test error cases** - Not just happy paths
7. **Run tests before commits** - Use git hooks (husky)
8. **Monitor coverage** - Aim for 70%+ overall

---

## 🎯 Summary

**Recommended Approach:**

1. **Start with Unit Tests** (Easiest, Fastest ROI)
   - Test utilities like `imageCompressionService`
   - Test state stores
   - Target: 50+ tests in first week

2. **Add Component Tests** (Medium Effort)
   - Test UI components
   - Test hooks
   - Target: 30+ tests in second week

3. **Implement E2E Tests** (Optional, Higher Effort)
   - Use Maestro for critical flows
   - Login, create task, upload photo
   - Target: 5-10 flows

4. **Automate in CI/CD**
   - GitHub Actions on every PR
   - Prevent merging failing tests
   - Track coverage over time

**Time Estimate:**
- Basic setup: 2-3 hours
- First 20 tests: 1-2 days
- E2E setup: 2-3 hours
- CI/CD setup: 1-2 hours

**Total: 3-5 days** for comprehensive testing infrastructure

---

**Bottom line:** Start with unit tests (easiest win), add component tests for critical features like file upload, and optionally add E2E tests with Maestro for key user flows. You'll have automated testing running in CI/CD within a week!

Ready to start? I can help you set up the initial configuration files!

