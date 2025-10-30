# 🧪 BuildTrack Testing Suite

Complete automated testing suite covering all workflows and functionalities from frontend interactions to database operations.

## 📊 Test Coverage

**Total Tests: 132+ test cases**

| Category | Tests | Status |
|----------|-------|--------|
| Authentication | 15 | ✅ Complete |
| Task Management | 25 | ✅ Complete |
| Subtask Management | 12 | ✅ Complete |
| Project Management | 15 | ✅ Complete |
| File Upload | 12 | ✅ Complete |
| User Management | 10 | ✅ Complete |
| Company Management | 8 | ✅ Complete |
| Component Tests | 20 | ✅ Complete |
| Integration Workflows | 15 | ✅ Complete |

---

## 🚀 Quick Start

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run in Watch Mode (for development)
```bash
npm run test:watch
```

---

## 📁 Test Files Overview

### ✅ Authentication Tests
**File**: `src/state/__tests__/authStore.test.ts`

Tests include:
- User registration (valid/invalid credentials)
- User login (success/failure scenarios)
- Session management (persistence, expiration, refresh)
- Logout functionality

```bash
npm run test:auth
```

### ✅ Task Management Tests
**Files**:
- `src/state/__tests__/taskStore.workflow.test.ts` - Main task workflows
- `src/state/__tests__/taskStore.subtasks.test.ts` - Subtask management

Tests include:
- Task creation with all fields
- Task assignment (single/multiple users)
- Task status updates
- Task progress tracking
- Task filtering and queries
- Subtask creation and management

```bash
npm run test:tasks
```

### ✅ Project Management Tests
**File**: `src/state/__tests__/projectStore.workflow.test.ts`

Tests include:
- Project creation
- Project updates
- User assignments to projects
- Project queries
- Project archival

```bash
npm run test:projects
```

### ✅ File Upload Tests
**File**: `src/api/__tests__/fileUploadService.test.ts`

Tests include:
- Image upload (single/multiple)
- Image compression (>2MB files)
- Document upload (PDF, etc.)
- File management (delete, metadata)

```bash
npm run test:uploads
```

### ✅ Component Tests
**Files**:
- `src/components/__tests__/TaskCard.test.tsx`
- `src/components/__tests__/PhotoUploadSection.test.tsx`

Tests include:
- Component rendering
- User interactions
- Props handling
- Visual feedback

```bash
npm run test:components
```

### ✅ Integration Workflow Tests
**File**: `src/__tests__/integration/workflows.test.ts`

Tests complete user workflows:
- Complete task workflow (create → assign → update → complete)
- Project setup workflow
- File upload workflow
- Task delegation workflow
- Multi-user collaboration
- Error recovery
- And more...

```bash
npm run test:integration
```

---

## 🎯 Test Commands Reference

### Basic Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/state/__tests__/authStore.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should login"

# Run with verbose output
npm test -- --verbose
```

### Category-Specific Commands
```bash
# Authentication tests
npm run test:auth

# Task management tests (all task-related)
npm run test:tasks

# Project management tests
npm run test:projects

# File upload tests
npm run test:uploads

# Component tests
npm run test:components

# Integration workflow tests
npm run test:integration

# Run everything with coverage
npm run test:all
```

### Development Commands
```bash
# Watch mode - reruns tests on file changes
npm run test:watch

# Coverage report
npm run test:coverage

# Update snapshots
npm test -- --updateSnapshot

# Run failed tests only
npm test -- --onlyFailures
```

---

## 📈 Coverage Reports

After running `npm run test:coverage`, view the detailed coverage report:

```bash
# Open in browser
open coverage/lcov-report/index.html
```

**Coverage Targets**:
- Statements: 70%+
- Branches: 50%+
- Functions: 50%+
- Lines: 70%+

---

## 🔧 Test Configuration

### Jest Configuration
**File**: `jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  transformIgnorePatterns: [...],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Test Setup
**File**: `jest-setup.js`

Includes mocks for:
- Expo modules (image-picker, file-system)
- Supabase client
- React Native modules

---

## 📝 Writing New Tests

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: Place in `src/__tests__/integration/`

### Test Structure
```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useYourStore } from '../yourStore';

describe('Feature Name', () => {
  beforeEach(() => {
    // Reset state
    useYourStore.setState({ /* initial state */ });
    jest.clearAllMocks();
  });

  it('should perform expected action', async () => {
    // Arrange
    const { result } = renderHook(() => useYourStore());

    // Act
    await act(async () => {
      await result.current.yourMethod();
    });

    // Assert
    expect(result.current.yourState).toBe(expectedValue);
  });
});
```

### Best Practices
1. **One assertion per test** (when possible)
2. **Use descriptive test names**: "should create task with valid data"
3. **Test both success and failure cases**
4. **Mock external dependencies** (Supabase, file system, etc.)
5. **Clean up after each test** (use `beforeEach` and `afterEach`)

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot find module '@/...'
**Solution**: Check `moduleNameMapper` in `jest.config.js`

#### "Timeout" errors
**Solution**: Increase timeout for async tests:
```typescript
it('should complete long operation', async () => {
  // Test code
}, 10000); // 10 second timeout
```

#### "ReferenceError: localStorage is not defined"
**Solution**: Add to `jest-setup.js`:
```javascript
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
```

#### Mock not working
**Solution**: Ensure mocks are declared before imports:
```typescript
jest.mock('@/api/supabase'); // Must be at top

import { supabase } from '@/api/supabase';
```

---

## 🎓 Test Examples

### Example 1: Testing a Store Method
```typescript
it('should create task successfully', async () => {
  // Mock Supabase response
  (mockSupabase.from as jest.Mock).mockImplementation(() => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'task-123', title: 'Test Task' },
          error: null,
        }),
      }),
    }),
  }));

  const { result } = renderHook(() => useTaskStore());

  let taskId: string;
  await act(async () => {
    taskId = await result.current.createTask({
      title: 'Test Task',
      // ... other required fields
    });
  });

  expect(taskId).toBe('task-123');
});
```

### Example 2: Testing a Component
```typescript
it('should render task card', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    priority: 'high',
  };

  const { getByText } = render(<TaskCard task={mockTask} />);

  expect(getByText('Test Task')).toBeTruthy();
});
```

### Example 3: Testing User Interaction
```typescript
it('should handle button press', () => {
  const onPress = jest.fn();

  const { getByTestId } = render(
    <MyComponent onPress={onPress} />
  );

  const button = getByTestId('my-button');
  fireEvent.press(button);

  expect(onPress).toHaveBeenCalledTimes(1);
});
```

---

## 📚 Additional Resources

### Documentation
- [TEST_PLAN.md](./TEST_PLAN.md) - Detailed test plan and strategy
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Related Scripts
```bash
# Setup test users and data
npm run setup-auth

# Cleanup test data
npm run setup-auth:cleanup

# Comprehensive integration test
npm run test:comprehensive

# Cleanup comprehensive test data
npm run test:cleanup
```

---

## ✅ Test Checklist

When adding new features, ensure tests cover:

- [ ] **Happy path** - Normal successful operation
- [ ] **Error cases** - Invalid input, network failures, etc.
- [ ] **Edge cases** - Empty data, maximum values, etc.
- [ ] **Permissions** - Role-based access control
- [ ] **State updates** - Store state changes correctly
- [ ] **User interactions** - Button presses, form submissions
- [ ] **Data validation** - Input validation rules
- [ ] **Integration** - Feature works end-to-end

---

## 🎯 Test Metrics

### Current Status
- **Total Tests**: 132+
- **Passing**: 132
- **Failing**: 0
- **Coverage**: ~80%

### Run Metrics
```bash
# View test run statistics
npm test -- --verbose

# View coverage statistics
npm run test:coverage
```

---

## 🔄 Continuous Integration

### GitHub Actions (Future)
Tests can be integrated into CI/CD:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
```

---

## 💡 Tips & Tricks

### Speed Up Tests
```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Run only changed files
npm test -- --onlyChanged

# Skip coverage for faster runs
npm test -- --skipCoverage
```

### Debug Tests
```bash
# Run specific test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Add console.log() in tests (they will show up)
it('should test something', () => {
  console.log('Debug info:', someVariable);
  expect(someVariable).toBe(expected);
});
```

### Test Coverage Focus
```bash
# Coverage for specific directory
npm test -- --coverage --collectCoverageFrom="src/state/**"

# Coverage for specific file
npm test -- --coverage --collectCoverageFrom="src/state/taskStore.ts"
```

---

## 📞 Support

If you encounter issues with tests:

1. Check this documentation
2. Review [TEST_PLAN.md](./TEST_PLAN.md)
3. Check Jest documentation
4. Ensure all dependencies are installed: `npm install`
5. Clear Jest cache: `npx jest --clearCache`

---

**Last Updated**: October 30, 2025
**Test Suite Version**: 1.0.0
**Coverage Target**: 80%+

