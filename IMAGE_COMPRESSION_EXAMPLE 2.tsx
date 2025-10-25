// Example: How to use the image compression in CreateTaskScreen
// This shows the updated implementation with automatic compression

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFileUpload } from '@/utils/useFileUpload';
import { FileAttachment } from '@/api/fileUploadService';
import { FileAttachmentPreview } from '@/components/FileAttachmentPreview';
import { useAuthStore } from '@/state/authStore';

export default function CreateTaskScreenExample() {
  const currentUser = useAuthStore(state => state.currentUser);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  
  const { 
    pickAndUploadImages, 
    isCompressing, 
    compressionProgress,
    isUploading,
    uploadProgress,
    isBusy 
  } = useFileUpload();

  // Handle image upload with automatic compression
  const handleAddPhotos = async () => {
    if (!currentUser) return;

    // Show action sheet
    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const uploaded = await pickAndUploadImages({
              entityType: 'task',
              entityId: 'temp-task-id', // Use actual task ID
              companyId: currentUser.company_id,
              userId: currentUser.id,
              description: 'Task attachment',
            }, 'camera');

            if (uploaded.length > 0) {
              setAttachments([...attachments, ...uploaded]);
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            const uploaded = await pickAndUploadImages({
              entityType: 'task',
              entityId: 'temp-task-id', // Use actual task ID
              companyId: currentUser.company_id,
              userId: currentUser.id,
              description: 'Task attachment',
            }, 'library');

            if (uploaded.length > 0) {
              setAttachments([...attachments, ...uploaded]);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleRemoveAttachment = (fileId: string) => {
    setAttachments(attachments.filter(a => a.id !== fileId));
    // Also delete from server if needed
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      {/* Other form fields here */}

      {/* Attachments Section */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">
          Attachments
        </Text>

        {/* Upload Button */}
        <Pressable
          onPress={handleAddPhotos}
          disabled={isBusy}
          className={`border-2 border-dashed rounded-lg p-4 bg-white items-center ${
            isBusy ? 'opacity-50 border-gray-200' : 'border-gray-300'
          }`}
        >
          {isBusy ? (
            <View className="items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-600 mt-2">
                {isCompressing 
                  ? `Compressing... ${compressionProgress.toFixed(0)}%`
                  : `Uploading... ${uploadProgress.toFixed(0)}%`
                }
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color="#6b7280" />
              <Text className="text-gray-600 mt-2">
                Tap to add photos
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Images will be automatically compressed to under 5MB
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Selected Files ({attachments.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {attachments.map((attachment) => (
                <FileAttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onDelete={() => handleRemoveAttachment(attachment.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Info Banner */}
      {isCompressing && (
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className="text-blue-700 ml-2 flex-1 text-sm">
              Optimizing images for fast upload. This ensures your photos upload quickly
              and don't consume excessive storage.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ========================================
// ALTERNATIVE: Simpler version without progress
// ========================================

export function SimpleUploadExample() {
  const currentUser = useAuthStore(state => state.currentUser);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const { pickAndUploadImages, isBusy } = useFileUpload();

  const handleAddPhotos = async () => {
    if (!currentUser) return;

    const uploaded = await pickAndUploadImages({
      entityType: 'task',
      entityId: 'task-id',
      companyId: currentUser.company_id,
      userId: currentUser.id,
    }, 'library');

    setAttachments([...attachments, ...uploaded]);
  };

  return (
    <View>
      <Pressable onPress={handleAddPhotos} disabled={isBusy}>
        <Text>{isBusy ? 'Processing...' : 'Add Photos'}</Text>
      </Pressable>

      {attachments.map(file => (
        <Text key={file.id}>{file.file_name}</Text>
      ))}
    </View>
  );
}

// ========================================
// ALTERNATIVE: With compression preview
// ========================================

export function UploadWithPreviewExample() {
  const currentUser = useAuthStore(state => state.currentUser);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const { pickAndUploadImagesWithPreview } = useFileUpload();

  const handleAddPhotos = async () => {
    if (!currentUser) return;

    // This will show a preview alert if compression is needed
    const uploaded = await pickAndUploadImagesWithPreview({
      entityType: 'task',
      entityId: 'task-id',
      companyId: currentUser.company_id,
      userId: currentUser.id,
    }, 'library');

    setAttachments([...attachments, ...uploaded]);
  };

  return (
    <View>
      <Pressable onPress={handleAddPhotos}>
        <Text>Add Photos (with preview)</Text>
      </Pressable>

      {attachments.map(file => (
        <Text key={file.id}>{file.file_name}</Text>
      ))}
    </View>
  );
}

// ========================================
// USAGE IN YOUR ACTUAL CreateTaskScreen
// ========================================

/*
1. Import the hook:
   import { useFileUpload } from '@/utils/useFileUpload';

2. Initialize in your component:
   const { pickAndUploadImages, isCompressing, isUploading, isBusy } = useFileUpload();

3. Replace your current handlePickImages function with:
   
   const handlePickImages = async () => {
     const uploaded = await pickAndUploadImages({
       entityType: 'task',
       entityId: taskId, // Your actual task ID
       companyId: currentUser.company_id,
       userId: currentUser.id,
     }, 'library'); // or 'camera'

     // Update your state with uploaded files
     setFormData(prev => ({
       ...prev,
       attachments: [...prev.attachments, ...uploaded]
     }));
   };

4. Update your upload button to show status:
   
   <Pressable
     onPress={handlePickImages}
     disabled={isBusy}
   >
     <Text>
       {isCompressing ? 'Compressing...' : 
        isUploading ? 'Uploading...' : 
        'Add Photos'}
     </Text>
   </Pressable>

That's it! Compression happens automatically.
*/

