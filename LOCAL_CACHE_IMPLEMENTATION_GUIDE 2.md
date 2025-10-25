# 📦 Local File Caching Implementation Guide

## Overview
This guide outlines critical considerations for implementing local caching of photos and documents in BuildTrack, with a 500MB cache limit, local-first upload strategy, and cloud sync notifications.

---

## 🎯 Your Requirements

1. **Cache Limit**: Maximum 500MB on device
2. **Upload Flow**: Save locally first → Upload to Supabase Storage
3. **Change Notifications**: Listen for file status changes → Trigger downloads

---

## ⚠️ Critical Issues to Consider

### 1. Cache Eviction Strategy 🔥 **CRITICAL**

**Problem**: When 500MB limit is reached, which files should be removed?

**Options**:
- **LRU (Least Recently Used)** ✅ Recommended
  - Keep files accessed/viewed recently
  - Remove oldest unused files first
  - Track `lastAccessedAt` timestamp
  
- **LFU (Least Frequently Used)**
  - Track access count
  - More complex but better for "hot" files
  
- **FIFO (First In First Out)**
  - Simple but not optimal for user experience
  - May delete recently used files
  
- **Priority-based**
  - Keep images longer than documents
  - Prioritize current project files
  - User-starred files never evicted

**Recommendation**: 
```typescript
// Hybrid approach:
// 1. Never evict files uploaded but not yet synced (critical)
// 2. Keep user-starred files (if implemented)
// 3. LRU for everything else
// 4. Start eviction at 450MB (90% threshold)
```

**Impact**: Without proper eviction, cache will fill and crash the app.

---

### 2. Storage Location 📁 **CRITICAL**

**Problem**: Where to store cached files on device?

**React Native Options**:

| Location | Path | Auto-cleared by OS? | Backed up? | Best For |
|----------|------|---------------------|------------|----------|
| `DocumentDirectory` | `FileSystem.documentDirectory` | ❌ No | ✅ Yes | Important files users expect to persist |
| `CacheDirectory` | `FileSystem.cacheDirectory` | ✅ Yes (when storage is low) | ❌ No | Temporary cache (our use case) |

**Recommendation**: 
```typescript
// Use CacheDirectory for cache
const CACHE_ROOT = FileSystem.cacheDirectory + 'buildtrack-files/';

// Subdirectories:
// - images/
// - documents/
// - pending-uploads/  (files not yet synced - CRITICAL)
```

**Why CacheDirectory?**
- OS can clear it when storage is low (expected behavior)
- Not backed up (saves iCloud/Google backup space)
- Aligned with "cache" semantics

**Important**: Keep a separate `pending-uploads/` folder that you monitor and protect from eviction.

---

### 3. Sync State Management 🔄 **CRITICAL**

**Problem**: Track the lifecycle state of each file.

**File States**:
```typescript
type FileSyncState = 
  | 'local-only'        // Saved locally, not uploaded yet
  | 'uploading'         // Currently uploading to cloud
  | 'synced'            // Uploaded successfully, local copy is cache
  | 'failed'            // Upload failed (needs retry)
  | 'downloading'       // Downloading from cloud
  | 'deleted-local'     // Deleted locally, pending cloud delete
  | 'deleted-cloud';    // Deleted from cloud, pending local cleanup

interface CachedFile {
  id: string;
  localPath: string;
  cloudPath?: string;
  publicUrl?: string;
  state: FileSyncState;
  size: number;
  mimeType: string;
  createdAt: string;
  lastAccessedAt: string;
  uploadAttempts: number;
  error?: string;
}
```

**Storage**: 
- Use SQLite (via `expo-sqlite`) for metadata
- Faster queries than JSON files
- Can index by state, size, lastAccessedAt

**Alternative**: 
- AsyncStorage with JSON structure (simpler but slower)

**Recommendation**: Start with AsyncStorage, migrate to SQLite if performance issues arise.

---

### 4. Offline Handling & Retry Logic 🌐 **CRITICAL**

**Problem**: User uploads when offline, or upload fails mid-way.

**Strategy**:
```typescript
// Upload Queue System
interface UploadQueue {
  pending: CachedFile[];        // Not yet attempted
  retrying: CachedFile[];       // Failed, will retry
  failed: CachedFile[];         // Exceeded retry limit
}

// Retry Policy
const RETRY_CONFIG = {
  maxAttempts: 5,
  backoff: 'exponential',  // 2s, 4s, 8s, 16s, 32s
  retryOn: ['network-error', 'timeout', '5xx-errors'],
  noRetryOn: ['permission-denied', 'file-too-large'],
};
```

**Implementation**:
1. Save file locally first (always succeeds)
2. Add to upload queue
3. Process queue in background
4. Retry failed uploads when connectivity restored
5. Show sync status to user

**Background Processing**:
- Use `expo-task-manager` for background uploads
- Or poll queue every 30s when app is active
- Listen to NetInfo for connectivity changes

---

### 5. Data Integrity & Corruption 🛡️ **HIGH PRIORITY**

**Problem**: Ensure cached files aren't corrupted.

**Strategies**:
```typescript
// Calculate checksum when caching
import * as Crypto from 'expo-crypto';

async function cacheFileWithChecksum(uri: string): Promise<CachedFile> {
  // Read file
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Calculate SHA-256 checksum
  const checksum = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64
  );
  
  // Store checksum with metadata
  return {
    ...fileMetadata,
    checksum,
  };
}

// Verify on read
async function verifyCachedFile(file: CachedFile): Promise<boolean> {
  const currentChecksum = await calculateChecksum(file.localPath);
  return currentChecksum === file.checksum;
}
```

**When to Verify**:
- Before serving cached file to UI (optional, slow)
- After download from cloud (recommended)
- Before upload to cloud (optional)

**On Corruption**:
- Delete corrupted file
- Re-download from cloud (if available)
- Mark as failed if not uploaded yet

---

### 6. Concurrent Operations ⚡ **HIGH PRIORITY**

**Problem**: User uploads multiple files simultaneously.

**Considerations**:
```typescript
// Limit concurrent uploads
const MAX_CONCURRENT_UPLOADS = 3;

// Use queue with concurrency limit
import PQueue from 'p-queue';

const uploadQueue = new PQueue({ concurrency: MAX_CONCURRENT_UPLOADS });

async function uploadFiles(files: File[]) {
  return Promise.all(
    files.map(file => 
      uploadQueue.add(() => uploadSingleFile(file))
    )
  );
}
```

**Why Limit**:
- Prevents memory overflow (large files)
- Better error handling (not all fail at once)
- Progress tracking is clearer
- Network doesn't get overwhelmed

**Recommendation**: 
- 3 concurrent uploads for WiFi
- 1 concurrent upload for cellular (to save bandwidth)

---

### 7. Cache Invalidation ⏱️ **MEDIUM PRIORITY**

**Problem**: When should cached files be considered stale?

**Scenarios**:
```typescript
// Time-based invalidation
const CACHE_TTL = {
  images: 7 * 24 * 60 * 60 * 1000,      // 7 days
  documents: 30 * 24 * 60 * 60 * 1000,  // 30 days
  pending: Infinity,                     // Never (until uploaded)
};

// Event-based invalidation
// - File updated in cloud (detected via realtime subscription)
// - File deleted in cloud
// - User manually refreshes

// Check on access
async function getCachedFile(id: string): Promise<string | null> {
  const file = await getFileMetadata(id);
  
  // If expired, re-download
  if (Date.now() - new Date(file.lastAccessedAt).getTime() > CACHE_TTL[file.type]) {
    await downloadAndCacheFile(id);
  }
  
  return file.localPath;
}
```

**Recommendation**:
- Don't auto-invalidate pending uploads
- For synced files: Check cloud `updated_at` vs local `cachedAt`
- Re-download if cloud is newer

---

### 8. Network Optimization 📶 **HIGH PRIORITY**

**Problem**: Different behavior needed for WiFi vs cellular.

**Strategy**:
```typescript
import NetInfo from '@react-native-community/netinfo';

interface NetworkPolicy {
  allowCellularUpload: boolean;
  allowCellularDownload: boolean;
  maxFileSize: {
    cellular: number;
    wifi: number;
  };
}

const DEFAULT_POLICY: NetworkPolicy = {
  allowCellularUpload: true,       // With user preference
  allowCellularDownload: false,    // WiFi only (save data)
  maxFileSize: {
    cellular: 5 * 1024 * 1024,     // 5MB
    wifi: 50 * 1024 * 1024,        // 50MB
  },
};

// Check before upload
NetInfo.fetch().then(state => {
  if (state.type === 'cellular' && file.size > 5MB) {
    // Queue for later (when on WiFi)
    queueForWifi(file);
  } else {
    uploadFile(file);
  }
});
```

**User Settings** (recommended):
- Toggle: "Upload on cellular data"
- Toggle: "Download on cellular data" 
- Selector: "Max file size on cellular" (1MB, 5MB, 10MB, 50MB)

---

### 9. Background Task Management 🔄 **MEDIUM PRIORITY**

**Problem**: Continue uploads when app is backgrounded or closed.

**Expo Limitations**:
- iOS: Very limited background time (~30s)
- Android: More flexible but still restricted

**Options**:

**Option A**: Basic background (30s)
```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

TaskManager.defineTask('UPLOAD_TASK', async () => {
  // Process pending uploads (30s window)
  await processUploadQueue();
  return BackgroundFetch.BackgroundFetchResult.NewData;
});
```

**Option B**: Pause and resume
- Don't use true background tasks
- Resume uploads when app returns to foreground
- Show notification: "3 files pending upload"

**Recommendation**: 
- Start with Option B (simpler, more reliable)
- Add Option A if users request background sync
- iOS will likely kill long uploads anyway

---

### 10. Duplicate Detection 🔍 **MEDIUM PRIORITY**

**Problem**: Same file uploaded multiple times wastes storage.

**Strategies**:
```typescript
// Content-based deduplication
async function checkDuplicate(file: File): Promise<string | null> {
  const checksum = await calculateChecksum(file.uri);
  
  // Check if we've seen this checksum before
  const existing = await db.findByChecksum(checksum);
  
  if (existing) {
    console.log('Duplicate detected, reusing existing file');
    return existing.id;
  }
  
  return null;
}

// Before upload
const duplicateId = await checkDuplicate(selectedFile);
if (duplicateId) {
  // Just link to existing file
  await linkFileToEntity(duplicateId, entityType, entityId);
} else {
  // Upload new file
  await uploadFile(selectedFile);
}
```

**Trade-offs**:
- Pro: Saves storage and bandwidth
- Con: Checksum calculation takes time
- Con: More complex database queries

**Recommendation**: 
- Implement for images (common duplicates)
- Skip for documents (less likely, more varied)

---

### 11. Memory Management 🧠 **HIGH PRIORITY**

**Problem**: Loading large files into memory can crash the app.

**Strategies**:
```typescript
// DON'T: Load entire file into memory
const base64 = await FileSystem.readAsStringAsync(largeFile, {
  encoding: FileSystem.EncodingType.Base64,
});

// DO: Stream upload (if Supabase supports)
// OR: Chunk upload for large files
async function uploadLargeFile(path: string) {
  const fileInfo = await FileSystem.getInfoAsync(path);
  const fileSize = fileInfo.size!;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  
  if (fileSize > 10 * 1024 * 1024) {
    // Use chunked upload
    return uploadInChunks(path, CHUNK_SIZE);
  } else {
    // Regular upload
    return uploadFile(path);
  }
}
```

**Image Handling**:
- You already have compression (good!)
- Ensure compressed images are < 5MB
- Don't keep multiple versions in memory simultaneously

**Recommendation**:
- Set hard limit: 20MB per file in memory
- For larger files: Show "file too large" error
- Monitor memory usage in development

---

### 12. Error Recovery & Crash Handling 💥 **HIGH PRIORITY**

**Problem**: App crashes mid-upload, what happens to the file?

**Strategy**:
```typescript
// Atomic state updates
async function uploadWithRecovery(file: CachedFile) {
  // Mark as uploading
  await updateFileState(file.id, 'uploading');
  
  try {
    const result = await supabase.storage.upload(file.cloudPath, fileData);
    
    // Mark as synced
    await updateFileState(file.id, 'synced', {
      publicUrl: result.publicUrl,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Mark as failed (will retry on next app launch)
    await updateFileState(file.id, 'failed', {
      error: error.message,
      uploadAttempts: file.uploadAttempts + 1,
    });
  }
}

// On app startup
async function recoverFromCrash() {
  // Find files stuck in 'uploading' state
  const stuckFiles = await db.findByState('uploading');
  
  // Reset to 'local-only' to retry
  for (const file of stuckFiles) {
    await updateFileState(file.id, 'failed', {
      error: 'Upload interrupted by app crash',
    });
  }
  
  // Process failed uploads
  await processUploadQueue();
}
```

**On App Launch**:
1. Check for files in `uploading` state (crashed uploads)
2. Check for files in `failed` state (retry)
3. Check for files in `pending-uploads/` folder (orphaned files)
4. Reconcile database with file system

---

### 13. User Cache Management 🗑️ **MEDIUM PRIORITY**

**Problem**: Users need control over cache.

**Features to Implement**:
```typescript
// Settings Screen
interface CacheSettings {
  // Automatic cache management
  cacheEnabled: boolean;
  maxCacheSize: number;  // 100MB, 250MB, 500MB
  autoEviction: boolean;
  
  // Manual controls
  showCacheStats: boolean;
  clearCacheButton: boolean;
  
  // Network preferences
  wifiOnlyUploads: boolean;
  wifiOnlyDownloads: boolean;
}

// Cache statistics
interface CacheStats {
  totalSize: number;
  totalFiles: number;
  breakdown: {
    images: { count: number; size: number };
    documents: { count: number; size: number };
    pending: { count: number; size: number };
  };
  oldestFile: Date;
  newestFile: Date;
}

// Clear cache function
async function clearCache(options?: {
  onlyDownloaded?: boolean;  // Keep pending uploads
  olderThan?: Date;
}) {
  // Get files to delete
  const files = await db.getCachedFiles({
    state: 'synced',  // Only clear synced files
    olderThan: options?.olderThan,
  });
  
  // Delete from file system
  await Promise.all(files.map(f => FileSystem.deleteAsync(f.localPath)));
  
  // Update database
  await db.removeCachedFiles(files.map(f => f.id));
}
```

**UI Components**:
```typescript
// Cache stats in settings
<View>
  <Text>Cache Size: 245 MB / 500 MB (49%)</Text>
  <ProgressBar value={0.49} />
  <Text>1,234 files cached</Text>
  <Button onPress={clearCache}>Clear Cache</Button>
</View>
```

---

### 14. Realtime Synchronization 🔔 **HIGH PRIORITY**

**Problem**: Efficiently listen for file changes from other devices/users.

**Supabase Realtime Subscription**:
```typescript
import { supabase } from '@/api/supabase';

// Subscribe to file_attachments changes
useEffect(() => {
  const subscription = supabase
    .channel('file-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'file_attachments',
        filter: `company_id=eq.${currentUser.companyId}`,
      },
      async (payload) => {
        console.log('File change detected:', payload);
        
        if (payload.eventType === 'INSERT') {
          // New file uploaded (maybe by another user)
          await handleNewFile(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          // File updated (e.g., status changed)
          await handleFileUpdate(payload.new);
        } else if (payload.eventType === 'DELETE') {
          // File deleted
          await handleFileDelete(payload.old);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, [currentUser.companyId]);

// Handle new file notification
async function handleNewFile(fileData: any) {
  // Check if we should auto-download
  const shouldDownload = await shouldAutoDownload(fileData);
  
  if (shouldDownload) {
    // Download and cache
    await downloadAndCacheFile(fileData);
  } else {
    // Just save metadata (download on demand)
    await saveFileMetadata(fileData);
  }
}
```

**Auto-download Strategy**:
```typescript
async function shouldAutoDownload(file: any): Promise<boolean> {
  // Only auto-download if:
  // 1. File is small (< 2MB)
  // 2. User is on WiFi
  // 3. Cache has space
  // 4. File belongs to current project/task
  
  const netInfo = await NetInfo.fetch();
  const cacheStats = await getCacheStats();
  const isRelevant = await isFileRelevantToUser(file);
  
  return (
    file.file_size < 2 * 1024 * 1024 &&
    netInfo.type === 'wifi' &&
    cacheStats.totalSize < 450 * 1024 * 1024 &&
    isRelevant
  );
}
```

**Recommendation**:
- Subscribe to file_attachments table
- Filter by company_id (your security model)
- Auto-download only small, relevant files
- Show notification: "3 new files available"

---

### 15. Security & Encryption 🔐 **MEDIUM PRIORITY**

**Problem**: Cached files are stored in plaintext on device.

**Considerations**:
- iOS/Android have built-in encryption for app storage
- Additional encryption adds complexity
- May need encryption for sensitive documents

**If Implementing Encryption**:
```typescript
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Generate and store encryption key
async function getEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync('file-encryption-key');
  
  if (!key) {
    // Generate random key
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString() + Math.random().toString()
    );
    await SecureStore.setItemAsync('file-encryption-key', key);
  }
  
  return key;
}

// Encrypt file before caching
async function encryptFile(path: string): Promise<string> {
  const key = await getEncryptionKey();
  // Use encryption library (e.g., expo-crypto or rn-fetch-blob)
  // This is simplified - actual implementation needs proper AES encryption
  const encrypted = await encryptWithAES(path, key);
  return encrypted;
}
```

**Trade-offs**:
- Pro: Extra security for sensitive files
- Con: Performance overhead (encryption/decryption)
- Con: More complexity
- Con: Limited native support in React Native

**Recommendation**:
- Skip for MVP (OS-level encryption is sufficient)
- Add later if handling sensitive documents (medical, legal, etc.)
- Use only for documents, not images (too slow)

---

### 16. Migration & Existing Files 📚 **MEDIUM PRIORITY**

**Problem**: What about files already uploaded before caching was implemented?

**Strategy**:
```typescript
// On first launch with caching enabled
async function migrateExistingFiles() {
  const isFirstRun = await AsyncStorage.getItem('cache-migration-done');
  
  if (isFirstRun === 'true') {
    return; // Already migrated
  }
  
  // Get all files from database (not yet cached)
  const cloudFiles = await supabase
    .from('file_attachments')
    .select('*')
    .eq('company_id', currentUser.companyId)
    .is('deleted_at', null);
  
  // Save metadata without downloading
  for (const file of cloudFiles.data) {
    await saveFileMetadata({
      id: file.id,
      state: 'not-cached',  // New state
      cloudPath: file.storage_path,
      publicUrl: file.public_url,
      // ... other metadata
    });
  }
  
  await AsyncStorage.setItem('cache-migration-done', 'true');
}
```

**Download Strategy**:
- Don't auto-download all existing files (too much bandwidth)
- Download on-demand when user views a file
- Optionally: "Download all files for offline use" button

---

### 17. Cache Metadata Storage 📊 **CRITICAL**

**Problem**: Efficiently store and query cache metadata.

**Schema Design**:
```typescript
// AsyncStorage approach (simpler)
interface CacheMetadata {
  version: string;  // For migrations
  files: Record<string, CachedFile>;
  stats: {
    totalSize: number;
    totalFiles: number;
    lastEviction: string;
  };
}

// SQLite approach (better for large datasets)
CREATE TABLE cached_files (
  id TEXT PRIMARY KEY,
  local_path TEXT NOT NULL,
  cloud_path TEXT,
  public_url TEXT,
  state TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT,
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,
  upload_attempts INTEGER DEFAULT 0,
  error TEXT,
  entity_type TEXT,
  entity_id TEXT,
  
  -- Indexes for common queries
  INDEX idx_state ON cached_files(state),
  INDEX idx_last_accessed ON cached_files(last_accessed_at),
  INDEX idx_entity ON cached_files(entity_type, entity_id)
);
```

**Recommendation**:
- Start with AsyncStorage (< 1000 files)
- Migrate to SQLite if performance degrades
- Keep critical data in memory for fast access

---

### 18. Monitoring & Logging 📈 **LOW PRIORITY**

**Problem**: Need visibility into cache behavior for debugging.

**Metrics to Track**:
```typescript
interface CacheMetrics {
  // Performance
  avgUploadTime: number;
  avgDownloadTime: number;
  successRate: number;
  
  // Usage
  cacheHitRate: number;  // How often cached files are used
  cacheMissRate: number;
  evictionCount: number;
  
  // Errors
  uploadFailures: number;
  corruptedFiles: number;
  storageErrors: number;
}

// Log important events
function logCacheEvent(event: string, data: any) {
  console.log(`[Cache] ${event}:`, data);
  
  // Optional: Send to analytics service
  // analytics.logEvent('cache_event', { event, ...data });
}

// Usage
logCacheEvent('file_cached', { id: file.id, size: file.size });
logCacheEvent('cache_eviction', { reason: 'size_limit', filesRemoved: 5 });
logCacheEvent('upload_failed', { id: file.id, error: error.message });
```

---

### 19. Testing Strategy 🧪 **HIGH PRIORITY**

**Critical Test Cases**:

```typescript
// Test 1: Cache limit enforcement
test('evicts files when cache exceeds 500MB', async () => {
  // Fill cache to 490MB
  await fillCache(490 * 1024 * 1024);
  
  // Add 20MB file
  await cacheFile({ size: 20 * 1024 * 1024 });
  
  // Assert: Cache is still under 500MB
  const stats = await getCacheStats();
  expect(stats.totalSize).toBeLessThan(500 * 1024 * 1024);
});

// Test 2: Offline upload queueing
test('queues uploads when offline', async () => {
  mockNetInfo.setOffline();
  
  const file = await pickAndCacheFile();
  await uploadFile(file);
  
  // Assert: File in upload queue, not uploaded
  expect(file.state).toBe('local-only');
  expect(uploadQueue.length).toBe(1);
});

// Test 3: Crash recovery
test('recovers from crash during upload', async () => {
  // Simulate crash (app restart)
  await setFileState(file.id, 'uploading');
  await appRestart();
  
  // Assert: File reset to failed state
  const recovered = await getFile(file.id);
  expect(recovered.state).toBe('failed');
});

// Test 4: Realtime sync
test('downloads new file when notified', async () => {
  const mockFile = { id: '123', size: 1024 };
  
  // Simulate realtime notification
  await handleRealtimeEvent({ eventType: 'INSERT', new: mockFile });
  
  // Assert: File downloaded and cached
  const cached = await getCachedFile('123');
  expect(cached).toBeDefined();
  expect(cached.localPath).toExist();
});
```

---

## 📋 Implementation Checklist

### Phase 1: Core Caching (Week 1)
- [ ] Design cache metadata schema
- [ ] Implement cache storage (CacheDirectory)
- [ ] Create `CacheManager` service
  - [ ] `cacheFile()`
  - [ ] `getCachedFile()`
  - [ ] `evictFiles()`
  - [ ] `getCacheStats()`
- [ ] Implement LRU eviction strategy
- [ ] Add checksum verification
- [ ] Test cache limit enforcement

### Phase 2: Upload Queue (Week 2)
- [ ] Design upload queue system
- [ ] Implement retry logic with exponential backoff
- [ ] Add upload state tracking
- [ ] Handle offline scenarios
- [ ] Implement crash recovery
- [ ] Test offline uploads and recovery

### Phase 3: Realtime Sync (Week 2-3)
- [ ] Set up Supabase realtime subscription
- [ ] Implement file change handlers
- [ ] Add auto-download logic
- [ ] Test multi-device sync
- [ ] Handle conflict resolution

### Phase 4: Network Optimization (Week 3)
- [ ] Implement WiFi vs cellular detection
- [ ] Add network-aware policies
- [ ] Limit concurrent uploads
- [ ] Add user preferences for network behavior
- [ ] Test on different network conditions

### Phase 5: User Features (Week 4)
- [ ] Create cache settings UI
- [ ] Show cache statistics
- [ ] Add "Clear Cache" functionality
- [ ] Implement sync status indicators
- [ ] Add manual download/retry buttons
- [ ] Test user workflows

### Phase 6: Polish & Testing (Week 5)
- [ ] Comprehensive error handling
- [ ] Memory management optimization
- [ ] Performance testing
- [ ] Security review
- [ ] Migration strategy for existing files
- [ ] Documentation

---

## 🏗️ Recommended Architecture

```typescript
// Directory structure
src/
├── services/
│   ├── cache/
│   │   ├── CacheManager.ts          // Main cache coordinator
│   │   ├── EvictionStrategy.ts      // LRU implementation
│   │   ├── UploadQueue.ts           // Upload queue management
│   │   ├── SyncManager.ts           // Realtime sync handler
│   │   └── types.ts                 // Cache-related types
│   └── file/
│       ├── fileUploadService.ts     // Upload to Supabase
│       └── fileDownloadService.ts   // Download from Supabase
├── stores/
│   └── cacheStore.ts                // Zustand store for cache state
└── hooks/
    └── useFileCache.ts              // React hook for components
```

```typescript
// Example usage in component
function TaskDetailScreen({ taskId }) {
  const { 
    getCachedFile, 
    uploadFile, 
    cacheStats,
    syncStatus 
  } = useFileCache();
  
  const handleUpload = async (file) => {
    // Save locally first
    const cachedFile = await cacheFile(file);
    
    // Upload in background
    await uploadFile(cachedFile);
    
    // UI automatically updates via Zustand store
  };
  
  return (
    <View>
      <Text>Cache: {cacheStats.usedMB} / 500 MB</Text>
      <SyncStatusIndicator status={syncStatus} />
      <Button onPress={() => pickAndUpload()}>Upload Photo</Button>
    </View>
  );
}
```

---

## ⚡ Quick Wins vs Long-term Investments

### Quick Wins (Implement First)
1. ✅ Basic local caching (save to CacheDirectory)
2. ✅ Simple LRU eviction (when > 500MB)
3. ✅ Upload queue with retry
4. ✅ Network state detection (WiFi vs cellular)
5. ✅ Cache statistics UI

### Long-term Investments (Add Later)
1. 🔄 Advanced eviction (priority-based)
2. 🔄 Encryption for sensitive files
3. 🔄 Sophisticated duplicate detection
4. 🔄 Background sync with expo-task-manager
5. 🔄 Chunked uploads for large files

---

## 🚨 Common Pitfalls to Avoid

1. **Not protecting pending uploads from eviction**
   - Result: User uploads file, cache evicts it, upload fails

2. **Not handling app crashes during upload**
   - Result: Files stuck in "uploading" state forever

3. **Loading large files into memory**
   - Result: App crashes with out-of-memory error

4. **Not updating lastAccessedAt**
   - Result: LRU eviction removes recently used files

5. **Syncing too aggressively**
   - Result: Constant background uploads drain battery

6. **Not showing sync status to user**
   - Result: User doesn't know if files are uploaded or pending

7. **Forgetting to clear cache metadata when deleting files**
   - Result: Orphaned metadata, incorrect cache statistics

8. **Not testing on real devices with limited storage**
   - Result: Cache behaves differently in production

---

## 📚 Recommended Libraries

```json
{
  "dependencies": {
    "expo-file-system": "~18.1.8",      // ✅ Already installed
    "expo-sqlite": "~15.1.1",            // For metadata storage
    "@react-native-community/netinfo": "^11.4.1",  // Network state
    "p-queue": "^8.0.1",                 // Upload queue
    "date-fns": "^4.1.0",                // Date utilities
    "expo-crypto": "~14.1.3",            // Checksums
    "expo-task-manager": "~13.1.1",      // Background tasks (optional)
    "expo-background-fetch": "~14.1.3"   // Background sync (optional)
  }
}
```

---

## 🎯 Success Metrics

Track these to measure cache effectiveness:

1. **Cache Hit Rate**: % of file access served from cache (target: >80%)
2. **Upload Success Rate**: % of uploads that succeed eventually (target: >95%)
3. **Average Upload Time**: Time from file selection to cloud upload (target: <10s for 5MB)
4. **Cache Efficiency**: % of cache filled with recently used files (target: >70%)
5. **User Storage Impact**: Average cache size per user (target: <200MB)
6. **Offline Usage**: % of file access that work offline (target: >50%)

---

## 🤔 Final Recommendations

### Must Have (Critical for MVP)
1. ✅ Basic local caching with 500MB limit
2. ✅ LRU eviction strategy
3. ✅ Upload queue with retry
4. ✅ Crash recovery
5. ✅ Network-aware uploads
6. ✅ Clear cache functionality

### Should Have (Important for UX)
1. 🟡 Realtime sync notifications
2. 🟡 Cache statistics UI
3. 🟡 WiFi vs cellular policies
4. 🟡 Sync status indicators
5. 🟡 Manual download/retry

### Nice to Have (Polish)
1. 🔵 Encryption for sensitive files
2. 🔵 Duplicate detection
3. 🔵 Background sync
4. 🔵 Predictive pre-caching
5. 🔵 Smart eviction (priority-based)

---

## 📞 Questions to Answer Before Starting

1. **User Behavior**:
   - How many files do users typically upload per day?
   - What's the average file size?
   - How often do users view old files?

2. **Network Conditions**:
   - Are users primarily on WiFi or cellular?
   - What's the typical upload speed?
   - How often are users offline?

3. **Storage Constraints**:
   - What's the typical device storage?
   - Is 500MB reasonable for target users?
   - Should limit be user-configurable?

4. **Sync Requirements**:
   - Do users work across multiple devices?
   - How real-time does sync need to be?
   - Can sync be delayed (e.g., next app launch)?

5. **Priority**:
   - Is offline functionality critical?
   - Is storage optimization critical?
   - Is battery life critical?

---

**Good luck with the implementation!** 🚀

Remember: Start simple, measure, iterate. Don't over-engineer the first version.

