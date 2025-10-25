# 📦 Local File Caching - Implementation Summary

## Your Requirements

✅ **Cache Limit**: Max 500MB on device  
✅ **Upload Flow**: Save locally first → Upload to cloud  
✅ **Change Notifications**: Listen for cloud changes → Trigger downloads

---

## 🚨 Top 10 Critical Issues to Address

### 1. **Cache Eviction Strategy** 🔥
**What happens when the 500MB limit is reached?**

**Answer**: Use **Hybrid LRU** (Least Recently Used)
- **Protect**: Files in pending upload (NEVER evict)
- **Protect**: User-starred files (if implemented)
- **Evict**: Oldest unused synced files
- **Trigger**: Start eviction at 450MB (90% threshold)

```typescript
// Eviction priority (lowest to highest):
1. Synced files, last accessed >30 days ago
2. Synced files, last accessed >14 days ago
3. Synced files, last accessed >7 days ago
4. Recent files (keep)
5. Pending uploads (NEVER evict)
```

**Impact**: Without this, your cache will fill and the app will crash.

---

### 2. **Storage Location** 📁
**Where should files be stored on the device?**

**Answer**: Use **CacheDirectory** with protected folders

```typescript
CacheDirectory/buildtrack-files/
├── pending/        // Protected - pending uploads
├── images/         // Can be evicted
└── documents/      // Can be evicted
```

**Why CacheDirectory?**
- OS can clear it when device storage is low (expected behavior)
- Not backed up to iCloud/Google (saves backup space)
- Proper semantics for cache

**Alternative**: `DocumentDirectory` is for user documents, not cache

---

### 3. **Sync State Management** 🔄
**How do you track file lifecycle states?**

**Answer**: Implement file state machine with metadata storage

```typescript
type FileSyncState = 
  | 'local-only'    // Saved locally, not uploaded
  | 'uploading'     // Currently uploading
  | 'synced'        // Uploaded & cached
  | 'failed'        // Upload failed
  | 'downloading'   // Downloading from cloud

// Store metadata in:
// - AsyncStorage (simple, <1000 files)
// - SQLite (better, >1000 files)
```

**Impact**: Without state tracking, you can't implement reliable sync.

---

### 4. **Offline Handling & Retry** 🌐
**What happens if upload fails or user is offline?**

**Answer**: Implement upload queue with exponential backoff

```typescript
const RETRY_CONFIG = {
  maxAttempts: 5,
  delays: [2s, 4s, 8s, 16s, 32s],  // Exponential backoff
  retryOn: ['network-error', 'timeout', '5xx'],
  noRetryOn: ['permission-denied', 'file-too-large'],
};

// Queue system:
1. Save locally (always succeeds)
2. Add to upload queue
3. Process queue in background
4. Retry failed uploads with backoff
5. Resume queue when connectivity restored
```

**Impact**: Without retry logic, temporary network issues cause permanent upload failures.

---

### 5. **Data Integrity** 🛡️
**How do you ensure cached files aren't corrupted?**

**Answer**: Use SHA-256 checksums

```typescript
// On cache:
const checksum = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  fileContent
);

// On read:
const isValid = currentChecksum === storedChecksum;
if (!isValid) {
  // Delete corrupted file, re-download from cloud
}
```

**When to verify**:
- After download from cloud ✅
- Before serving to UI (optional, slow)
- Before upload (optional)

**Impact**: Corrupted files cause crashes or show broken images.

---

### 6. **Concurrent Uploads** ⚡
**How many files can upload simultaneously?**

**Answer**: Limit based on network type

```typescript
const MAX_CONCURRENT = {
  wifi: 3,      // WiFi can handle multiple
  cellular: 1,  // Cellular should be conservative
  offline: 0,   // Queue for later
};
```

**Why limit?**
- Prevents memory overflow (large files)
- Better error handling
- Clearer progress tracking
- Doesn't overwhelm network

**Impact**: Unlimited concurrent uploads can crash the app with out-of-memory errors.

---

### 7. **Network Optimization** 📶
**Different behavior for WiFi vs cellular?**

**Answer**: Implement network-aware policies

```typescript
const NETWORK_POLICY = {
  wifi: {
    autoUpload: true,
    autoDownload: true,  // Small files only
    maxFileSize: 50 * 1024 * 1024,  // 50MB
  },
  cellular: {
    autoUpload: true,  // With user confirmation >5MB
    autoDownload: false,  // Manual only
    maxFileSize: 5 * 1024 * 1024,  // 5MB
  },
};
```

**User Settings**:
- Toggle: "Upload on cellular data" (default: YES)
- Toggle: "Download on cellular data" (default: NO)
- Selector: Max size on cellular (1/5/10MB)

**Impact**: Unoptimized network behavior drains user's data plan.

---

### 8. **Memory Management** 🧠
**How to handle large files without crashing?**

**Answer**: Set hard limits and stream when possible

```typescript
const MAX_FILE_IN_MEMORY = 20 * 1024 * 1024;  // 20MB

// For larger files:
if (fileSize > MAX_FILE_IN_MEMORY) {
  throw new Error('File too large for upload');
}

// For images: Use compression (you already have this!)
const compressed = await compressImage(uri, 5 * 1024 * 1024);
```

**Impact**: Loading 50MB files into memory crashes the app.

---

### 9. **Crash Recovery** 💥
**What happens if app crashes during upload?**

**Answer**: Implement crash recovery on app startup

```typescript
// On app launch:
async function recoverFromCrash() {
  // Find files stuck in 'uploading' state
  const stuckFiles = await db.findByState('uploading');
  
  // Reset to failed (will retry)
  for (const file of stuckFiles) {
    await updateState(file.id, 'failed');
  }
  
  // Process failed uploads
  await processUploadQueue();
}
```

**Impact**: Without recovery, files stuck in "uploading" state forever.

---

### 10. **Realtime Sync** 🔔
**How to detect changes from other users/devices?**

**Answer**: Use Supabase Realtime subscriptions

```typescript
// Subscribe to file_attachments table
const subscription = supabase
  .channel('file-changes')
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'file_attachments',
    filter: `company_id=eq.${companyId}`,
  }, handleChange)
  .subscribe();

// Auto-download strategy:
async function shouldAutoDownload(file) {
  return (
    file.size < 2 * 1024 * 1024 &&  // <2MB
    networkType === 'wifi' &&        // WiFi only
    cacheSize < 450MB &&             // Space available
    isRelevantToUser(file)           // Current project/task
  );
}
```

**Impact**: Without realtime sync, users don't see new files until app restart.

---

## 📋 Other Important Considerations

### 11. Cache Invalidation ⏱️
- **Time-based**: Images expire after 7 days, documents after 30 days
- **Event-based**: File updated in cloud (detected via realtime)
- **Manual**: User refreshes

### 12. Background Tasks 🔄
- **iOS limitation**: ~30s background time
- **Recommendation**: Resume uploads on app foreground (simpler)
- **Alternative**: Use `expo-task-manager` for limited background sync

### 13. Duplicate Detection 🔍
- **Strategy**: Calculate checksum, compare with existing files
- **Use for**: Images (common duplicates)
- **Skip for**: Documents (less likely, more unique)

### 14. User Cache Control 🗑️
- Show cache statistics (250MB / 500MB)
- "Clear Cache" button
- Network preferences (WiFi-only toggle)
- Manual retry for failed uploads

### 15. Security 🔐
- **MVP**: Skip encryption (OS-level is sufficient)
- **Later**: Add AES encryption for sensitive documents
- **Trade-off**: Performance vs security

### 16. Migration 📚
- Don't auto-download existing files (too much bandwidth)
- Download on-demand when user views
- Save metadata without downloading

---

## 🎯 Recommended MVP Feature Set

### Must Have (Week 1-2)
✅ Save files locally before upload  
✅ Upload queue with retry (exponential backoff)  
✅ 500MB cache limit with LRU eviction  
✅ Network state detection (WiFi vs cellular)  
✅ Crash recovery on app startup  
✅ Basic sync state tracking  

### Should Have (Week 3-4)
🟡 Realtime sync notifications  
🟡 Cache statistics UI  
🟡 Clear cache functionality  
🟡 Sync status indicators  
🟡 Manual download/retry buttons  

### Nice to Have (Later)
🔵 Encryption for sensitive files  
🔵 Duplicate detection  
🔵 Background uploads  
🔵 Smart pre-caching  
🔵 Priority-based eviction  

---

## 💡 Key Design Decisions

| Decision | Recommendation | Alternative |
|----------|---------------|-------------|
| **Cache Location** | CacheDirectory | DocumentDirectory |
| **Eviction Strategy** | Hybrid LRU | FIFO, LFU |
| **Metadata Storage** | AsyncStorage → SQLite | Just SQLite |
| **Retry Policy** | Exponential backoff (5 attempts) | Fixed delay |
| **Concurrent Uploads** | 3 (WiFi) / 1 (cellular) | Unlimited |
| **Checksums** | SHA-256 | MD5, Skip |
| **Network Policy** | User-configurable | Always upload |
| **Auto-download** | Small files (<2MB) on WiFi | All or none |
| **Background Sync** | Resume on foreground | True background |
| **Encryption** | Skip for MVP | AES-256 |

---

## 🏗️ Implementation Approach

### Phase 1: Core (2 weeks)
1. Set up cache directory structure
2. Implement `CacheManager` service
3. Add LRU eviction strategy
4. Create upload queue with retry
5. Implement crash recovery

### Phase 2: Sync (1 week)
6. Set up Supabase realtime subscription
7. Implement change handlers
8. Add auto-download logic

### Phase 3: UX (1 week)
9. Create cache settings screen
10. Show sync status indicators
11. Add manual controls

### Phase 4: Polish (1 week)
12. Comprehensive error handling
13. Performance optimization
14. Testing & documentation

**Total Estimated Time**: 5 weeks

---

## 📚 Documentation Created

1. **LOCAL_CACHE_IMPLEMENTATION_GUIDE.md** (Comprehensive)
   - 19 detailed issues with code examples
   - Trade-off analysis
   - Testing strategy
   - Common pitfalls

2. **LOCAL_CACHE_QUICK_CHECKLIST.md** (Quick Reference)
   - Critical decisions checklist
   - Implementation order
   - Success criteria
   - Decision matrix

3. **LOCAL_CACHE_ARCHITECTURE.md** (Visual Diagrams)
   - System overview
   - Upload/download flows
   - State machines
   - Database schema

4. **LOCAL_CACHE_SUMMARY.md** (This Document)
   - Top 10 critical issues
   - Quick answers
   - MVP recommendations

---

## 🚀 Next Steps

1. **Review all 4 documents** to understand the system
2. **Make key decisions** (use Quick Checklist)
3. **Answer pre-implementation questions**:
   - How many files do users upload per day?
   - What's the average file size?
   - Are users primarily on WiFi or cellular?
   - Is offline functionality critical?
4. **Start with MVP features** (see recommended set above)
5. **Test incrementally** at each phase

---

## ⚠️ Don't Start Coding Until You've Decided:

- [ ] Cache eviction strategy (LRU recommended)
- [ ] Storage location (CacheDirectory recommended)
- [ ] Metadata storage (AsyncStorage → SQLite)
- [ ] Retry policy (5 attempts, exponential backoff)
- [ ] Network behavior (WiFi vs cellular)
- [ ] Concurrent upload limit (3 for WiFi)

---

## 📞 Key Questions to Answer

**User Behavior**:
- Expected files per user per day?
- Average file size?
- Offline usage frequency?

**Technical**:
- Target devices (iOS/Android/both)?
- Minimum OS version?
- Is 500MB appropriate?

**Business**:
- Timeline for MVP?
- Priority: UX, performance, or battery?
- Budget for additional services?

---

**Ready to implement?** 🎉

Start with the **Comprehensive Guide** for detailed code examples and architecture patterns.

Good luck! 🚀

