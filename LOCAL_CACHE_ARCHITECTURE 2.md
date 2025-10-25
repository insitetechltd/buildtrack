# 🏗️ Local File Cache Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILDTRACK APP                            │
│                   Local-First File Strategy                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
        ┌──────────────────┐   ┌──────────────────┐
        │  LOCAL CACHE     │   │  CLOUD STORAGE   │
        │  (Device)        │   │  (Supabase)      │
        │  Max: 500MB      │   │  Unlimited       │
        └──────────────────┘   └──────────────────┘
```

---

## Upload Flow (Local-First)

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER ACTION                             │
│                    Selects Photo/Document                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: SAVE LOCALLY (Immediate, always succeeds)              │
├─────────────────────────────────────────────────────────────────┤
│  1. Copy file to: CacheDirectory/buildtrack-files/pending/     │
│  2. Generate checksum (SHA-256)                                 │
│  3. Save metadata to database:                                  │
│     - state: 'local-only'                                       │
│     - localPath: /cache/pending/abc123.jpg                      │
│     - checksum: a1b2c3...                                       │
│  4. Show preview to user ✅ (instant feedback)                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: ADD TO UPLOAD QUEUE (Background)                       │
├─────────────────────────────────────────────────────────────────┤
│  Upload Queue:                                                  │
│  ┌────────────────────────────────┐                            │
│  │ [abc123.jpg] - Pending          │                            │
│  │ [def456.pdf] - Uploading (45%) │                            │
│  │ [ghi789.jpg] - Retrying (2/5)  │                            │
│  └────────────────────────────────┘                            │
│                                                                 │
│  Process queue:                                                 │
│  - Check network connectivity                                   │
│  - Limit to 3 concurrent uploads (WiFi) or 1 (cellular)        │
│  - Update state to 'uploading'                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: UPLOAD TO CLOUD (Background with retry)                │
├─────────────────────────────────────────────────────────────────┤
│  Try upload to Supabase Storage:                               │
│  ┌─────────────────────────────┐                               │
│  │ supabase.storage.upload()   │                               │
│  │ - path: company_id/tasks/... │                               │
│  │ - file: base64 data          │                               │
│  └─────────────────────────────┘                               │
│                                                                 │
│  On Success:                          On Failure:               │
│  └─> Update metadata:                 └─> Retry logic:         │
│      - state: 'synced'                    - Attempt 1: 2s wait  │
│      - cloudPath: ...                     - Attempt 2: 4s wait  │
│      - publicUrl: ...                     - Attempt 3: 8s wait  │
│                                           - Attempt 4: 16s wait │
│                                           - Attempt 5: 32s wait │
│                                           - Max failed: Mark    │
│                                             state: 'failed'     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: MOVE TO CACHE (After successful upload)                │
├─────────────────────────────────────────────────────────────────┤
│  Move file from pending to cache:                              │
│  - From: CacheDirectory/buildtrack-files/pending/abc123.jpg    │
│  - To:   CacheDirectory/buildtrack-files/images/abc123.jpg     │
│                                                                 │
│  File is now cached and can be evicted if needed               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Download Flow (Cloud → Local Cache)

```
┌─────────────────────────────────────────────────────────────────┐
│                          TRIGGER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Option A: User taps to view file (on-demand)                  │
│  Option B: Realtime notification (new file uploaded)            │
│  Option C: Auto-download (small file, WiFi, relevant)           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: CHECK CACHE                                            │
├─────────────────────────────────────────────────────────────────┤
│  Query metadata database:                                       │
│  - Is file already cached?                                      │
│  - If yes: Check if valid (not corrupted, not expired)         │
│  - If valid: Serve from cache ✅ (instant)                      │
│  - If invalid or missing: Proceed to download                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: DOWNLOAD FROM CLOUD                                    │
├─────────────────────────────────────────────────────────────────┤
│  Download from Supabase Storage:                               │
│  - Get public URL from metadata                                 │
│  - Download file to temp location                               │
│  - Calculate checksum                                           │
│  - Verify integrity                                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: SAVE TO CACHE                                          │
├─────────────────────────────────────────────────────────────────┤
│  Check cache space:                                             │
│  - Current size: 450MB / 500MB                                  │
│  - File size: 10MB                                              │
│  - Space needed: 460MB (OK)                                     │
│                                                                 │
│  If cache full:                                                 │
│  - Run eviction algorithm (LRU)                                 │
│  - Remove old synced files                                      │
│  - Free up space                                                │
│                                                                 │
│  Save file:                                                     │
│  - Move from temp to cache directory                            │
│  - Update metadata (state: 'synced', localPath: ...)          │
│  - Update lastAccessedAt                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cache Eviction Algorithm (LRU)

```
┌─────────────────────────────────────────────────────────────────┐
│                      EVICTION TRIGGER                            │
├─────────────────────────────────────────────────────────────────┤
│  Cache size >= 450MB (90% threshold)                            │
│  OR Cache size + new file > 500MB                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: GET EVICTION CANDIDATES                                │
├─────────────────────────────────────────────────────────────────┤
│  Query files WHERE:                                             │
│  - state = 'synced' (NEVER evict pending uploads!)             │
│  - NOT starred by user (if feature exists)                      │
│  ORDER BY lastAccessedAt ASC (oldest first)                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: CALCULATE SPACE NEEDED                                 │
├─────────────────────────────────────────────────────────────────┤
│  Current: 480MB                                                 │
│  Target:  400MB (80% of limit, buffer for new files)           │
│  Need to free: 80MB                                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: EVICT FILES                                            │
├─────────────────────────────────────────────────────────────────┤
│  Loop through candidates:                                       │
│  ┌─────────────────────────────────────┐                       │
│  │ File: old-photo.jpg (5MB)           │                       │
│  │ Last accessed: 45 days ago          │                       │
│  │ → Delete from file system           │                       │
│  │ → Update metadata (localPath: null) │                       │
│  │ → Freed: 5MB                        │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Continue until 80MB freed or no more candidates               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: UPDATE CACHE STATS                                     │
├─────────────────────────────────────────────────────────────────┤
│  Cache size: 480MB → 400MB ✅                                   │
│  Files evicted: 12                                              │
│  Space available: 100MB for new files                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Realtime Sync (Cloud Changes → Local Cache)

```
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE REALTIME EVENT                        │
├─────────────────────────────────────────────────────────────────┤
│  Channel: 'file-changes'                                        │
│  Table: 'file_attachments'                                      │
│  Filter: company_id = current user's company                    │
│                                                                 │
│  Event Types:                                                   │
│  - INSERT: New file uploaded (maybe by another user)            │
│  - UPDATE: File metadata changed                                │
│  - DELETE: File deleted                                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  INSERT  │   │  UPDATE  │   │  DELETE  │
        └──────────┘   └──────────┘   └──────────┘
                │              │              │
                ▼              ▼              ▼
┌────────────────────┐ ┌────────────┐ ┌────────────────┐
│ New file uploaded  │ │File changed│ │ File deleted   │
│ by another user/   │ │(rare case) │ │ from cloud     │
│ device             │ └────────────┘ └────────────────┘
└────────────────────┘         │              │
        │                      │              │
        ▼                      ▼              ▼
Should auto-download?    Update metadata  Remove from cache
        │                      │              │
        ├─ File size < 2MB?    └──────────────┴───────────┐
        ├─ User on WiFi?                                   │
        ├─ Cache has space?                                │
        ├─ File relevant?                                  │
        │                                                   │
    ┌───┴───┐                                              │
    ▼       ▼                                              ▼
   YES      NO                                    ┌──────────────┐
    │       │                                     │ Show toast:  │
    │       └─> Save metadata only                │ "File deleted│
    │           Show notification                 │  by X"       │
    │           "New file available"              └──────────────┘
    │
    ▼
Download and cache automatically
Show notification: "Downloaded new file"
```

---

## File State Machine

```
┌──────────────┐
│   NOT_EXIST  │ (File doesn't exist yet)
└──────────────┘
       │
       │ User selects file
       ▼
┌──────────────┐
│  LOCAL_ONLY  │ (Saved to cache, not uploaded)
└──────────────┘
       │
       │ Add to upload queue
       ▼
┌──────────────┐
│  UPLOADING   │ (Currently uploading to cloud)
└──────────────┘
       │
       ├─── Upload fails ───┐
       │                    ▼
       │            ┌──────────────┐
       │            │   FAILED     │ (Will retry)
       │            └──────────────┘
       │                    │
       │                    │ Retry
       │                    └────────────┐
       │                                 │
       │ Upload succeeds <───────────────┘
       ▼
┌──────────────┐
│   SYNCED     │ (Uploaded, cached locally)
└──────────────┘
       │
       ├─── User views ────> Update lastAccessedAt
       │
       ├─── Cache full ────┐
       │                   ▼
       │            ┌──────────────┐
       │            │ NOT_CACHED   │ (Evicted, download on demand)
       │            └──────────────┘
       │                   │
       │                   │ User views
       │                   ▼
       │            ┌──────────────┐
       │            │ DOWNLOADING  │
       │            └──────────────┘
       │                   │
       │                   └───────> Back to SYNCED
       │
       │ User deletes
       ▼
┌──────────────┐
│   DELETED    │ (Soft deleted)
└──────────────┘
```

---

## Storage Structure

```
CacheDirectory/
└── buildtrack-files/
    ├── pending/                    (Protected from eviction)
    │   ├── abc123.jpg              (Uploading or failed)
    │   ├── def456.pdf              (Waiting to upload)
    │   └── ghi789.png              (Retrying)
    │
    ├── images/                     (Can be evicted)
    │   ├── jkl012.jpg
    │   ├── mno345.png
    │   └── pqr678.jpg
    │
    ├── documents/                  (Can be evicted)
    │   ├── stu901.pdf
    │   ├── vwx234.docx
    │   └── yza567.xlsx
    │
    └── .metadata/                  (Cache metadata)
        ├── cache.db                (SQLite database)
        └── cache-stats.json        (Quick stats)
```

---

## Database Schema (Metadata)

```sql
-- Cache metadata database (SQLite or AsyncStorage JSON)

CREATE TABLE cached_files (
  -- Identity
  id TEXT PRIMARY KEY,              -- Matches Supabase file_id
  
  -- Storage
  local_path TEXT,                  -- Path in cache (null if evicted)
  cloud_path TEXT,                  -- Path in Supabase Storage
  public_url TEXT,                  -- Public URL for download
  
  -- State
  state TEXT NOT NULL,              -- local_only, uploading, synced, etc.
  upload_attempts INTEGER DEFAULT 0,
  error TEXT,                       -- Last error message
  
  -- File info
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,       -- In bytes
  mime_type TEXT NOT NULL,
  checksum TEXT,                    -- SHA-256 checksum
  
  -- Metadata
  entity_type TEXT,                 -- task, project, etc.
  entity_id TEXT,
  uploaded_by TEXT,
  company_id TEXT,
  
  -- Timestamps
  created_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL,   -- For LRU eviction
  cached_at TEXT,                   -- When downloaded to cache
  uploaded_at TEXT,                 -- When uploaded to cloud
  
  -- Indexes for performance
  INDEX idx_state ON cached_files(state),
  INDEX idx_last_accessed ON cached_files(last_accessed_at),
  INDEX idx_entity ON cached_files(entity_type, entity_id)
);

-- Cache statistics (updated on every change)
CREATE TABLE cache_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton
  total_size INTEGER NOT NULL,           -- Total cache size in bytes
  total_files INTEGER NOT NULL,
  pending_uploads INTEGER NOT NULL,
  last_eviction TEXT,
  updated_at TEXT NOT NULL
);
```

---

## Service Architecture

```typescript
// CacheManager (Main coordinator)
class CacheManager {
  // Core operations
  async cacheFile(uri: string): Promise<CachedFile>
  async getCachedFile(id: string): Promise<string | null>
  async evictFiles(bytesToFree: number): Promise<void>
  
  // Statistics
  async getStats(): Promise<CacheStats>
  async getCacheSize(): Promise<number>
  
  // Cleanup
  async clearCache(options?: ClearOptions): Promise<void>
  async verifyIntegrity(): Promise<void>
}

// UploadQueue (Background uploads)
class UploadQueue {
  // Queue management
  async addToQueue(file: CachedFile): Promise<void>
  async processQueue(): Promise<void>
  async retryFailed(): Promise<void>
  
  // State
  getPendingUploads(): Promise<CachedFile[]>
  getFailedUploads(): Promise<CachedFile[]>
}

// SyncManager (Realtime sync)
class SyncManager {
  // Subscriptions
  subscribe(): void
  unsubscribe(): void
  
  // Handlers
  handleNewFile(fileData: any): Promise<void>
  handleFileUpdate(fileData: any): Promise<void>
  handleFileDelete(fileData: any): Promise<void>
  
  // Auto-download
  shouldAutoDownload(file: any): Promise<boolean>
}

// EvictionStrategy (LRU implementation)
class LRUEvictionStrategy {
  async getCandidates(): Promise<CachedFile[]>
  async evict(bytesToFree: number): Promise<number>
  updateAccessTime(id: string): Promise<void>
}
```

---

## Network Flow Matrix

| Network Type | Upload Strategy | Download Strategy | Concurrent Limit |
|--------------|----------------|-------------------|------------------|
| WiFi (Fast) | Immediate | Auto-download small files | 3 uploads |
| WiFi (Slow) | Immediate | Manual download | 2 uploads |
| 4G/LTE | Immediate with warning (>5MB) | Manual download | 1 upload |
| 3G | Queue for WiFi (>2MB) | Manual download | 1 upload |
| Offline | Queue for later | Show cached only | 0 |

---

## Error Handling Flow

```
┌─────────────┐
│   Error     │
│  Occurred   │
└─────────────┘
       │
       ▼
What type of error?
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
Network Error                            Permission Error
(No internet)                            (Camera/Storage denied)
       │                                         │
       ├─> Queue for retry                       ├─> Show alert
       ├─> Show "Uploading when                  ├─> Guide to settings
       │   online" message                       └─> Allow retry
       └─> Monitor connectivity
                                                  │
       ├─────────────────────────────────────────┤
       │                                         │
       ▼                                         ▼
File Too Large                           Storage Full (Cache)
(>50MB)                                  (>500MB)
       │                                         │
       ├─> Reject upload                         ├─> Run eviction
       ├─> Show size limit                       ├─> If still full:
       └─> Suggest compression                   │   - Show error
                                                 └─  - Suggest clear cache
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ▼                                         ▼
File Corrupted                           Upload Failed (5xx)
(Bad checksum)                           (Server error)
       │                                         │
       ├─> Delete corrupted file                 ├─> Retry with backoff
       ├─> Re-download from cloud                ├─> Max 5 attempts
       └─> Show error if can't recover           └─> Mark failed if all fail
```

---

## Performance Benchmarks

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Cache file locally | <500ms | <1s | >2s |
| Upload 5MB image | <10s | <20s | >30s |
| Download 5MB image | <8s | <15s | >25s |
| Get cached file | <100ms | <500ms | >1s |
| Evict files (100MB) | <2s | <5s | >10s |
| Calculate checksum (5MB) | <1s | <2s | >5s |
| Query metadata (1000 files) | <100ms | <500ms | >1s |

---

**Architecture Summary**:

This local-first architecture ensures:
- ✅ Fast user experience (instant save)
- ✅ Reliability (queued uploads with retry)
- ✅ Efficiency (smart caching and eviction)
- ✅ Scalability (handles 1000s of files)
- ✅ Resilience (recovers from crashes and errors)

