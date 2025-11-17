# Registration `is_pending` Analysis

## ✅ Summary

The `is_pending` value **IS being set correctly** during registration!

---

## 🔍 How It Works

### Registration Flow

```
User Registers
    ↓
RegisterScreen.tsx
    ↓
Determines if first user or joining existing
    ↓
Sets isPending = !isFirstUser
    ↓
authStore.supabase.ts
    ↓
Creates user in database with is_pending value
```

---

## 📝 Code Analysis

### 1. RegisterScreen.tsx (Lines 107-184)

#### Logic:
```typescript
let isFirstUser = false;
let userRole: UserRole = "worker";

if (formData.companySelection === "new") {
  // Create new company
  isFirstUser = true;
  userRole = "admin";
} else {
  // Join existing company
  isFirstUser = false;
  userRole = "worker";
}

// Register with isPending flag
const result = await register({
  name: formData.name,
  phone: formData.phone,
  companyId: companyId,
  position: isFirstUser ? "Company Administrator" : "Field Worker",
  email: formData.email || undefined,
  password: formData.password,
  role: userRole,
  isPending: !isFirstUser, // ✅ KEY LINE
});
```

#### Business Logic:
- **Create New Company**: `isPending = false` (admin, auto-approved)
- **Join Existing Company**: `isPending = true` (needs approval)

---

### 2. authStore.supabase.ts (Lines 206-276)

#### Auth Metadata (Line 206):
```typescript
{
  options: {
    data: {
      is_pending: data.isPending ?? false,
    }
  }
}
```

#### Database Insert (Lines 229-232):
```typescript
.insert({
  id: authData.user.id,
  name: data.name,
  phone: data.phone,
  email: data.email,
  role: data.role,
  position: data.position,
  company_id: data.companyId,
  is_pending: data.isPending ?? false, // ✅ Stored in DB
  approved_by: data.isPending ? null : authData.user.id,
  approved_at: data.isPending ? null : new Date().toISOString(),
});
```

#### Auto-Login Logic (Lines 261-274):
```typescript
if (!data.isPending) {
  // Auto-login approved users
  set({ 
    user: userData, 
    isAuthenticated: true, 
    isLoading: false 
  });
} else {
  // Don't auto-login pending users
  set({ 
    user: null, 
    isAuthenticated: false, 
    isLoading: false 
  });
}
```

---

## ✅ Verification

### Scenario 1: Create New Company
**User:** Admin Tristan  
**Action:** Create new company "Insite Tech"  
**Expected:**
- `isPending = false`
- `role = "admin"`
- `approved_by = user.id` (self-approved)
- `approved_at = NOW()`
- **Auto-login: YES**

**Code:**
```typescript
isFirstUser = true;
isPending: !isFirstUser // = false ✅
```

---

### Scenario 2: Join Existing Company
**User:** Herman  
**Action:** Join existing company "Insite Tech"  
**Expected:**
- `isPending = true`
- `role = "worker"`
- `approved_by = null`
- `approved_at = null`
- **Auto-login: NO**

**Code:**
```typescript
isFirstUser = false;
isPending: !isFirstUser // = true ✅
```

---

## 🐛 Why Herman Shows "Assign" Button

### Root Cause Analysis

The registration code is **CORRECT**, but Herman might be showing "Assign" instead of "Approve/Reject" for these reasons:

#### Possibility 1: Herman Was Created Before isPending Feature
- Herman was registered **before** the `isPending` feature was implemented
- His `is_pending` column is `NULL` or `false`
- The code checks: `const isPending = user.isPending || false;`
- If `is_pending` is `NULL` or `false`, he shows as approved

#### Possibility 2: Database Column Doesn't Exist
- The `is_pending` column wasn't added to the database yet
- Database returns `NULL` for `is_pending`
- Code treats `NULL` as `false`

#### Possibility 3: Herman Was Manually Approved
- Someone ran SQL to approve Herman
- `is_pending` was set to `false`

---

## 🔍 How to Verify

### Check Herman's Status in Database

```sql
SELECT 
  id,
  name,
  email,
  role,
  is_pending,
  approved_by,
  approved_at,
  created_at
FROM users
WHERE name = 'Herman';
```

### Expected Results

#### If Herman Registered After isPending Feature:
```
name: Herman
is_pending: true  ✅
approved_by: null
approved_at: null
```

#### If Herman Registered Before isPending Feature:
```
name: Herman
is_pending: false or NULL  ❌
approved_by: null or some_id
approved_at: null or some_date
```

---

## 🔧 Fix for Existing Users

### If Herman's `is_pending` is Wrong

```sql
-- Set Herman as pending
UPDATE users
SET 
  is_pending = true,
  approved_by = null,
  approved_at = null
WHERE name = 'Herman'
AND role != 'admin';

-- Verify
SELECT name, is_pending, approved_by, approved_at
FROM users
WHERE name = 'Herman';
```

---

## 📊 Registration Flow Diagram

```
┌─────────────────┐
│ User Registers  │
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
│  New   │      │Existing │
└───┬────┘      └────┬────┘
    │                │
    │ isFirstUser=true  isFirstUser=false
    │ role="admin"      role="worker"
    │                │
┌───▼────┐      ┌────▼────┐
│isPending│      │isPending│
│= false │      │= true   │
└───┬────┘      └────┬────┘
    │                │
┌───▼────┐      ┌────▼────┐
│ Auto   │      │ Needs   │
│ Login  │      │Approval │
└────────┘      └─────────┘
```

---

## 🧪 Test Cases

### Test 1: New Company Registration
```typescript
// Input
companySelection: "new"
newCompanyName: "Test Company"

// Expected
isFirstUser = true
isPending = false
role = "admin"
Auto-login = YES
```

### Test 2: Join Existing Company
```typescript
// Input
companySelection: "existing"
selectedCompanyId: "existing-company-id"

// Expected
isFirstUser = false
isPending = true
role = "worker"
Auto-login = NO
```

---

## ✅ Conclusion

### Registration Code: ✅ CORRECT

The registration code **correctly sets** `isPending`:
- ✅ New company creators: `isPending = false`
- ✅ Existing company joiners: `isPending = true`
- ✅ Stored in database: `is_pending` column
- ✅ Stored in auth metadata: `is_pending` field
- ✅ Auto-login logic: Respects `isPending` status

### Why Herman Shows "Assign"

Herman likely:
1. Was created **before** the `isPending` feature
2. Has `is_pending = false` or `NULL` in database
3. Needs manual database update to set `is_pending = true`

### Solution

Run the SQL script to fix existing users:

```sql
-- Fix Herman and other existing users
UPDATE users
SET is_pending = true
WHERE name IN ('Herman', 'Tristan')
AND role != 'admin'
AND (is_pending IS NULL OR is_pending = false);
```

---

## 📝 Future Registrations

All **new users** registering from now on will have the correct `isPending` value:
- ✅ First user of new company: `isPending = false`
- ✅ Users joining existing company: `isPending = true`

---

**Status:** ✅ Registration code is correct!  
**Action Required:** Update existing users in database  
**Last Updated:** November 16, 2025

