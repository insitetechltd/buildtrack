# User Approval Workflow

## 📋 Complete Workflow Overview

### 🔄 Step-by-Step Process

#### 1️⃣ **New User Registration**

**Location:** `RegisterScreen.tsx`

**Process:**
1. User fills out registration form (name, email, phone, password, position)
2. User selects company:
   - **Option A: Join Existing Company**
     - Taps "Join Existing" button
     - Company selection modal appears
     - Selects company from list
     - User is created with `isPending: true`
     - Cannot log in until approved
   - **Option B: Create New Company**
     - Taps "Create New" button
     - Enters new company name
     - User is created with `isPending: false`
     - Automatically becomes company admin
     - Can log in immediately

**Success Messages:**
- **Join Existing:** "Registration submitted! Your account is pending approval from your company administrator."
- **Create New:** "Registration successful! You can now log in."

---

#### 2️⃣ **Pending User Tries to Log In**

**Location:** `LoginScreen.tsx`

**Process:**
1. Pending user enters credentials
2. Login attempt is made
3. Auth store checks `userData.is_pending`
4. If `true`, throws `PENDING_APPROVAL` error
5. User sees alert: "Your account is pending approval from your company administrator. Please wait for approval before logging in."

**Code Reference:**
```typescript
// In authStore.supabase.ts
if (userData.is_pending) {
  throw new Error('PENDING_APPROVAL');
}
```

---

#### 3️⃣ **Admin Reviews Pending Users**

**Location:** `PendingUsersScreen.tsx`

**Access Path:**
1. Admin logs in
2. Opens Profile screen (tap profile icon)
3. Sees "Pending Approvals" with red badge showing count
4. Taps "Pending Approvals"
5. Opens `PendingUsersScreen`

**Screen Features:**
- ✅ List of all pending users for admin's company
- ✅ User details displayed:
  - Name
  - Email
  - Phone
  - Position
- ✅ Two action buttons per user:
  - **Approve** (green button)
  - **Reject** (red button)
- ✅ Pull-to-refresh functionality
- ✅ Empty state when no pending users

**Approval Actions:**

**Approve:**
```typescript
// Updates user record:
is_pending = false
approved_by = admin_user_id
approved_at = current_timestamp
```

**Reject:**
```typescript
// Deletes user from:
1. auth.users table
2. users table
```

---

#### 4️⃣ **Approved User Can Now Log In**

**Process:**
1. Admin approves user
2. User's `is_pending` set to `false`
3. User can now successfully log in
4. User has full access to the app

---

## 🗂️ File Structure

### Core Files

#### Authentication
- **`src/state/authStore.supabase.ts`**
  - Handles registration with `isPending` parameter
  - Blocks login for pending users
  - Throws `PENDING_APPROVAL` error

#### User Management
- **`src/state/userStore.supabase.ts`**
  - `getPendingUsersByCompany()` - Get pending users
  - `approveUser()` - Approve pending user
  - `rejectUser()` - Delete rejected user

#### Screens
- **`src/screens/RegisterScreen.tsx`**
  - Company selection UI
  - Creates users with appropriate pending status
  
- **`src/screens/LoginScreen.tsx`**
  - Catches `PENDING_APPROVAL` error
  - Shows appropriate message to pending users
  
- **`src/screens/PendingUsersScreen.tsx`**
  - Lists pending users
  - Approve/Reject actions
  
- **`src/screens/ProfileScreen.tsx`**
  - Shows "Pending Approvals" menu item (admin only)
  - Displays badge with pending count

#### Navigation
- **`src/navigation/AppNavigator.tsx`**
  - Routes to `PendingUsersScreen`
  - Integrated into Profile stack

---

## 🎯 Navigation Path

### For Admins

```
Profile Screen
  └─ Pending Approvals (with badge) 🔴 2
      └─ PendingUsersScreen
          ├─ User 1 [Approve] [Reject]
          └─ User 2 [Approve] [Reject]
```

### Alternative Access Points (Future Enhancement)

Could also add:
1. **Dashboard Widget** - Show pending count on admin dashboard
2. **Notification Badge** - App-wide notification for pending users
3. **Direct Link** - From User Management screen

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL, -- 'admin', 'manager', 'worker'
  company_id UUID REFERENCES companies(id),
  is_pending BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Migration

```sql
-- Add approval columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Set all existing users as approved
UPDATE users 
SET 
  is_pending = false,
  approved_at = created_at
WHERE is_pending IS NULL OR is_pending = true;
```

---

## 🔐 Security & Permissions

### Role-Based Access

| Feature | Admin | Manager | Worker |
|---------|-------|---------|--------|
| View Pending Users | ✅ | ❌ | ❌ |
| Approve Users | ✅ | ❌ | ❌ |
| Reject Users | ✅ | ❌ | ❌ |
| See Badge Count | ✅ | ❌ | ❌ |

### Business Rules

1. **First user of new company** → Automatically admin, not pending
2. **Subsequent users** → Pending status, requires approval
3. **Pending users** → Cannot log in until approved
4. **Rejected users** → Completely removed from system
5. **Approved users** → Full access based on role

---

## 🎨 UI Components

### Profile Menu - Pending Approvals

```tsx
{user.role === 'admin' && (
  <MenuOption
    title="Pending Approvals"
    icon="people-outline"
    onPress={() => onNavigateToPendingUsers?.()}
    badge={pendingCount}  // Red badge with count
  />
)}
```

### Badge Display
- **Red circular badge** with white text
- Shows count (1-99)
- Shows "99+" for counts over 99
- Only visible when count > 0

---

## 🧪 Testing Checklist

### Registration Flow
- [ ] New company creation → User is admin, not pending
- [ ] Join existing company → User is pending
- [ ] Success messages display correctly
- [ ] User data saved to database

### Login Flow
- [ ] Pending user cannot log in
- [ ] Appropriate error message shown
- [ ] Approved user can log in
- [ ] Admin can always log in

### Approval Flow
- [ ] Admin sees pending users list
- [ ] Badge count is accurate
- [ ] Approve button works
- [ ] Reject button works
- [ ] List updates after action
- [ ] Pull-to-refresh works

### Navigation
- [ ] Profile → Pending Approvals works
- [ ] Back navigation works
- [ ] Badge updates in real-time

---

## 🐛 Troubleshooting

### Issue: Pending users not showing

**Cause:** `is_pending` column doesn't exist in database

**Solution:** Run the migration SQL:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

### Issue: All users can log in (including pending)

**Cause:** Login check not implemented or database not updated

**Solution:** 
1. Verify `authStore.supabase.ts` has pending check
2. Run database migration
3. Restart app

### Issue: Badge count not updating

**Cause:** User store not refreshing

**Solution:**
1. Pull-to-refresh on Profile screen
2. Check `getPendingUsersByCompany()` implementation
3. Verify company_id matching

---

## 📊 User States Diagram

```
┌─────────────────┐
│  Registration   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Company? │
    └────┬─────┘
         │
    ┌────┴────────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│ Create │      │  Join   │
│  New   │      │ Existing│
└───┬────┘      └────┬────┘
    │                │
┌───▼────┐      ┌────▼────┐
│ Admin  │      │ Pending │
│ Active │      │ Blocked │
└───┬────┘      └────┬────┘
    │                │
    │           ┌────▼────┐
    │           │ Admin   │
    │           │ Reviews │
    │           └────┬────┘
    │                │
    │           ┌────┴────┐
    │           │         │
    │      ┌────▼───┐ ┌──▼────┐
    │      │Approve │ │Reject │
    │      └────┬───┘ └──┬────┘
    │           │        │
    │      ┌────▼───┐ ┌──▼────┐
    │      │ Active │ │Deleted│
    │      └────┬───┘ └───────┘
    │           │
    └───────────┴─────────────►
            │
       ┌────▼────┐
       │ Can Use │
       │   App   │
       └─────────┘
```

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Email Notifications**
   - Notify admin when new user registers
   - Notify user when approved/rejected

2. **Bulk Actions**
   - Approve multiple users at once
   - Reject multiple users at once

3. **User Details Modal**
   - View more user information before approving
   - See registration timestamp
   - View company details

4. **Approval Notes**
   - Admin can add notes when approving/rejecting
   - Track rejection reasons

5. **Dashboard Widget**
   - Show pending count on admin dashboard
   - Quick access to pending users

6. **Search & Filter**
   - Search pending users by name/email
   - Filter by registration date
   - Sort by various criteria

---

## 📝 Summary

The user approval workflow provides a secure, multi-tenant signup system where:

1. ✅ First users of new companies become admins automatically
2. ✅ Subsequent users require admin approval
3. ✅ Pending users cannot log in
4. ✅ Admins have a dedicated screen to manage approvals
5. ✅ Badge notifications keep admins informed
6. ✅ Simple approve/reject actions
7. ✅ Clean, intuitive UI

**Key Files:**
- `PendingUsersScreen.tsx` - Main approval interface
- `authStore.supabase.ts` - Authentication logic
- `userStore.supabase.ts` - User management
- `ProfileScreen.tsx` - Navigation entry point

**Database:**
- `users.is_pending` - Pending status flag
- `users.approved_by` - Who approved
- `users.approved_at` - When approved

