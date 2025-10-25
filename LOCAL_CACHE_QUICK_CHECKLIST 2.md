# 📋 Local Cache Implementation - Quick Checklist

## Critical Issues to Address Before Implementation

### 🔥 Critical (Must Decide Now)

- [ ] **Cache Eviction Strategy**
  - Decision: LRU, LFU, FIFO, or Priority-based?
  - Recommendation: Hybrid (LRU + protect pending uploads)
  - Impact: App will crash if cache fills without eviction

- [ ] **Storage Location**
  - Decision: DocumentDirectory or CacheDirectory?
  - Recommendation: CacheDirectory for cache + protected pending-uploads folder
  - Impact: Affects backup, OS cleanup, user expectations

- [ ] **Sync State Management**
  - Decision: AsyncStorage or SQLite for metadata?
  - Recommendation: Start AsyncStorage, migrate to SQLite if needed
  - Impact: Query performance, scalability

- [ ] **Offline Handling**
  - Decision: Queue strategy and retry policy?
  - Recommendation: Exponential backoff, max 5 retries
  - Impact: User experience when offline or poor connectivity

- [ ] **Data Integrity**
  - Decision: Implement checksums?
  - Recommendation: Yes, SHA-256 checksums
  - Impact: Detect corrupted files, extra computation

### ⚠️ High Priority (Decide Soon)

- [ ] **Network Optimization**
  - WiFi vs cellular behavior?
  - Recommendation: Allow cellular with user preference
  
- [ ] **Concurrent Uploads**
  - How many simultaneous uploads?
  - Recommendation: 3 for WiFi, 1 for cellular
  
- [ ] **Memory Management**
  - Max file size in memory?
  - Recommendation: 20MB limit per file
  
- [ ] **Error Recovery**
  - How to handle app crashes during upload?
  - Recommendation: Mark as failed on startup, retry
  
- [ ] **Realtime Sync**
  - Auto-download new files?
  - Recommendation: Only small files (<2MB) on WiFi

### 🟡 Medium Priority (Can Decide Later)

- [ ] **Cache Invalidation**
  - When to consider files stale?
  - Recommendation: 7 days for images, 30 days for documents
  
- [ ] **Background Tasks**
  - Continue uploads when backgrounded?
  - Recommendation: Resume on foreground (simpler)
  
- [ ] **Duplicate Detection**
  - Check for duplicate uploads?
  - Recommendation: Only for images (common case)
  
- [ ] **User Cache Control**
  - What settings to expose?
  - Recommendation: Cache size, clear cache, WiFi-only
  
- [ ] **Security**
  - Encrypt cached files?
  - Recommendation: Skip for MVP, add later if needed
  
- [ ] **Migration**
  - How to handle existing uploaded files?
  - Recommendation: Don't auto-download, cache on-demand

---

## Pre-Implementation Questions

### User Behavior
- [ ] How many files do users upload per day?
- [ ] What's the average file size?
- [ ] How often do users view old files?
- [ ] Do users work offline frequently?

### Technical
- [ ] What devices are you targeting? (iOS/Android/both)
- [ ] What's the minimum supported OS version?
- [ ] What's the typical device storage capacity?
- [ ] Is 500MB cache limit appropriate for your users?

### Business
- [ ] Is offline functionality critical?
- [ ] Is real-time sync across devices required?
- [ ] What's the priority: UX, performance, or battery life?
- [ ] What's your timeline for MVP?

---

## Implementation Order

### Week 1: Core Caching
- [ ] Set up CacheDirectory structure
- [ ] Create CacheManager service
- [ ] Implement basic caching (save file locally)
- [ ] Implement LRU eviction
- [ ] Add cache size tracking
- [ ] Test cache limit enforcement

### Week 2: Upload Queue
- [ ] Design upload queue structure
- [ ] Implement queue processing
- [ ] Add retry logic with exponential backoff
- [ ] Handle offline scenarios
- [ ] Implement crash recovery on app start
- [ ] Test upload success/failure flows

### Week 3: Sync & Network
- [ ] Set up Supabase realtime subscription
- [ ] Implement change notification handlers
- [ ] Add network state detection
- [ ] Implement WiFi vs cellular policies
- [ ] Test multi-device sync

### Week 4: User Features
- [ ] Create cache settings screen
- [ ] Show cache statistics
- [ ] Add "Clear Cache" button
- [ ] Show sync status in UI
- [ ] Add manual retry buttons
- [ ] Test user workflows

### Week 5: Polish
- [ ] Comprehensive error handling
- [ ] Performance optimization
- [ ] Security review
- [ ] Full test coverage
- [ ] Documentation

---

## Common Pitfalls Checklist

Before you ship, make sure you've addressed:

- [ ] Pending uploads are never evicted
- [ ] Crashed uploads are recovered on app start
- [ ] Large files don't cause out-of-memory errors
- [ ] lastAccessedAt is updated when files are viewed
- [ ] Sync status is visible to users
- [ ] Cache metadata is deleted when files are deleted
- [ ] Tested on real devices with limited storage
- [ ] Network errors have retry logic
- [ ] Users can clear cache manually
- [ ] Cache size is monitored and displayed

---

## Libraries to Install

```bash
# Core (already have)
# expo-file-system ✅

# Need to install
bun add expo-sqlite                    # Metadata storage (if needed)
bun add @react-native-community/netinfo  # Network detection
bun add p-queue                        # Upload queue
bun add date-fns                       # Date utilities

# Optional (add later)
bun add expo-crypto                    # Checksums
bun add expo-task-manager              # Background tasks
bun add expo-background-fetch          # Background sync
```

---

## Success Criteria

Your implementation is successful if:

- [ ] Cache never exceeds 500MB
- [ ] Files upload successfully even when offline (eventually)
- [ ] App doesn't crash when uploading large files
- [ ] Users can see sync status at all times
- [ ] Cache can be cleared manually
- [ ] App recovers gracefully from crashes
- [ ] Upload success rate > 95%
- [ ] Cache hit rate > 80%
- [ ] Average upload time < 10s for 5MB files

---

## Quick Decision Matrix

| Scenario | Recommended Solution |
|----------|---------------------|
| Cache full | Evict least recently used synced files |
| Upload fails | Add to retry queue, exponential backoff |
| App crashes during upload | Mark as failed on startup, retry |
| User goes offline | Queue uploads, process when online |
| New file from cloud | Auto-download if <2MB on WiFi |
| File corrupted | Delete, re-download from cloud |
| Out of memory | Reject files >20MB |
| Slow network | Show progress, allow cancel |
| User on cellular | Upload with user confirmation for large files |
| Duplicate file | Checksum-based deduplication (images only) |

---

## MVP Feature Set

For your first version, include:

**Must Have**:
- ✅ Save files locally before upload
- ✅ Upload queue with retry
- ✅ 500MB cache limit with LRU eviction
- ✅ Network state detection
- ✅ Crash recovery
- ✅ Clear cache button

**Can Add Later**:
- 🔄 Realtime sync notifications
- 🔄 Background uploads
- 🔄 Encryption
- 🔄 Duplicate detection
- 🔄 Smart pre-caching

---

## Need Help?

Refer to the full guide: `LOCAL_CACHE_IMPLEMENTATION_GUIDE.md`

Each topic has:
- Detailed explanation
- Code examples
- Trade-off analysis
- Recommendations

