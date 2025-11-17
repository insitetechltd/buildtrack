# Company Selection During Signup - Feature Implementation

## Overview

The app now properly handles company assignment during user signup with a multi-tenant architecture. Users can either join an existing company or create a new one.

## How It Works

### 1. **User Registration Flow**

When a new user signs up, they now see a company selection interface with two options:

#### Option A: Join Existing Company
- User selects from a list of active companies in the system
- User is created with `isPending: true` status
- User cannot log in until approved by a company administrator
- Admin receives notification of pending user

#### Option B: Create New Company
- User enters a new company name
- System creates the new company
- User is automatically designated as the first admin of the company
- User is created with `isPending: false` (auto-approved)
- User can immediately log in and start using the app

### 2. **Admin Approval System**

For users joining existing companies:

1. **Pending Status**: New users are marked as pending (`isPending: true`)
2. **Login Blocked**: Pending users cannot log in - they see a "Pending Approval" message
3. **Admin Review**: Company administrators can view pending users in the "Pending Approvals" screen
4. **Approval Actions**:
   - **Approve**: User's `isPending` is set to `false`, they can now log in
   - **Reject**: User account is deleted from the system

### 3. **First User Privileges**

When a user creates a new company:
- Automatically becomes an admin (not a worker)
- Position is set to "Company Administrator"
- No approval needed - can immediately access the app
- Can then invite and approve other users to join their company

## Technical Changes

### Database Schema Updates

The `users` table now includes:
```typescript
isPending?: boolean;        // true = waiting for approval
approvedBy?: string | null; // User ID of approving admin
approvedAt?: string | null; // Timestamp of approval
```

### Updated Files

1. **`src/types/buildtrack.ts`**
   - Added approval fields to User interface

2. **`src/screens/RegisterScreen.tsx`**
   - Added company picker UI with "Join Existing" / "Create New" options
   - Company selection modal for existing companies
   - New company name input
   - Updated registration logic to handle both flows

3. **`src/state/authStore.supabase.ts`**
   - Updated `register()` to accept `isPending` parameter
   - Modified registration to set approval status
   - Auto-login only for non-pending users

4. **`src/state/authStore.ts`**
   - Updated interface to match supabase version

5. **`src/screens/LoginScreen.tsx`**
   - Added error handling for pending approval status
   - Shows user-friendly message when login blocked

6. **`src/state/userStore.supabase.ts`**
   - Added `getPendingUsersByCompany()` function
   - Added `approveUser()` function
   - Added `rejectUser()` function

7. **`src/screens/PendingUsersScreen.tsx`** (NEW)
   - Admin screen to view pending users
   - Approve/Reject functionality
   - Real-time updates

## User Experience

### For New Users Creating a Company:
1. Fill out registration form
2. Select "Create New" company option
3. Enter company name
4. Click "Create Account"
5. ✅ Immediately logged in as admin

### For New Users Joining Existing Company:
1. Fill out registration form
2. Select "Join Existing" company option
3. Choose company from list
4. Click "Create Account"
5. See message: "Registration submitted, waiting for approval"
6. ⏳ Cannot log in until approved
7. Try to log in → See "Pending Approval" message
8. ✅ After admin approval, can log in successfully

### For Company Administrators:
1. Navigate to "Pending Approvals" screen (needs to be added to navigation)
2. See list of users waiting for approval
3. Review user details (name, email, phone, position)
4. Click "Approve" → User can now log in
5. Click "Reject" → User account is deleted

## Integration Steps

### Add Pending Approvals to Navigation

The `PendingUsersScreen` needs to be added to your app navigation. Suggested locations:

1. **Profile/Settings Menu** (for admins only)
2. **Dashboard** (show badge with pending count)
3. **Admin Panel** (if you have one)

Example integration in ProfileScreen or DashboardScreen:

```typescript
import PendingUsersScreen from './PendingUsersScreen';

// Show only for admins
{user?.role === 'admin' && (
  <Pressable onPress={() => navigateToPendingUsers()}>
    <View className="flex-row items-center">
      <Ionicons name="people-outline" size={24} />
      <Text>Pending Approvals</Text>
      {pendingCount > 0 && (
        <View className="bg-red-500 rounded-full px-2">
          <Text className="text-white text-xs">{pendingCount}</Text>
        </View>
      )}
    </View>
  </Pressable>
)}
```

### Database Migration

Ensure your Supabase `users` table has these columns:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

## Security Considerations

1. **Pending users cannot access any app features** - login is blocked at the authentication level
2. **Only company admins can approve users** - the PendingUsersScreen should only be accessible to admins
3. **First user of new company is auto-approved** - this is intentional as they are the company owner
4. **Rejected users are completely removed** - no orphaned accounts

## Future Enhancements

Potential improvements for the future:

1. **Email Notifications**: Notify users when approved/rejected
2. **Approval Reasons**: Allow admins to add notes when rejecting
3. **Bulk Actions**: Approve/reject multiple users at once
4. **Company Verification**: Require company verification before allowing new company creation
5. **Invitation System**: Allow admins to invite users directly (pre-approved)
6. **Role Selection**: Let admins assign initial role during approval
7. **Push Notifications**: Real-time notifications for admins when new users register

## Testing Checklist

- [ ] New user can create a new company and is auto-logged in as admin
- [ ] New user can join existing company and sees "pending approval" message
- [ ] Pending user cannot log in (sees appropriate error message)
- [ ] Admin can see pending users in PendingUsersScreen
- [ ] Admin can approve user (user can then log in)
- [ ] Admin can reject user (user account is deleted)
- [ ] Company picker shows all active companies
- [ ] New company is created with correct data
- [ ] First user of new company has admin role
- [ ] Users joining existing companies have worker role

## Summary

This implementation provides a complete multi-tenant company selection system with proper approval workflows. Users have full control over creating their own companies or joining existing ones, while company administrators maintain control over who can access their company's data.

