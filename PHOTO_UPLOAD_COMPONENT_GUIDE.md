# 📸 PhotoUploadSection Component - Usage Guide

## Overview

The `PhotoUploadSection` is a reusable component for photo/document uploads across the entire BuildTrack app. It provides a consistent user experience for adding, previewing, and removing photos.

## Location

```
src/components/PhotoUploadSection.tsx
```

## Features

✅ **Three Upload Methods:**
- 📷 Take Photo (Camera)
- 🖼️ Choose from Library
- 📋 Paste from Clipboard

✅ **Photo Management:**
- Real photo previews (96x96px thumbnails)
- Individual photo deletion (X button on each)
- Horizontal scrolling for multiple photos
- Empty state placeholder

✅ **Configurable:**
- Custom title
- Custom empty message
- Max photos limit
- Photo count badge

## Usage

### Basic Usage

```tsx
import { PhotoUploadSection } from "../components/PhotoUploadSection";

function MyScreen() {
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <PhotoUploadSection
      photos={photos}
      onPhotosChange={setPhotos}
    />
  );
}
```

### Advanced Usage

```tsx
<PhotoUploadSection
  photos={photos}
  onPhotosChange={setPhotos}
  title="Project Photos"                // Custom title
  emptyMessage="No project photos yet"  // Custom empty message
  maxPhotos={10}                        // Limit to 10 photos
  showCount={true}                      // Show photo count badge
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `photos` | `string[]` | *required* | Array of photo URIs |
| `onPhotosChange` | `(photos: string[]) => void` | *required* | Callback when photos change |
| `title` | `string` | `"Photos"` | Section title |
| `emptyMessage` | `string` | `"No photos added"` | Message when no photos |
| `maxPhotos` | `number` | `undefined` | Maximum photos allowed |
| `showCount` | `boolean` | `false` | Show photo count badge |

## Current Usage in App

### 1. TaskDetailScreen - Progress Updates
```tsx
<PhotoUploadSection
  photos={updateForm.photos}
  onPhotosChange={(photos) => setUpdateForm(prev => ({ ...prev, photos }))}
  title="Photos"
  emptyMessage="No photos added"
/>
```

### 2. CreateTaskScreen - Task Attachments
```tsx
<PhotoUploadSection
  photos={formData.attachments}
  onPhotosChange={(attachments) => setFormData(prev => ({ ...prev, attachments }))}
  title="Attachments"
  emptyMessage="No attachments added"
/>
```

## Benefits of Centralized Component

### ✅ **Single Source of Truth**
- Change once, update everywhere
- Consistent UX across the app
- Easier to maintain and debug

### ✅ **Easy to Modify**
Want to change photo upload behavior? Just edit `PhotoUploadSection.tsx`:

**Example Modifications:**
```tsx
// Change thumbnail size
style={{ width: 120, height: 120 }}  // Was 96x96

// Add image compression
quality: 0.5  // Was 0.8

// Change delete button color
backgroundColor: '#dc2626'  // Was '#ef4444'

// Add multiple selection limit
allowsMultipleSelection: true,
selectionLimit: 5,
```

### ✅ **Feature Additions**
Easy to add new features to all photo uploads:

- Image compression
- Upload progress indicators
- Cloud storage integration
- Image cropping
- Filters and effects
- Drag & drop reordering
- Full-screen preview on tap

## Upload Flow

```
User taps "+ Add" button
   ↓
Alert shows 3 options
   ↓
┌─────────────┬──────────────────┬─────────────────────┐
│ Take Photo  │ Choose Library   │ Paste Clipboard     │
└─────────────┴──────────────────┴─────────────────────┘
   ↓                ↓                      ↓
Camera opens   Gallery opens        Clipboard checked
   ↓                ↓                      ↓
Photo taken    Photos selected     Image pasted
   ↓                ↓                      ↓
        └──────────┬──────────┘
                   ↓
           onPhotosChange(newPhotos)
                   ↓
          Parent state updates
                   ↓
         Thumbnails appear with X buttons
```

## Permissions

The component automatically requests:
- **Camera Permission** - For taking photos
- **Photo Library Permission** - For choosing from gallery
- **No permission needed** - For clipboard paste

## Error Handling

- Permission denied → Shows alert
- No clipboard image → Shows alert
- Camera/library error → Shows alert
- Max photos reached → Shows alert with limit

## Styling

All styling is done with:
- **Tailwind/NativeWind classes** for layout
- **Inline styles** for Image components (NativeWind doesn't work on Image)

```tsx
// Layout (NativeWind) ✅
<View className="mb-6">

// Image (Inline styles) ✅
<Image style={{ width: 96, height: 96 }} />
```

## Future Enhancements

Potential features to add:

1. **Image Compression**
   - Automatic resize before upload
   - Reduce file size for faster uploads

2. **Upload Progress**
   - Show progress bar during upload
   - Cancel upload option

3. **Cloud Storage**
   - Upload to S3/Firebase Storage
   - Generate shareable URLs

4. **Image Editing**
   - Crop, rotate, filters
   - Annotations and markup

5. **Video Support**
   - Allow video attachments
   - Video thumbnails

6. **Drag & Drop**
   - Reorder photos
   - Better organization

7. **Full Preview**
   - Tap thumbnail for full view
   - Swipe between photos
   - Zoom and pan

## Migration Guide

### Before (Duplicated Code)
```tsx
// In TaskDetailScreen.tsx - 100 lines
const handleAddPhotos = async () => { /* ... */ }
<View>
  <Text>Photos</Text>
  <Pressable onPress={handleAddPhotos}>
    {/* Complex photo upload UI */}
  </Pressable>
</View>

// In CreateTaskScreen.tsx - 100 lines (duplicated!)
const handlePickImages = async () => { /* ... */ }
<View>
  <Text>Attachments</Text>
  <Pressable onPress={handlePickImages}>
    {/* Complex photo upload UI */}
  </Pressable>
</View>
```

### After (Component)
```tsx
// In TaskDetailScreen.tsx - 5 lines
<PhotoUploadSection
  photos={photos}
  onPhotosChange={setPhotos}
/>

// In CreateTaskScreen.tsx - 5 lines
<PhotoUploadSection
  photos={attachments}
  onPhotosChange={setAttachments}
/>
```

**Saved:** ~200 lines of duplicated code!

## Testing

To test the component:

1. **Camera Test:**
   - Tap "+ Add" → "Take Photo"
   - Take a photo
   - Verify thumbnail appears

2. **Gallery Test:**
   - Tap "+ Add" → "Choose from Library"
   - Select multiple photos
   - Verify all thumbnails appear

3. **Clipboard Test:**
   - Copy an image from Safari/Photos
   - Tap "+ Add" → "Paste from Clipboard"
   - Verify pasted image appears

4. **Delete Test:**
   - Tap X button on any thumbnail
   - Verify photo is removed

5. **Max Photos Test:**
   - Set `maxPhotos={3}`
   - Try adding 4th photo
   - Verify alert shown

## Summary

The `PhotoUploadSection` component:
- ✅ Eliminates code duplication
- ✅ Provides consistent UX
- ✅ Easy to modify globally
- ✅ Well-documented and typed
- ✅ Handles all edge cases
- ✅ Production-ready

**Result:** Change photo upload behavior once, update everywhere! 🎉

