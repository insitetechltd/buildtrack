# 🏗️ BuildTrack File Upload Architecture

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          BUILDTRACK MOBILE APP                          │
│                      (React Native + Expo SDK 54)                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
    ▼                               ▼                               ▼
┌─────────┐                  ┌──────────┐                   ┌──────────┐
│ Camera  │                  │ Gallery  │                   │ Document │
│ Picker  │                  │ Picker   │                   │  Picker  │
└─────────┘                  └──────────┘                   └──────────┘
    │                               │                               │
    │          expo-image-picker    │      expo-document-picker    │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  expo-file-system     │
                        │  (Read file as base64)│
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ useFileUpload Hook    │
                        │ (Business Logic)      │
                        └───────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ fileUploadService.ts  │
                        │ (API Layer)           │
                        └───────────────────────┘
                                    │
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │   Validate   │   │   Upload to  │   │   Save to    │
        │  File Type   │   │   Storage    │   │   Database   │
        │  & Size      │   │              │   │              │
        └──────────────┘   └──────────────┘   └──────────────┘
                │                   │                   │
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE BACKEND                                │
└────────────────────────────────────────────────────────────────────────┘
                │                               │
                │                               │
                ▼                               ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│   SUPABASE STORAGE        │       │   POSTGRESQL DATABASE     │
│   (Object Storage)        │       │   (Metadata Storage)      │
├───────────────────────────┤       ├───────────────────────────┤
│                           │       │                           │
│ 📦 buildtrack-files       │       │ 📊 file_attachments       │
│    (Private Bucket)       │       │    (Table)                │
│    - Max 50MB             │       │    - id                   │
│    - Company isolated     │       │    - file_name            │
│    - Authenticated only   │       │    - file_type            │
│                           │       │    - storage_path         │
│ Structure:                │       │    - public_url           │
│  {company_id}/            │       │    - entity_type          │
│    tasks/                 │       │    - entity_id            │
│      {task_id}/           │       │    - uploaded_by          │
│        file-123.jpg       │       │    - company_id           │
│        doc-456.pdf        │       │    - timestamps           │
│    projects/              │       │    - soft delete          │
│      {project_id}/        │       │                           │
│        ...                │       │ 🔒 RLS Policies:          │
│                           │       │    - Company isolation    │
│ 📦 buildtrack-public      │       │    - Role-based access    │
│    (Public Bucket)        │       │    - Owner verification   │
│    - Max 10MB             │       │                           │
│    - Public readable      │       │ 📈 Indexes:               │
│    - Logos & banners      │       │    - entity lookup        │
│                           │       │    - company lookup       │
│ Structure:                │       │    - date range           │
│  companies/               │       │                           │
│    {company_id}/          │       │                           │
│      logo.png             │       │                           │
│      banner.jpg           │       │                           │
│                           │       │                           │
└───────────────────────────┘       └───────────────────────────┘
                │                               │
                │    🔒 Storage Policies        │    🔒 RLS Policies
                │    - Company folders          │    - SELECT: Own company
                │    - Auth required            │    - INSERT: Authenticated
                │    - Owner for delete         │    - UPDATE: Owner/Admin
                │                               │    - DELETE: Soft only
                │                               │
                └───────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Returns Public URL  │
                    │   + File Metadata     │
                    └───────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         MOBILE APP UI                                   │
└────────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ CreateTaskScreen │ │TaskDetailScr.│ │AdminDashboard│
    │                  │ │              │ │              │
    │ - Attach files   │ │ - View files │ │ - Logo/banner│
    │ - Show preview   │ │ - Add photos │ │ - Upload     │
    │ - Upload progress│ │ - Delete     │ │              │
    └──────────────────┘ └──────────────┘ └──────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │FileAttachmentPreview  │
                    │     Component         │
                    │                       │
                    │ - Image preview       │
                    │ - Document icon       │
                    │ - File size           │
                    │ - Delete button       │
                    └───────────────────────┘
```

---

## Data Flow Diagrams

### Upload Flow

```
1. User Action
   │
   ▼
   User taps "Upload Photo" button
   │
   ▼
2. Permission Check
   │
   ├─→ Camera: Request camera permission
   └─→ Gallery: Request media library permission
   │
   ▼
3. File Selection
   │
   ├─→ Camera: Take photo (expo-image-picker)
   ├─→ Gallery: Select images (expo-image-picker, multiple)
   └─→ Documents: Select files (expo-document-picker)
   │
   ▼
4. File Processing
   │
   ├─→ Read file as base64 (expo-file-system)
   ├─→ Get file info (size, name, type)
   └─→ Validate file (size < 50MB, allowed MIME type)
   │
   ▼
5. Upload to Storage
   │
   ├─→ Generate unique filename (timestamp-originalname)
   ├─→ Determine storage path ({company_id}/{entity_type}/{entity_id}/file)
   ├─→ Upload to Supabase Storage (supabase.storage.upload)
   └─→ Get public URL
   │
   ▼
6. Save Metadata
   │
   ├─→ Determine file type (image/document/video/other)
   ├─→ Insert to file_attachments table
   │   - file_name, file_type, file_size
   │   - storage_path, public_url
   │   - entity_type, entity_id
   │   - uploaded_by, company_id
   └─→ Get record ID
   │
   ▼
7. Update UI
   │
   ├─→ Add to local state
   ├─→ Show preview
   └─→ Display success message
   │
   ▼
8. Complete ✅
```

### Retrieval Flow

```
1. Component Mount
   │
   ▼
   Screen loads (e.g., TaskDetailScreen)
   │
   ▼
2. Fetch Files
   │
   ├─→ Call getFilesForEntity(entity_type, entity_id)
   └─→ Query file_attachments table
       WHERE entity_type = 'task'
       AND entity_id = '{task_id}'
       AND deleted_at IS NULL
   │
   ▼
3. RLS Check (Automatic)
   │
   ├─→ Verify user's company_id matches file's company_id
   └─→ Return only authorized files
   │
   ▼
4. Render Files
   │
   ├─→ Map through file list
   ├─→ Render FileAttachmentPreview for each
   │   - If image: Show thumbnail
   │   - If document: Show icon
   │   - Show file name and size
   └─→ Add delete button (if authorized)
   │
   ▼
5. Display ✅
```

### Delete Flow

```
1. User Action
   │
   ▼
   User taps delete button on file preview
   │
   ▼
2. Confirm Delete
   │
   └─→ Show confirmation alert (optional)
   │
   ▼
3. Soft Delete
   │
   ├─→ Call deleteFile(file_id, user_id)
   ├─→ Update file_attachments
   │   SET deleted_at = NOW()
   │   SET deleted_by = user_id
   │   WHERE id = file_id
   └─→ RLS verifies user permission
   │
   ▼
4. Update UI
   │
   ├─→ Remove from local state
   └─→ Hide from display
   │
   ▼
5. Complete ✅

Note: File remains in storage for potential recovery
Hard delete can be done by admin via cleanup function
```

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
└────────────────────────────────────────────────────────────┘

Layer 1: Authentication
┌──────────────────────────────────────────────────┐
│  Supabase Auth (JWT Tokens)                     │
│  - Email/password authentication                 │
│  - Session management                            │
│  - Auto token refresh                            │
└──────────────────────────────────────────────────┘
                    │
                    ▼
Layer 2: User Identity
┌──────────────────────────────────────────────────┐
│  Users Table                                     │
│  - id (UUID) → auth.uid()                       │
│  - company_id → Company isolation               │
│  - role → Permission level                       │
└──────────────────────────────────────────────────┘
                    │
                    ▼
Layer 3: Row Level Security (RLS)
┌──────────────────────────────────────────────────┐
│  Database Policies                               │
│  ✓ SELECT: Own company only                     │
│  ✓ INSERT: Authenticated + company match        │
│  ✓ UPDATE: Owner or admin only                  │
│  ✓ DELETE: Soft delete only                     │
└──────────────────────────────────────────────────┘
                    │
                    ▼
Layer 4: Storage Policies
┌──────────────────────────────────────────────────┐
│  Bucket Access Control                           │
│  ✓ Upload: Own company folder only              │
│  ✓ Read: Own company files only                 │
│  ✓ Delete: Owner or admin only                  │
│  ✓ Path validation: {company_id} must match     │
└──────────────────────────────────────────────────┘
                    │
                    ▼
Layer 5: File Validation
┌──────────────────────────────────────────────────┐
│  Trigger Validation                              │
│  ✓ File size: <= 50MB                           │
│  ✓ MIME type: Whitelist only                    │
│  ✓ Extension check                               │
│  ✓ Company isolation                             │
└──────────────────────────────────────────────────┘
                    │
                    ▼
Layer 6: Application Logic
┌──────────────────────────────────────────────────┐
│  Client-side Validation                          │
│  ✓ File type check before upload                │
│  ✓ Size check before upload                     │
│  ✓ Permission check before action               │
│  ✓ Error handling                                │
└──────────────────────────────────────────────────┘

🔒 Result: Multi-layer security with defense in depth
```

---

## Component Hierarchy

```
App
│
├── AppNavigator
│   │
│   ├── LoginScreen
│   │
│   └── MainStack
│       │
│       ├── DashboardScreen
│       │
│       ├── ProjectsScreen
│       │   └── ProjectDetailScreen
│       │
│       ├── TasksScreen
│       │   ├── TaskDetailScreen
│       │   │   ├── FileAttachmentPreview (multiple) 🆕
│       │   │   └── [Add Photos Button → useFileUpload hook] 🆕
│       │   │
│       │   └── CreateTaskScreen
│       │       ├── FileAttachmentPreview (multiple) 🆕
│       │       └── [Upload Button → useFileUpload hook] 🆕
│       │
│       └── AdminDashboardScreen
│           └── [Banner/Logo Upload → useFileUpload hook] 🆕
│
├── State Management (Zustand)
│   ├── authStore (existing)
│   ├── taskStore (update with file methods) 🔄
│   └── [Could add: fileStore for centralized file management] 🆕
│
└── Services/Utils
    ├── api/
    │   ├── supabase.ts (existing)
    │   └── fileUploadService.ts 🆕
    │       ├── uploadFile()
    │       ├── getFilesForEntity()
    │       ├── deleteFile()
    │       └── permanentlyDeleteFile()
    │
    ├── utils/
    │   └── useFileUpload.ts 🆕
    │       ├── pickAndUploadImages()
    │       └── pickAndUploadDocuments()
    │
    └── components/
        └── FileAttachmentPreview.tsx 🆕

Legend:
🆕 New files/components to create
🔄 Existing files to update
```

---

## Database Schema Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    file_attachments                          │
├──────────────────┬───────────────────────────────────────────┤
│ Column           │ Type / Constraints                        │
├──────────────────┼───────────────────────────────────────────┤
│ id               │ UUID PRIMARY KEY (auto-generated)        │
│ file_name        │ TEXT NOT NULL                            │
│ file_type        │ TEXT NOT NULL (image/document/video)     │
│ file_size        │ INTEGER NOT NULL (max 50MB)              │
│ mime_type        │ TEXT NOT NULL (validated)                │
│ storage_path     │ TEXT NOT NULL UNIQUE                     │
│ public_url       │ TEXT NOT NULL                            │
│ entity_type      │ TEXT NOT NULL (task/project/etc.)        │
│ entity_id        │ UUID NOT NULL                            │
│ uploaded_by      │ UUID FK → users(id)                      │
│ company_id       │ UUID FK → companies(id) CASCADE          │
│ description      │ TEXT (optional)                           │
│ tags             │ TEXT[] DEFAULT '{}'                       │
│ created_at       │ TIMESTAMPTZ DEFAULT NOW()                │
│ updated_at       │ TIMESTAMPTZ DEFAULT NOW()                │
│ deleted_at       │ TIMESTAMPTZ (soft delete)                │
│ deleted_by       │ UUID FK → users(id)                      │
└──────────────────┴───────────────────────────────────────────┘
                    │
                    │ Relationships
                    ├─→ users (uploaded_by)
                    ├─→ users (deleted_by)
                    ├─→ companies (company_id)
                    └─→ Can link to: tasks, projects, etc. (via entity_id)
```

---

## File Upload State Machine

```
[IDLE]
  │
  │ User taps upload
  │
  ▼
[SELECTING FILE]
  │
  ├─→ User cancels ──→ [IDLE]
  │
  │ User selects file
  │
  ▼
[VALIDATING]
  │
  ├─→ Invalid file ──→ [ERROR] ──→ Show error ──→ [IDLE]
  │
  │ File valid
  │
  ▼
[UPLOADING]
  │ (Show progress: 0-100%)
  │
  ├─→ Network error ──→ [RETRY] ──┐
  │                                │
  │                           Retry or Cancel
  │                                │
  │ ◄──────────────────────────────┘
  │
  │ Upload successful
  │
  ▼
[SAVING METADATA]
  │
  ├─→ Database error ──→ [ERROR] ──→ Cleanup + Show error ──→ [IDLE]
  │
  │ Metadata saved
  │
  ▼
[SUCCESS]
  │
  │ Show preview
  │ Update UI
  │
  ▼
[IDLE]
```

---

## Technology Stack

```
┌────────────────────────────────────────────────────────────┐
│                     FRONTEND                                │
├────────────────────────────────────────────────────────────┤
│  React Native             │ v0.81.4                         │
│  Expo SDK                 │ v54.0                           │
│  TypeScript               │ v5.8.3                          │
│  Zustand                  │ v5.0.4 (State management)       │
│  NativeWind               │ v4.1.23 (Styling)               │
├────────────────────────────────────────────────────────────┤
│  expo-image-picker        │ v16.1.4 (Camera/gallery)        │
│  expo-document-picker     │ v13.1.5 (Documents)             │
│  expo-file-system         │ v18.1.8 (File operations)       │
│  expo-image-manipulator   │ v13.1.5 (Compression)           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     BACKEND                                 │
├────────────────────────────────────────────────────────────┤
│  Supabase                 │ Cloud backend platform          │
│  PostgreSQL               │ v15 (Database)                  │
│  Supabase Storage         │ Object storage (S3-compatible)  │
│  Supabase Auth            │ JWT authentication              │
│  Row Level Security       │ Database-level security         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     INTEGRATIONS                            │
├────────────────────────────────────────────────────────────┤
│  @supabase/supabase-js    │ v2.75.0 (Client library)        │
│  base64-arraybuffer       │ For file encoding               │
└────────────────────────────────────────────────────────────┘
```

---

## File Size Limits & Recommendations

```
File Type          | Max Size | Recommended | Format
─────────────────────────────────────────────────────────
Photos (Camera)    | 50 MB    | 2-5 MB      | JPEG (compressed)
Photos (Gallery)   | 50 MB    | 2-5 MB      | JPEG/PNG
Documents (PDF)    | 50 MB    | 1-10 MB     | PDF
Office Docs        | 50 MB    | 1-5 MB      | DOCX/XLSX
Videos             | 50 MB    | N/A         | Not recommended
                                               (size limit)

Compression Strategy:
─────────────────────────────────────────────────────────
Images             | Use expo-image-manipulator
                  | Quality: 0.7 (70%)
                  | Max width: 1920px
                  | Expected reduction: 50-70%

Documents         | No compression (preserve quality)

Videos            | Not recommended due to size
                  | Consider alternative (external links)
```

---

## Performance Considerations

```
Optimization                | Impact          | Priority
────────────────────────────────────────────────────────────
Image compression           | High (70% size) | ⚡ HIGH
Thumbnail generation        | Medium          | 🔶 MEDIUM
Lazy loading file lists     | Medium          | 🔶 MEDIUM
Caching public URLs         | Low             | 🟡 LOW
Parallel uploads            | Medium          | 🔶 MEDIUM
Progress indicators         | High (UX)       | ⚡ HIGH
Retry mechanism             | High (UX)       | ⚡ HIGH
Offline queue               | Medium          | 🟡 LOW

Expected Performance:
────────────────────────────────────────────────────────────
Upload Time (5MB image)     | ~5-10 seconds
Upload Time (1MB document)  | ~2-5 seconds
Fetch file list (10 files)  | ~1-2 seconds
Delete file                 | ~1 second
Large file (45MB)           | ~30-60 seconds

Network Conditions:
────────────────────────────────────────────────────────────
Fast WiFi (50+ Mbps)        | Excellent
4G LTE (10-20 Mbps)         | Good
3G (1-5 Mbps)               | Acceptable (with compression)
Slow 3G (<1 Mbps)           | Poor (show warning)
```

---

## Error Handling Flow

```
Error Type                  | Handler                | User Action
─────────────────────────────────────────────────────────────────────
No Internet Connection     | Detect + Queue         | Show offline banner
                                                     | Retry when online

Permission Denied          | Alert user             | Show settings link
(Camera/Gallery)                                    | Explain why needed

File Too Large            | Validate before upload  | Show size limit
                                                     | Suggest compression

Invalid File Type         | Validate before upload  | Show allowed types
                                                     | Explain restriction

Storage Quota Exceeded    | Catch from Supabase    | Contact admin
                                                     | Show usage stats

Network Timeout           | Retry mechanism         | Auto-retry (3x)
                                                     | Then show error

Database Error            | Log + rollback          | Generic error msg
                                                     | Support contact

Upload Failed             | Cleanup + error msg     | Retry button
(Generic)                                           | Cancel option

RLS Policy Blocked        | Detect + explain        | Contact admin
                                                     | Explain permissions
```

---

## Cost Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COST BREAKDOWN                            │
└─────────────────────────────────────────────────────────────┘

Supabase Free Tier:
┌────────────────────┬─────────────┬──────────────────────────┐
│ Resource           │ Limit       │ Usage Strategy           │
├────────────────────┼─────────────┼──────────────────────────┤
│ Storage            │ 1 GB        │ ■■■□□□□□□□ ~30% (300MB)  │
│                    │             │ • Compress images        │
│                    │             │ • Delete old files       │
├────────────────────┼─────────────┼──────────────────────────┤
│ Bandwidth          │ 2 GB/month  │ ■■■□□□□□□□ ~30% (600MB)  │
│                    │             │ • Use thumbnails         │
│                    │             │ • Cache URLs             │
├────────────────────┼─────────────┼──────────────────────────┤
│ Database           │ 500 MB      │ ■■□□□□□□□□ ~20% (100MB)  │
│                    │             │ • Metadata only          │
│                    │             │ • Regular cleanup        │
└────────────────────┴─────────────┴──────────────────────────┘

Cost Projections:
┌────────────────────┬─────────────┬──────────────────────────┐
│ Usage Tier         │ Monthly Cost│ Capacity                 │
├────────────────────┼─────────────┼──────────────────────────┤
│ Free               │ $0          │ ~100 images + 50 docs    │
│                    │             │ Good for: 5-10 users     │
├────────────────────┼─────────────┼──────────────────────────┤
│ Pro                │ $25         │ ~10,000 images + 5k docs │
│                    │             │ Good for: 50+ users      │
├────────────────────┼─────────────┼──────────────────────────┤
│ Team               │ $599        │ Unlimited                │
│                    │             │ Enterprise scale         │
└────────────────────┴─────────────┴──────────────────────────┘

Upgrade Triggers:
• Storage > 800 MB (80% of free tier)
• Bandwidth > 1.6 GB/month (80% of free tier)
• User count > 20
• Support needs increase
```

---

## Monitoring Dashboard (Conceptual)

```
┌──────────────────────────────────────────────────────────────┐
│                  FILE UPLOAD METRICS                          │
└──────────────────────────────────────────────────────────────┘

Real-time Stats:
┌────────────────────┬─────────────────────────────────────────┐
│ Total Files        │ 1,234 ⬆ +12 today                       │
│ Total Size         │ 456 MB / 1 GB (46%) ⚠                   │
│ Bandwidth (30d)    │ 1.2 GB / 2 GB (60%) ✓                   │
│ Upload Success     │ 98.5% ✓                                 │
│ Avg Upload Time    │ 8.2 seconds ✓                           │
└────────────────────┴─────────────────────────────────────────┘

File Distribution:
┌────────────────────┬──────────────────────────────────────┐
│ Images             │ ████████████████░░░░ 834 (67%)       │
│ Documents          │ ██████░░░░░░░░░░░░░░ 312 (25%)       │
│ Other              │ ██░░░░░░░░░░░░░░░░░░  88 (8%)        │
└────────────────────┴──────────────────────────────────────┘

Recent Activity:
┌────────────────────┬──────────────┬──────────────────────┐
│ Time               │ User         │ Action               │
├────────────────────┼──────────────┼──────────────────────┤
│ 2 min ago          │ John Doe     │ Uploaded photo.jpg   │
│ 5 min ago          │ Jane Smith   │ Uploaded doc.pdf     │
│ 8 min ago          │ Bob Wilson   │ Deleted old-file.jpg │
└────────────────────┴──────────────┴──────────────────────┘

Alerts:
⚠ Storage at 46% - Consider cleanup or upgrade
✓ All systems operational
```

---

**Architecture planning complete!** 🎉

This architecture supports:
✅ Scalable file storage
✅ Secure access control
✅ Multi-layer security
✅ Cost-effective operations
✅ Great user experience
✅ Easy monitoring

Ready for implementation!

