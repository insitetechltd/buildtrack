# 🧪 Testing Cheat Sheet

## ⚡ Quick Setup (Copy-Paste)

```bash
# 1. Install dependencies
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo

# 2. Run tests
npm test

# 3. Watch mode
npm test -- --watch

# 4. Coverage
npm test -- --coverage
```

---

## 📝 Common Test Patterns

### Unit Test (Function)
```typescript
// src/utils/__tests__/myFunction.test.ts
import { myFunction } from '../myFunction';

describe('myFunction', () => {
  it('returns expected value', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

### Component Test
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders text', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeTruthy();
  });
  
  it('handles press', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<MyComponent onPress={onPress} />);
    fireEvent.press(getByTestId('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Hook Test
```typescript
// src/hooks/__tests__/useMyHook.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('updates state', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.doSomething();
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

### Async Test
```typescript
it('handles async operation', async () => {
  const result = await myAsyncFunction();
  expect(result).toBe('success');
});

// Or with waitFor
it('waits for state update', async () => {
  const { result } = renderHook(() => useMyHook());
  
  act(() => {
    result.current.loadData();
  });
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
});
```

---

## 🎯 Common Assertions

```typescript
// Equality
expect(value).toBe(5);
expect(value).toEqual({ a: 1 });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3); // For floats

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');

// Arrays
expect(arr).toHaveLength(3);
expect(arr).toContain(item);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ a: 1 });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith('arg');

// Promises
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');
```

---

## 🔧 Mocking

### Mock a Function
```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));
```

### Mock a Module
```typescript
jest.mock('../myModule', () => ({
  myFunction: jest.fn(() => 'mocked'),
}));
```

### Mock Implementation
```typescript
const mockFn = jest.fn((x) => x * 2);
mockFn(5); // Returns 10
```

---

## 📁 File Structure

```
src/
├── api/
│   ├── __tests__/
│   │   └── imageCompressionService.test.ts
│   └── imageCompressionService.ts
├── components/
│   ├── __tests__/
│   │   └── MyComponent.test.tsx
│   └── MyComponent.tsx
├── utils/
│   ├── __tests__/
│   │   └── useMyHook.test.ts
│   └── useMyHook.ts
```

---

## ⚙️ Configuration Files

### jest.config.js ✅ (Already created)
### jest-setup.js ✅ (Already created)
### .github/workflows/test.yml ✅ (Already created)

---

## 📊 Coverage Commands

```bash
# Run with coverage
npm test -- --coverage

# Coverage for specific file
npm test -- --coverage src/api/imageCompressionService.ts

# Open HTML coverage report
open coverage/lcov-report/index.html
```

---

## 🎯 Test Organization

### Describe Blocks
```typescript
describe('ComponentName', () => {
  describe('method1', () => {
    it('does something', () => {});
    it('handles errors', () => {});
  });
  
  describe('method2', () => {
    it('does something else', () => {});
  });
});
```

### Before/After Hooks
```typescript
describe('MyTests', () => {
  beforeAll(() => {
    // Runs once before all tests
  });
  
  beforeEach(() => {
    // Runs before each test
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Runs after each test
  });
  
  afterAll(() => {
    // Runs once after all tests
  });
});
```

---

## 🚀 Running Tests

```bash
# All tests
npm test

# Specific file
npm test imageCompressionService

# Watch mode
npm test -- --watch

# Update snapshots
npm test -- -u

# Verbose output
npm test -- --verbose

# Run only changed files
npm test -- --onlyChanged

# Run tests matching pattern
npm test -- --testNamePattern="handles errors"
```

---

## 🐛 Debugging Tests

```typescript
// Add debugger
it('debugs test', () => {
  debugger; // Use with --inspect
  expect(value).toBe(5);
});

// Console log
it('logs value', () => {
  console.log('value:', value);
  expect(value).toBe(5);
});

// Use .only to run single test
it.only('runs only this test', () => {
  expect(true).toBe(true);
});

// Use .skip to skip test
it.skip('skips this test', () => {
  expect(true).toBe(true);
});
```

---

## 📋 Test Checklist

### Unit Test Checklist:
- [ ] Happy path tested
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Null/undefined handled
- [ ] Empty inputs tested

### Component Test Checklist:
- [ ] Renders correctly
- [ ] Props work
- [ ] Events fire
- [ ] States update
- [ ] Conditional rendering

### Integration Test Checklist:
- [ ] Full flow works
- [ ] State updates correctly
- [ ] API calls made
- [ ] Errors handled
- [ ] Loading states work

---

## 🎯 Priority Order

1. **Critical functions** (authentication, payments)
2. **Business logic** (calculations, validations)
3. **State management** (stores, reducers)
4. **Utilities** (formatters, helpers)
5. **Components** (UI elements)
6. **Integration** (full flows)

---

## 💡 Quick Tips

✅ **DO:**
- Test behavior, not implementation
- Keep tests simple and focused
- Use descriptive test names
- Mock external dependencies
- Test error cases

❌ **DON'T:**
- Test third-party libraries
- Test implementation details
- Write tests that depend on each other
- Ignore failing tests
- Aim for 100% coverage

---

## 📚 Resources

- **Full Guide:** `AUTOMATED_TESTING_GUIDE.md`
- **Quick Start:** `TESTING_QUICK_START.md`
- **Summary:** `TESTING_SETUP_SUMMARY.md`

---

## ⚡ Most Common Commands

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm test myFile             # Specific file
```

---

**That's it! Start testing! 🧪**

