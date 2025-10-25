# 🎯 Local Cache - Quick Reference Card

## Upload Flow (3 Steps)
```
1. SAVE LOCAL     →  2. QUEUE UPLOAD    →  3. UPLOAD TO CLOUD
   (Instant)          (Background)           (With retry)
   
   ✅ User sees file  ⏳ Processing queue   ☁️ Synced to cloud
```

---

## Critical Design Decisions

| Issue | Answer | Why |
|-------|--------|-----|
| **Eviction** | LRU (Least Recently Used) | Keep frequently accessed files |
| **Location** | `CacheDirectory` | OS can clear, not backed up |
| **Metadata** | AsyncStorage → SQLite | Simple start, scale later |
| **Retry** | 5 attempts, exponential backoff | Handle temporary failures |
| **Concurrent** | 3 (WiFi) / 1 (cellular) | Balance speed & memory |
| **Network** | User-configurable | Respect data plans |
| **Checksums** | SHA-256 | Detect corruption |
| **Auto-download** | <2MB on WiFi only | Save bandwidth |

---

## File States
```
NOT_EXIST → LOCAL_ONLY → UPLOADING → SYNCED
                              ↓
                           FAILED → (retry) → SYNCED
                              
SYNCED → (evict) → NOT_CACHED → DOWNLOADING → SYNCED
```

---

## Eviction Rules
```
✅ CAN evict:  Synced files, last accessed >7 days ago
❌ NEVER evict: Pending uploads, failed uploads
⚡ Start at:   450MB (90% of 500MB limit)
🎯 Target:     400MB (80% of limit, leave buffer)
```

---

## Network Policies

| Network | Upload | Download | Concurrent | Max Size |
|---------|--------|----------|------------|----------|
| WiFi | ✅ Auto | ✅ Small files (<2MB) | 3 | 50MB |
| 4G/LTE | ✅ Auto | ❌ Manual | 1 | 5MB |
| 3G | ⏳ Queue | ❌ Manual | 1 | 2MB |
| Offline | ⏳ Queue | ❌ None | 0 | - |

---

## Storage Structure
```
CacheDirectory/buildtrack-files/
├── pending/      ← PROTECTED (never evict)
├── images/       ← Can evict
└── documents/    ← Can evict
```

---

## Cache Statistics
```
Total: 245 MB / 500 MB (49%)
Files: 1,234
Pending: 3 uploads
Failed: 1 (retry available)
```

---

## Retry Policy
```
Attempt 1: Wait 2s
Attempt 2: Wait 4s
Attempt 3: Wait 8s
Attempt 4: Wait 16s
Attempt 5: Wait 32s
After 5:   Mark as failed
```

---

## Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Cache locally | <500ms | <1s |
| Upload 5MB | <10s | <20s |
| Download 5MB | <8s | <15s |
| Get cached | <100ms | <500ms |

---

## Common Pitfalls

❌ **Don't**:
- Evict pending uploads
- Load 50MB into memory
- Upload without retry logic
- Skip crash recovery
- Ignore network type
- Hide sync status from user

✅ **Do**:
- Protect pending uploads folder
- Set file size limits (20MB max)
- Exponential backoff retry
- Recover on app startup
- Limit concurrent uploads
- Show sync status clearly

---

## MVP Checklist (5 Weeks)

**Week 1-2**: Core
- [ ] Cache directory setup
- [ ] CacheManager service
- [ ] LRU eviction
- [ ] Upload queue
- [ ] Crash recovery

**Week 3**: Sync
- [ ] Realtime subscription
- [ ] Change handlers
- [ ] Auto-download

**Week 4**: UX
- [ ] Cache settings
- [ ] Statistics UI
- [ ] Manual controls

**Week 5**: Polish
- [ ] Error handling
- [ ] Testing
- [ ] Documentation

---

## Code Snippets

### Cache a File
```typescript
const cached = await cacheManager.cacheFile(uri);
// State: 'local-only'
// Ready to upload
```

### Upload with Retry
```typescript
await uploadQueue.add(cached);
// Automatic retry on failure
// Exponential backoff
```

### Check Cache
```typescript
const file = await cacheManager.get(fileId);
if (!file) {
  await downloadFromCloud(fileId);
}
```

### Evict Files
```typescript
const stats = await cacheManager.getStats();
if (stats.size > 450MB) {
  await evictionStrategy.evict(50MB);
}
```

---

## Libraries Needed
```bash
bun add @react-native-community/netinfo  # Network
bun add p-queue                          # Queue
bun add expo-crypto                      # Checksums
```

---

## Success Metrics
- Cache hit rate: >80%
- Upload success: >95%
- Avg upload (5MB): <10s
- Cache efficiency: >70%

---

## Key Services

```typescript
CacheManager     // Coordinator
UploadQueue      // Background uploads
SyncManager      // Realtime sync
EvictionStrategy // LRU implementation
```

---

## Emergency Debug

**Files not uploading?**
- Check network connectivity
- Verify queue is processing
- Check upload state in DB

**Cache full?**
- Run eviction manually
- Check protected folder size
- Clear old synced files

**App crashes?**
- Check file sizes (<20MB)
- Verify concurrent limit
- Review memory usage

**Sync not working?**
- Verify realtime subscription
- Check company_id filter
- Test with manual refresh

---

## Quick Decisions

Before coding, decide:
1. LRU eviction? **YES**
2. CacheDirectory? **YES**
3. Checksums? **YES**
4. Retry (5x)? **YES**
5. Concurrent (3)? **YES**
6. WiFi-aware? **YES**

---

## Read Full Docs

📘 **Implementation Guide** - Detailed technical guide  
📋 **Quick Checklist** - Phase-by-phase tasks  
🏗️ **Architecture** - Visual diagrams  
📄 **Summary** - Top 10 issues  
🎯 **This Card** - Quick reference  

---

**Start Simple. Measure. Iterate.** 🚀

