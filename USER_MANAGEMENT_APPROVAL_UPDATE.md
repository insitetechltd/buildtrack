# User Management Screen - Approval Integration

## 🎯 Overview

Updated the **User Management Screen** to show **Approve/Reject buttons** for pending users instead of the Assign button. Once a user is approved, the Assign button appears and they can be assigned to projects.

---

## ✨ What Changed

### Before
- All users showed an "Assign" button
- No visual indication of pending status
- Admins had to go to a separate screen to approve users

### After
- **Pending users** show **Approve** and **Reject** buttons
- **Approved users** show the **Assign** button
- **Pending badge** displayed on user card
- **Status message** shown for pending users
- **Confirmation modals** for approve/reject actions

---

## 🎨 UI Changes

### User Card Layout

#### Pending User
```
┌─────────────────────────────────────┐
│ Tristan  ⏱️ Pending                 │
│ tristan@insitetech.co               │
│ 👤 Worker • Field Worker            │
│                                     │
│          [✅ Approve]  [❌ Reject]   │
│                                     │
│ ⏱️ Awaiting approval - cannot be    │
│    assigned to projects yet         │
└─────────────────────────────────────┘
```

#### Approved User
```
┌─────────────────────────────────────┐
│ Admin Tristan ⭐ ADMIN              │
│ admin_tristan@insitetech.com        │
│ 👤 Admin • System Administrator     │
│                                     │
│                      [Assign]       │
│                                     │
│ Project Assignments (1)             │
│ ┌─────────────────────────────────┐ │
│ │ Test Project                    │ │
│ │ Worker                       ❌ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔄 Workflow

### 1. Pending User Appears
- User registers and joins existing company
- User appears in User Management with **Pending** badge
- Shows **Approve** and **Reject** buttons
- Shows message: "Awaiting approval - cannot be assigned to projects yet"

### 2. Admin Approves User
1. Admin clicks **Approve** button
2. Confirmation modal appears:
   ```
   ✅ Approve User
   
   Approve Tristan to join your company?
   They will be able to log in and access the app.
   
   [Cancel]  [Approve]
   ```
3. Admin confirms
4. User is approved in database
5. Success message: "Tristan has been approved and can now log in."
6. User card updates to show **Assign** button

### 3. Admin Rejects User
1. Admin clicks **Reject** button
2. Confirmation modal appears:
   ```
   ❌ Reject User
   
   Reject Tristan? This will permanently delete
   their account from the system.
   
   [Cancel]  [Reject]
   ```
3. Admin confirms
4. User is deleted from database
5. Success message: "Tristan has been rejected and removed from the system."
6. User card disappears from list

---

## 🛠️ Technical Implementation

### File Modified
- **`src/screens/UserManagementScreen.tsx`**

### New State Variables
```typescript
const [pendingUserData, setPendingUserData] = useState<User | null>(null);
const [activeModal, setActiveModal] = useState<
  'assign' | 'project' | 'category' | 'success' | 
  'removeConfirm' | 'invite' | 'approveConfirm' | 'rejectConfirm' | null
>(null);
```

### New Functions
```typescript
// Handler functions
const handleApproveUser = (user: User) => { ... }
const handleRejectUser = (user: User) => { ... }

// Confirmation functions
const confirmApproveUser = async () => { ... }
const confirmRejectUser = async () => { ... }
```

### UserCard Component Updates
```typescript
const isPending = user.isPending || false;

// Conditional button rendering
{isPending ? (
  <View className="flex-row gap-2">
    <Pressable onPress={() => handleApproveUser(user)}>
      <Text>Approve</Text>
    </Pressable>
    <Pressable onPress={() => handleRejectUser(user)}>
      <Text>Reject</Text>
    </Pressable>
  </View>
) : (
  <Pressable onPress={() => setSelectedUser(user)}>
    <Text>Assign</Text>
  </Pressable>
)}
```

### New Modals
1. **Approve Confirmation Modal** - Green checkmark icon
2. **Reject Confirmation Modal** - Red X icon

---

## 🎯 Features

### Visual Indicators
- ✅ **Pending Badge** - Orange badge with clock icon
- ✅ **Admin Badge** - Purple badge with star icon
- ✅ **Status Message** - Orange info box for pending users

### Button States
- ✅ **Approve Button** - Green background
- ✅ **Reject Button** - Red background
- ✅ **Assign Button** - Blue background (only for approved users)

### Confirmation Modals
- ✅ **Clear messaging** - Explains what will happen
- ✅ **Cancel option** - Easy to back out
- ✅ **Visual feedback** - Icons and colors indicate action type

### Project Assignments
- ✅ **Hidden for pending users** - Can't assign until approved
- ✅ **Visible for approved users** - Shows all assignments
- ✅ **Status message** - Explains why pending users can't be assigned

---

## 🔐 Security & Validation

### Permission Checks
- Only admins can access User Management screen
- Only admins can approve/reject users
- Pending users cannot log in

### Error Handling
```typescript
try {
  await approveUser(pendingUserData.id, currentUser.id);
  // Success handling
} catch (error) {
  console.error('Error approving user:', error);
  alert('Failed to approve user. Please try again.');
}
```

### Data Mutations
```typescript
// Notify all users about changes
notifyDataMutation('user');
```

---

## 📊 User States

```
┌─────────────┐
│ Registration│
└──────┬──────┘
       │
   ┌───▼────┐
   │ Pending│ ← Shows Approve/Reject buttons
   └───┬────┘
       │
  ┌────┴─────┐
  │          │
┌─▼──┐   ┌──▼───┐
│Appr│   │Reject│
│ove │   │      │
└─┬──┘   └──┬───┘
  │         │
┌─▼──┐   ┌──▼────┐
│Act-│   │Deleted│
│ive │   │       │
└─┬──┘   └───────┘
  │
  │ Shows Assign button
  │ Can be assigned to projects
  │
```

---

## 🧪 Testing Checklist

### Pending User Display
- [ ] Pending badge shows correctly
- [ ] Approve and Reject buttons appear
- [ ] Assign button is hidden
- [ ] Status message displays
- [ ] Project assignments section is hidden

### Approve Flow
- [ ] Approve button opens confirmation modal
- [ ] Modal shows correct user name
- [ ] Cancel button closes modal
- [ ] Approve button triggers approval
- [ ] Success message displays
- [ ] User card updates to show Assign button
- [ ] Pending badge disappears
- [ ] Project assignments section appears

### Reject Flow
- [ ] Reject button opens confirmation modal
- [ ] Modal shows correct user name
- [ ] Cancel button closes modal
- [ ] Reject button triggers deletion
- [ ] Success message displays
- [ ] User card disappears from list

### Approved User Display
- [ ] Assign button shows
- [ ] Approve/Reject buttons hidden
- [ ] Pending badge hidden
- [ ] Project assignments visible
- [ ] Can assign to projects

---

## 🎨 Color Scheme

### Badges
- **Pending**: Orange (`bg-orange-100`, `text-orange-700`)
- **Admin**: Purple (`bg-purple-100`, `text-purple-700`)
- **Protected**: Amber (`bg-amber-100`, `text-amber-700`)

### Buttons
- **Approve**: Green (`bg-green-600`)
- **Reject**: Red (`bg-red-600`)
- **Assign**: Blue (`bg-blue-600`)

### Status Messages
- **Pending**: Orange (`bg-orange-50`, `border-orange-200`)
- **No Projects**: Yellow (`bg-yellow-50`, `border-yellow-200`)

---

## 📝 Database Requirements

### Required Column
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;
```

### Check User Status
```sql
SELECT 
  id,
  name,
  email,
  is_pending,
  approved_at
FROM users
WHERE company_id = 'your-company-id';
```

---

## 🔄 Integration Points

### User Store Functions Used
- `approveUser(userId, approverId)` - Approve pending user
- `rejectUser(userId)` - Delete rejected user
- `getUsersByCompany(companyId)` - Get all company users

### Data Refresh
- Triggers `notifyDataMutation('user')` after approve/reject
- Refreshes user list across all screens
- Updates real-time for all admins

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Bulk Actions** - Approve/reject multiple users at once
2. **User Details Modal** - View more info before approving
3. **Approval Notes** - Add reason for rejection
4. **Email Notifications** - Notify users of approval/rejection
5. **Approval History** - Track who approved whom and when
6. **Pending Count Badge** - Show count in navigation

---

## 📚 Related Documentation

- **`USER_APPROVAL_WORKFLOW.md`** - Complete approval workflow
- **`TRISTAN_USER_VISIBILITY_FIX.md`** - Database setup for approval system
- **`COMPANY_SELECTION_FEATURE.md`** - Company selection during registration

---

## ✅ Summary

The User Management screen now provides a seamless approval workflow:

1. ✅ **Visual distinction** between pending and approved users
2. ✅ **Contextual actions** - Approve/Reject for pending, Assign for approved
3. ✅ **Clear messaging** - Users understand what each action does
4. ✅ **Confirmation dialogs** - Prevent accidental actions
5. ✅ **Real-time updates** - Changes reflect immediately
6. ✅ **Proper permissions** - Only admins can approve/reject

**Status:** ✅ Complete and ready to use!  
**Last Updated:** November 16, 2025

