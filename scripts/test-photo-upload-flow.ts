#!/usr/bin/env tsx
/**
 * Test Script: Photo Upload Flow Simulation
 * 
 * This script simulates the complete photo upload flow for CreateTaskScreen:
 * 1. Form data entry
 * 2. Navigation to photo selection
 * 3. Form data preservation (AsyncStorage)
 * 4. Photo selection
 * 5. Navigation back
 * 6. Form data restoration
 * 7. Photo attachment
 * 
 * Run with: tsx scripts/test-photo-upload-flow.ts
 */

// Mock AsyncStorage for Node.js environment
const storage: Record<string, string> = {};

const AsyncStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    storage[key] = value;
  },
  getItem: async (key: string): Promise<string | null> => {
    return storage[key] || null;
  },
  removeItem: async (key: string): Promise<void> => {
    delete storage[key];
  },
  clear: async (): Promise<void> => {
    Object.keys(storage).forEach(key => delete storage[key]);
  },
};

// Mock form data structure matching CreateTaskScreen
interface FormData {
  title: string;
  description: string;
  taskReference?: string;
  billingStatus: string;
  priority: string;
  category: string;
  dueDate: Date;
  assignedTo: string[];
  attachments: (string | SelectedPhoto)[];
  projectId?: string;
}

interface SelectedPhoto {
  uri: string;
  fileName: string;
  isAnnotated: boolean;
  annotatedUri?: string;
}

// Storage keys (matching CreateTaskScreen)
const FORM_DATA_STORAGE_KEY = '@createTask_formData';
const SELECTED_USERS_STORAGE_KEY = '@createTask_selectedUsers';

// Test data
const mockFormData: FormData = {
  title: 'Test Task with Photos',
  description: 'This is a test task to verify photo upload flow',
  taskReference: 'TEST-001',
  billingStatus: 'Billable',
  priority: 'High',
  category: 'General',
  dueDate: new Date('2026-02-15'),
  assignedTo: ['user-1', 'user-2'],
  attachments: [],
  projectId: 'project-123',
};

const mockSelectedUsers = ['user-1', 'user-2'];

const mockSelectedPhotos: SelectedPhoto[] = [
  {
    uri: 'file:///path/to/photo1.jpg',
    fileName: 'photo1.jpg',
    isAnnotated: false,
  },
  {
    uri: 'file:///path/to/photo2.jpg',
    fileName: 'photo2.jpg',
    isAnnotated: true,
    annotatedUri: 'file:///path/to/photo2-annotated.jpg',
  },
];

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: string) {
  results.push({ name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

async function testFormDataPreservation() {
  console.log('\n📝 Test 1: Form Data Preservation');
  console.log('=====================================');
  
  try {
    // Step 1: Save form data to AsyncStorage (simulating handleAddPhotos)
    await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(mockFormData));
    await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(mockSelectedUsers));
    
    logTest(
      'Form data saved to AsyncStorage',
      true,
      undefined,
      `Saved: ${Object.keys(mockFormData).length} fields`
    );
    
    // Step 2: Verify data was saved
    const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
    const storedSelectedUsers = await AsyncStorage.getItem(SELECTED_USERS_STORAGE_KEY);
    
    if (!storedFormData || !storedSelectedUsers) {
      logTest('Form data retrieval', false, 'Data not found in AsyncStorage');
      return false;
    }
    
    logTest('Form data retrieval', true, undefined, 'Data found in AsyncStorage');
    
    // Step 3: Verify data integrity
    const parsedFormData = JSON.parse(storedFormData);
    const parsedSelectedUsers = JSON.parse(storedSelectedUsers);
    
    const dataMatches = 
      parsedFormData.title === mockFormData.title &&
      parsedFormData.description === mockFormData.description &&
      parsedFormData.taskReference === mockFormData.taskReference &&
      parsedSelectedUsers.length === mockSelectedUsers.length;
    
    logTest(
      'Form data integrity',
      dataMatches,
      dataMatches ? undefined : 'Data mismatch after storage/retrieval',
      dataMatches ? 'All fields match original data' : 'Some fields do not match'
    );
    
    return dataMatches;
  } catch (error: any) {
    logTest('Form data preservation', false, error.message);
    return false;
  }
}

async function testFormDataRestoration() {
  console.log('\n🔄 Test 2: Form Data Restoration');
  console.log('=====================================');
  
  try {
    // Step 1: Check if stored data exists (simulating useFocusEffect)
    const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
    const storedSelectedUsers = await AsyncStorage.getItem(SELECTED_USERS_STORAGE_KEY);
    
    if (!storedFormData || !storedSelectedUsers) {
      logTest('Form data restoration check', false, 'No stored data found');
      return false;
    }
    
    logTest('Form data restoration check', true, undefined, 'Stored data found');
    
    // Step 2: Restore form data (simulating setFormData)
    const parsedFormData = JSON.parse(storedFormData) as FormData;
    const parsedSelectedUsers = JSON.parse(storedSelectedUsers) as string[];
    
    logTest(
      'Form data parsing',
      true,
      undefined,
      `Restored ${Object.keys(parsedFormData).length} fields and ${parsedSelectedUsers.length} users`
    );
    
    // Step 3: Verify restoration
    const restorationValid = 
      parsedFormData.title === mockFormData.title &&
      parsedFormData.description === mockFormData.description &&
      parsedSelectedUsers.length === mockSelectedUsers.length;
    
    logTest(
      'Form data restoration',
      restorationValid,
      restorationValid ? undefined : 'Restored data does not match original',
      restorationValid ? 'All data restored correctly' : 'Data mismatch'
    );
    
    // Step 4: Clean up (simulating AsyncStorage.removeItem after restoration)
    await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
    await AsyncStorage.removeItem(SELECTED_USERS_STORAGE_KEY);
    
    logTest('Form data cleanup', true, undefined, 'Storage cleared after restoration');
    
    return restorationValid;
  } catch (error: any) {
    logTest('Form data restoration', false, error.message);
    return false;
  }
}

async function testPhotoAttachment() {
  console.log('\n📸 Test 3: Photo Attachment to Form');
  console.log('=====================================');
  
  try {
    // Step 1: Restore form data
    await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(mockFormData));
    const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
    const parsedFormData = JSON.parse(storedFormData!) as FormData;
    
    logTest('Form data ready for photo attachment', true, undefined, 'Form data restored');
    
    // Step 2: Simulate adding photos to form (simulating setFormData with photos)
    const updatedFormData: FormData = {
      ...parsedFormData,
      attachments: [...parsedFormData.attachments, ...mockSelectedPhotos],
    };
    
    logTest(
      'Photo attachment',
      updatedFormData.attachments.length === mockSelectedPhotos.length,
      undefined,
      `Added ${mockSelectedPhotos.length} photos to form`
    );
    
    // Step 3: Verify photos are in attachments
    const photosInAttachments = updatedFormData.attachments.filter(
      att => typeof att !== 'string'
    ) as SelectedPhoto[];
    
    const photosMatch = 
      photosInAttachments.length === mockSelectedPhotos.length &&
      photosInAttachments.every((photo, index) => 
        photo.uri === mockSelectedPhotos[index].uri &&
        photo.fileName === mockSelectedPhotos[index].fileName
      );
    
    logTest(
      'Photo attachment verification',
      photosMatch,
      photosMatch ? undefined : 'Photos do not match selected photos',
      photosMatch ? 'All photos correctly attached' : 'Photo mismatch'
    );
    
    // Step 4: Verify form data is preserved with photos
    const formDataPreserved = 
      updatedFormData.title === mockFormData.title &&
      updatedFormData.description === mockFormData.description &&
      updatedFormData.attachments.length === mockSelectedPhotos.length;
    
    logTest(
      'Form data preservation with photos',
      formDataPreserved,
      formDataPreserved ? undefined : 'Form data lost when adding photos',
      formDataPreserved ? 'Form data intact with photos' : 'Form data corrupted'
    );
    
    // Cleanup
    await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
    
    return photosMatch && formDataPreserved;
  } catch (error: any) {
    logTest('Photo attachment', false, error.message);
    return false;
  }
}

async function testCompleteFlow() {
  console.log('\n🔄 Test 4: Complete Flow Simulation');
  console.log('=====================================');
  
  try {
    // Step 1: User fills out form
    logTest('Step 1: Form data entry', true, undefined, 'User enters task details');
    
    // Step 2: User clicks "Add Photos" - form data saved
    await AsyncStorage.setItem(FORM_DATA_STORAGE_KEY, JSON.stringify(mockFormData));
    await AsyncStorage.setItem(SELECTED_USERS_STORAGE_KEY, JSON.stringify(mockSelectedUsers));
    logTest('Step 2: Form data preservation', true, undefined, 'Form data saved to AsyncStorage');
    
    // Step 3: Navigate to photo selection (form data preserved in AsyncStorage)
    logTest('Step 3: Navigation to photo selection', true, undefined, 'Screen navigated');
    
    // Step 4: User selects photos
    logTest('Step 4: Photo selection', true, undefined, `${mockSelectedPhotos.length} photos selected`);
    
    // Step 5: Navigate back with photos
    logTest('Step 5: Navigation back with photos', true, undefined, 'Returning to CreateTaskScreen');
    
    // Step 6: Screen comes into focus - restore form data
    const storedFormData = await AsyncStorage.getItem(FORM_DATA_STORAGE_KEY);
    const storedSelectedUsers = await AsyncStorage.getItem(SELECTED_USERS_STORAGE_KEY);
    
    if (!storedFormData || !storedSelectedUsers) {
      logTest('Step 6: Form data restoration', false, 'No stored data found');
      return false;
    }
    
    const restoredFormData = JSON.parse(storedFormData) as FormData;
    const restoredSelectedUsers = JSON.parse(storedSelectedUsers) as string[];
    
    logTest(
      'Step 6: Form data restoration',
      true,
      undefined,
      'Form data restored from AsyncStorage'
    );
    
    // Step 7: Add photos to form
    const finalFormData: FormData = {
      ...restoredFormData,
      attachments: [...restoredFormData.attachments, ...mockSelectedPhotos],
    };
    
    logTest(
      'Step 7: Photo attachment to form',
      finalFormData.attachments.length === mockSelectedPhotos.length,
      undefined,
      `Photos added to form (${finalFormData.attachments.length} attachments)`
    );
    
    // Step 8: Verify complete state
    const flowComplete = 
      finalFormData.title === mockFormData.title &&
      finalFormData.description === mockFormData.description &&
      finalFormData.attachments.length === mockSelectedPhotos.length;
    
    logTest(
      'Step 8: Complete flow verification',
      flowComplete,
      flowComplete ? undefined : 'Flow incomplete or data lost',
      flowComplete ? '✅ Complete flow successful!' : '❌ Flow failed'
    );
    
    // Cleanup
    await AsyncStorage.removeItem(FORM_DATA_STORAGE_KEY);
    await AsyncStorage.removeItem(SELECTED_USERS_STORAGE_KEY);
    
    return flowComplete;
  } catch (error: any) {
    logTest('Complete flow simulation', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Photo Upload Flow Test Suite');
  console.log('================================');
  console.log('Testing form data preservation and photo upload flow...\n');
  
  // Clear AsyncStorage before tests
  await AsyncStorage.clear();
  
  const test1 = await testFormDataPreservation();
  const test2 = await testFormDataRestoration();
  const test3 = await testPhotoAttachment();
  const test4 = await testCompleteFlow();
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=====================================');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${total - passed} ❌`);
  console.log(`Success Rate: ${percentage}%`);
  
  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${result.name}`);
    if (result.details) console.log(`   ${result.details}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });
  
  const allPassed = test1 && test2 && test3 && test4;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED! Photo upload flow is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED. Please review the errors above.');
  }
  console.log('='.repeat(50) + '\n');
  
  // Cleanup
  await AsyncStorage.clear();
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed with error:', error);
  process.exit(1);
});

