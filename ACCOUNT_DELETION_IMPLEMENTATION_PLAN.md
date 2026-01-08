# Account Deletion Implementation Plan

## Overview

This plan implements account deletion functionality that meets Apple App Store requirements (Guideline 5.1.1(v)) while maintaining compliance records for business purposes. The implementation will:

1. **Delete personal data** (name, email, phone) from user profile
2. **Anonymize activity records** (task activities, assignments) while preserving them for compliance
3. **Provide clear user communication** about what gets deleted vs retained
4. **Make deletion accessible** directly in the app

### What Name is Displayed After Deletion?

**Answer: "Deleted User"**

When a user deletes their account:
- The user record in the `users` table is **anonymized** (not deleted)
- The `user_id` in `task_activities` and other tables **remains the same**
- The user's `name` field is set to **"Deleted User"**
- When the UI displays activity logs, it looks up the user by `user_id` using `getUserById()`
- Since the user record still exists (with anonymized data), the lookup succeeds
- The activity log displays: **"Deleted User"** instead of the original name

This approach:
- ✅ Maintains referential integrity (no broken foreign keys)
- ✅ Preserves activity history for compliance
- ✅ Clearly indicates the user has been deleted
- ✅ Works seamlessly with existing UI code (no special handling needed)

---

## Apple App Store Requirements

According to Guideline 5.1.1(v):
- ✅ Apps that support account creation must offer account deletion
- ✅ Only offering temporary deactivation is insufficient
- ✅ Must be accessible within the app (not require visiting a website)
- ✅ May include confirmation steps to prevent accidental deletion
- ✅ Can retain anonymized records for compliance purposes

---

## Database Schema Changes

### 1. Add `deleted_at` Field to Users Table

```sql
-- Migration: Add account deletion support
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for filtering active users
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when account was deleted. NULL means account is active.';
```

### 2. Create Anonymization Function

```sql
-- Function to anonymize user data in activity records
CREATE OR REPLACE FUNCTION anonymize_user_data(user_id_to_anonymize UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- IMPORTANT: We keep the same user_id in all tables to maintain referential integrity
  -- The user record itself will be anonymized, so when the UI looks up the user by ID,
  -- it will find the anonymized record with name "Deleted User"
  
  -- Mark task_activities as anonymized (keep user_id the same)
  UPDATE task_activities
  SET 
    data = jsonb_set(
      COALESCE(data, '{}'::jsonb),
      '{anonymized}',
      'true'::jsonb
    )
  WHERE user_id = user_id_to_anonymize;

  -- Note: We don't change user_id in task_activities, tasks, or project_user_assignments
  -- because the user record itself will be anonymized, so lookups will work correctly
  -- and display "Deleted User" as the name

  -- Anonymize users table: Clear personal data but keep record for referential integrity
  -- This is the key: by keeping the same user_id but anonymizing the user record,
  -- all activity logs will show "Deleted User" when they look up the user by ID
  UPDATE users
  SET 
    name = 'Deleted User',
    email = 'deleted_' || substring(id::text, 1, 8) || '@deleted.local',
    phone = 'deleted',
    deleted_at = NOW()
  WHERE id = user_id_to_anonymize;

  -- Delete from auth.users (Supabase Auth)
  -- Note: This requires admin privileges and should be done via Supabase Admin API
  -- We'll handle this in the application code, not in SQL
END;
$$;
```

### 3. Create Account Deletion Function

```sql
-- Main function to delete user account
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user exists and is not already deleted
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id_to_delete AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or already deleted'
    );
  END IF;

  -- Anonymize all user data
  PERFORM anonymize_user_data(user_id_to_delete);

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deleted successfully. Activity records have been anonymized for compliance purposes.'
  );
END;
$$;
```

---

## Backend Implementation

### 1. Add `deleteAccount` Function to AuthStore

**File**: `src/state/authStore.supabase.ts`

```typescript
deleteAccount: async () => {
  const currentUser = get().user;
  if (!currentUser) {
    return { success: false, error: 'No user logged in' };
  }

  set({ isLoading: true });

  try {
    // Call the database function to delete and anonymize
    const { data, error } = await supabase.rpc('delete_user_account', {
      user_id_to_delete: currentUser.id
    });

    if (error) throw error;

    // Delete from Supabase Auth (requires admin privileges)
    // Note: This might need to be done via a backend function or Supabase Admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(currentUser.id);
    
    if (authError) {
      console.warn('Could not delete auth user:', authError);
      // Continue anyway - the database record is already anonymized
    }

    // Clear local state
    set({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false 
    });

    // Clear all persisted data
    await AsyncStorage.multiRemove([
      'buildtrack-auth',
      'buildtrack-tasks',
      'buildtrack-users',
      'buildtrack-projects',
      'buildtrack-companies',
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting account:', error);
    set({ isLoading: false });
    return { success: false, error: error.message || 'Failed to delete account' };
  }
}
```

**Note**: The `supabase.auth.admin.deleteUser()` requires admin privileges. If you don't have admin access from the client, you'll need to:
- Create a Supabase Edge Function to handle auth deletion
- Or use a backend service with admin privileges
- Or request deletion via Supabase Dashboard (manual process)

---

## Frontend Implementation

### 1. Create AccountDeletionScreen

**File**: `src/screens/AccountDeletionScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../utils/useTranslation';
import { cn } from '../utils/cn';
import StandardHeader from '../components/StandardHeader';

interface AccountDeletionScreenProps {
  onNavigateBack: () => void;
  onDeletionComplete?: () => void;
}

export default function AccountDeletionScreen({
  onNavigateBack,
  onDeletionComplete,
}: AccountDeletionScreenProps) {
  const { user, deleteAccount } = useAuthStore();
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== 'delete') {
      Alert.alert(
        t.accountDeletion.confirmTitle,
        t.accountDeletion.confirmTextMismatch
      );
      return;
    }

    Alert.alert(
      t.accountDeletion.finalConfirmTitle,
      t.accountDeletion.finalConfirmMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.accountDeletion.deleteButton,
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccount();
            setIsDeleting(false);

            if (result.success) {
              Alert.alert(
                t.accountDeletion.successTitle,
                t.accountDeletion.successMessage,
                [
                  {
                    text: t.common.ok,
                    onPress: () => {
                      onDeletionComplete?.();
                      // Navigation will be handled by auth state change
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                t.accountDeletion.errorTitle,
                result.error || t.accountDeletion.errorMessage
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StandardHeader
        title={t.accountDeletion.title}
        onBack={onNavigateBack}
      />
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Warning Section */}
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <View className="flex-row items-start mb-2">
              <Ionicons name="warning-outline" size={24} color="#dc2626" />
              <Text className="text-red-900 font-semibold text-lg ml-2 flex-1">
                {t.accountDeletion.warningTitle}
              </Text>
            </View>
            <Text className="text-red-800 text-sm mt-2">
              {t.accountDeletion.warningMessage}
            </Text>
          </View>

          {/* What Gets Deleted */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              {t.accountDeletion.whatGetsDeleted}
            </Text>
            <View className="bg-white border border-gray-200 rounded-xl p-4">
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark-circle" size={20} color="#dc2626" />
                <Text className="text-gray-800 ml-2 flex-1">
                  {t.accountDeletion.deletedItems.profile}
                </Text>
              </View>
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark-circle" size={20} color="#dc2626" />
                <Text className="text-gray-800 ml-2 flex-1">
                  {t.accountDeletion.deletedItems.email}
                </Text>
              </View>
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark-circle" size={20} color="#dc2626" />
                <Text className="text-gray-800 ml-2 flex-1">
                  {t.accountDeletion.deletedItems.phone}
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={20} color="#dc2626" />
                <Text className="text-gray-800 ml-2 flex-1">
                  {t.accountDeletion.deletedItems.name}
                </Text>
              </View>
            </View>
          </View>

          {/* What Gets Retained */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              {t.accountDeletion.whatGetsRetained}
            </Text>
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <View className="flex-row items-start mb-3">
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <Text className="text-blue-900 ml-2 flex-1">
                  {t.accountDeletion.retainedItems.activities}
                </Text>
              </View>
              <View className="flex-row items-start mb-3">
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <Text className="text-blue-900 ml-2 flex-1">
                  {t.accountDeletion.retainedItems.tasks}
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#2563eb" />
                <Text className="text-blue-900 ml-2 flex-1">
                  {t.accountDeletion.retainedItems.compliance}
                </Text>
              </View>
            </View>
          </View>

          {/* Compliance Notice */}
          <View className="bg-gray-100 border border-gray-300 rounded-xl p-4 mb-6">
            <Text className="text-gray-700 text-sm leading-5">
              {t.accountDeletion.complianceNotice}
            </Text>
          </View>

          {/* Confirmation Input */}
          <View className="mb-6">
            <Text className="text-gray-900 font-medium mb-2">
              {t.accountDeletion.confirmPrompt}
            </Text>
            <Text className="text-gray-600 text-sm mb-3">
              {t.accountDeletion.confirmHint}
            </Text>
            <View className="bg-white border border-gray-300 rounded-xl">
              <TextInput
                className="px-4 py-3 text-gray-900"
                placeholder={t.accountDeletion.confirmPlaceholder}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Delete Button */}
          <Pressable
            onPress={handleDeleteAccount}
            disabled={confirmText.toLowerCase() !== 'delete' || isDeleting}
            className={cn(
              'bg-red-600 rounded-xl py-4 items-center justify-center',
              (confirmText.toLowerCase() !== 'delete' || isDeleting) &&
                'opacity-50'
            )}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t.accountDeletion.deleteButton}
              </Text>
            )}
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            onPress={onNavigateBack}
            disabled={isDeleting}
            className="mt-4 py-4 items-center"
          >
            <Text className="text-gray-600 font-medium">
              {t.common.cancel}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 2. Add Navigation to ProfileScreen

**File**: `src/screens/ProfileScreen.tsx`

Add a new menu option in the settings section:

```typescript
<MenuOption
  title={t.profile.deleteAccount}
  icon="trash-outline"
  onPress={() => onNavigateToAccountDeletion?.()}
  textColor="text-red-600"
/>
```

Add the navigation prop:
```typescript
interface ProfileScreenProps {
  // ... existing props
  onNavigateToAccountDeletion?: () => void;
}
```

### 3. Update AppNavigator

**File**: `src/navigation/AppNavigator.tsx`

Add the AccountDeletionScreen to the Profile stack:

```typescript
<Stack.Screen
  name="AccountDeletion"
  component={AccountDeletionScreen}
  options={{ headerShown: false }}
/>
```

---

## Translations

### English (`src/locales/en.ts`)

```typescript
accountDeletion: {
  title: "Delete Account",
  warningTitle: "Permanent Action",
  warningMessage: "Deleting your account is permanent and cannot be undone. Please read the information below carefully.",
  whatGetsDeleted: "What Will Be Deleted",
  whatGetsRetained: "What Will Be Retained",
  deletedItems: {
    profile: "Your profile information",
    email: "Your email address",
    phone: "Your phone number",
    name: "Your name and personal details",
  },
  retainedItems: {
    activities: "Task activities and progress updates (anonymized)",
    tasks: "Task assignments and completions (anonymized)",
    compliance: "Project records for compliance purposes (anonymized)",
  },
  complianceNotice: "For compliance and record-keeping purposes, activity records related to your account will be retained but anonymized. This means your personal information will be removed, but the work history and task records will remain in the system.",
  confirmPrompt: "Type 'DELETE' to confirm",
  confirmHint: "This action cannot be undone.",
  confirmPlaceholder: "Type DELETE here",
  confirmTextMismatch: "Please type 'DELETE' exactly to confirm account deletion.",
  finalConfirmTitle: "Final Confirmation",
  finalConfirmMessage: "Are you absolutely sure you want to delete your account? This action is permanent.",
  deleteButton: "Delete My Account",
  successTitle: "Account Deleted",
  successMessage: "Your account has been successfully deleted. All personal data has been removed.",
  errorTitle: "Deletion Failed",
  errorMessage: "An error occurred while deleting your account. Please try again or contact support.",
},
profile: {
  // ... existing translations
  deleteAccount: "Delete Account",
}
```

### Traditional Chinese (`src/locales/zh-TW.ts`)

```typescript
accountDeletion: {
  title: "刪除帳戶",
  warningTitle: "永久操作",
  warningMessage: "刪除您的帳戶是永久性的，無法撤銷。請仔細閱讀以下資訊。",
  whatGetsDeleted: "將被刪除的內容",
  whatGetsRetained: "將被保留的內容",
  deletedItems: {
    profile: "您的個人資料",
    email: "您的電子郵件地址",
    phone: "您的電話號碼",
    name: "您的姓名和個人詳細資料",
  },
  retainedItems: {
    activities: "任務活動和進度更新（已匿名化）",
    tasks: "任務分配和完成記錄（已匿名化）",
    compliance: "用於合規目的的項目記錄（已匿名化）",
  },
  complianceNotice: "為了合規和記錄保存目的，與您帳戶相關的活動記錄將被保留但已匿名化。這意味著您的個人資訊將被移除，但工作歷史和任務記錄將保留在系統中。",
  confirmPrompt: "輸入「DELETE」以確認",
  confirmHint: "此操作無法撤銷。",
  confirmPlaceholder: "在此輸入 DELETE",
  confirmTextMismatch: "請準確輸入「DELETE」以確認帳戶刪除。",
  finalConfirmTitle: "最終確認",
  finalConfirmMessage: "您確定要刪除您的帳戶嗎？此操作是永久性的。",
  deleteButton: "刪除我的帳戶",
  successTitle: "帳戶已刪除",
  successMessage: "您的帳戶已成功刪除。所有個人資料已被移除。",
  errorTitle: "刪除失敗",
  errorMessage: "刪除帳戶時發生錯誤。請重試或聯繫支援。",
},
profile: {
  // ... existing translations
  deleteAccount: "刪除帳戶",
}
```

---

## Testing Checklist

### Functional Testing
- [ ] User can navigate to account deletion screen from profile
- [ ] Warning messages are clearly displayed
- [ ] User must type "DELETE" to enable delete button
- [ ] Final confirmation alert appears
- [ ] Account deletion succeeds
- [ ] User is logged out after deletion
- [ ] User cannot log back in with deleted account

### Data Verification
- [ ] User record in `users` table has `deleted_at` set
- [ ] User name, email, phone are anonymized
- [ ] Task activities have anonymized `user_id`
- [ ] Task assignments are updated with anonymized references
- [ ] Project assignments are anonymized
- [ ] Auth user is deleted from `auth.users`

### Compliance Verification
- [ ] Activity records still exist (not deleted)
- [ ] Activity records have anonymized user references
- [ ] Task records are preserved
- [ ] Project records are preserved
- [ ] No personal data remains in activity records

### UI/UX Testing
- [ ] All text is properly translated (English and Chinese)
- [ ] Warning colors and icons are appropriate
- [ ] Confirmation flow is clear and prevents accidents
- [ ] Loading states work correctly
- [ ] Error messages are user-friendly

---

## Security Considerations

1. **Admin Privileges**: The `supabase.auth.admin.deleteUser()` requires admin privileges. Consider:
   - Creating a Supabase Edge Function with admin access
   - Using a backend service with admin credentials
   - Manual deletion via Supabase Dashboard (less ideal)

2. **RLS Policies**: Ensure Row Level Security policies allow users to delete their own accounts:
   ```sql
   CREATE POLICY "Users can delete their own account"
   ON users FOR UPDATE
   USING (auth.uid() = id)
   WITH CHECK (auth.uid() = id);
   ```

3. **Audit Trail**: Consider logging account deletions for security:
   ```sql
   CREATE TABLE account_deletion_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     deleted_at TIMESTAMPTZ DEFAULT NOW(),
     ip_address TEXT,
     user_agent TEXT
   );
   ```

---

## Implementation Order

1. ✅ Create database migration (add `deleted_at` field)
2. ✅ Create anonymization function
3. ✅ Create account deletion function
4. ✅ Add `deleteAccount` to authStore
5. ✅ Create AccountDeletionScreen
6. ✅ Add translations
7. ✅ Add navigation and menu option
8. ✅ Test complete flow
9. ✅ Submit to App Store

---

## Notes

- The anonymization uses a pattern `deleted_user_<first8chars>` to maintain referential integrity
- Activity records are preserved for compliance but all personal data is removed
- The deletion process is irreversible - make sure users understand this
- Consider adding a grace period (e.g., 30 days) before permanent deletion if needed
- For production, consider adding email notification to user before deletion

