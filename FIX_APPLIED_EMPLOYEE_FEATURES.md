# Fix Applied: SEC_USERNAME Employee Features Check

## Issue Identified

User **3018224986** (ADMIN) who exists ONLY in SEC_USERNAME table was incorrectly showing `has_employee_features: true`, which should be `false` since they don't exist in HR_EMP_MASTER.

## Root Cause

The original code was checking the **EMPLOYEE table** instead of **HR_EMP_MASTER** table:

### ❌ OLD CODE (WRONG):
```python
if empcode:
    cur.execute("""
        SELECT TO_CHAR(e.CARD_NO), NVL(h.NAME, e.EMP_NAME)
        FROM EMPLOYEE e
        LEFT JOIN HR_EMP_MASTER h ON h.EMPCODE = e.EMPCODE  ← LEFT JOIN
        WHERE e.EMPCODE = :ec2
    """)
    row = cur.fetchone()
    if row:
        has_employee_features = True  ← Sets TRUE even if HR_EMP_MASTER is NULL
```

**Problem**: This LEFT JOIN means it returns a row even if the user is NOT in HR_EMP_MASTER.

### ✅ NEW CODE (CORRECT):
```python
if empcode:
    cur.execute("""
        SELECT TO_CHAR(e.CARD_NO), h.NAME, h.EMPCODE
        FROM HR_EMP_MASTER h
        LEFT JOIN EMPLOYEE e ON e.EMPCODE = h.EMPCODE  ← Query from HR_EMP_MASTER first
        WHERE h.EMPCODE = :ec
    """)
    row = cur.fetchone()
    if row:
        has_employee_features = True  ← Only TRUE if user is in HR_EMP_MASTER
```

**Fix**: We now query from HR_EMP_MASTER as the primary table, so we only get a row if the user actually exists there.

---

## Expected Behavior After Fix

### User 3018224986 (ADMIN - SEC_USERNAME only)
```json
{
  "status": "SUCCESS",
  "card_no": "3018224986",
  "emp_name": "ADMIN",
  "hr_admin": true,
  "has_employee_features": false,         ← FIXED: Now FALSE ✓
  "allowed_companies": ["1", "2"],
  "allowed_branches": ["10", "20"],
  "company_list": [...],
  "branch_list": [...]
}
```

**What Frontend Should Do**:
- ✅ Show HR modules (HRMS, Recruitment, etc.)
- ❌ HIDE employee modules (Dashboard, Apply Leave, Attendance, Profile)

---

### User 3458000041 (SEC_USERNAME + HR_EMP_MASTER)
```json
{
  "status": "SUCCESS",
  "card_no": "100001.1",
  "emp_name": "<Name from SEC_USERNAME DESCR or HR_EMP_MASTER NAME>",
  "hr_admin": true,
  "has_employee_features": true,         ← TRUE (exists in HR_EMP_MASTER) ✓
  "allowed_companies": ["1"],
  "allowed_branches": ["10"],
  "company_list": [...],
  "branch_list": [...]
}
```

**What Frontend Should Do**:
- ✅ Show HR modules (HRMS, Recruitment, etc.)
- ✅ Show employee modules (Dashboard, Apply Leave, Attendance, Profile)
- ✅ Show company/branch management tools

---

## How to Test

### Test Case 1: User 3018224986 (HR-only)
**Verify Database**:
```sql
-- Should return a row
SELECT USRID, DESCR, MOBILE, ECODE FROM SEC_USERNAME 
WHERE TO_CHAR(MOBILE) = '3018224986';

-- Should return NO rows (this is the key check!)
SELECT * FROM HR_EMP_MASTER 
WHERE EMPCODE = (SELECT ECODE FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3018224986');
```

**Expected Login Response**:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "3018224986", "password": "<password>"}'
```

Should return:
- `hr_admin: true`
- `has_employee_features: false` ← **CRITICAL**
- `allowed_companies: [...]` (from SEC_USERCMPN)
- `allowed_branches: [...]` (from SEC_USERBRCH)

---

### Test Case 2: User 3458000041 (Both HR admin and Employee)
**Verify Database**:
```sql
-- Should return a row
SELECT USRID, DESCR, MOBILE, ECODE FROM SEC_USERNAME 
WHERE TO_CHAR(MOBILE) = '3458000041' OR ECODE = '3458000041';

-- Should ALSO return a row (this user is an employee too!)
SELECT * FROM HR_EMP_MASTER 
WHERE EMPCODE = '3458000041' OR TO_CHAR(MOBILE) LIKE '%3458000041%';
```

**Expected Login Response**:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "3458000041", "password": "<password>"}'
```

Should return:
- `hr_admin: true`
- `has_employee_features: true` ← **CRITICAL**
- `allowed_companies: [...]` (from SEC_USERCMPN)
- `allowed_branches: [...]` (from SEC_USERBRCH)

---

## Frontend Implementation

The frontend MUST check the `has_employee_features` flag to hide/show employee modules:

```typescript
// After login, check has_employee_features
if (loginResponse.has_employee_features) {
  // Show employee modules
  showEmployeeMenu();
} else {
  // Hide employee modules for HR-only users
  hideEmployeeMenu();
}

// Employee modules that should be conditional:
// - Dashboard
// - Apply Leave
// - Leave Status
// - Attendance
// - Profile

// HR modules that should always show for hr_admin=true:
// - HRMS
// - Recruitment
// - (any other HR management modules)
```

---

## Code Changes Summary

**File**: `repositories/user_repository.py`
**Function**: `authenticate_user()`
**Section**: SEC_USERNAME authentication (lines 113-147)

### What Changed:
1. Changed first HR_EMP_MASTER check from querying EMPLOYEE to querying HR_EMP_MASTER directly
2. Changed condition from `if not card_no and sec_mobile:` to `if not has_employee_features and sec_mobile:`
   - This ensures we try both EMPCODE and MOBILE before concluding user is not in HR_EMP_MASTER

### Line-by-line comparison:

| OLD | NEW | Reason |
|-----|-----|--------|
| `FROM EMPLOYEE e LEFT JOIN HR_EMP_MASTER h` | `FROM HR_EMP_MASTER h LEFT JOIN EMPLOYEE e` | Query HR_EMP_MASTER primarily |
| `WHERE e.EMPCODE = :ec2` | `WHERE h.EMPCODE = :ec` | Check against HR_EMP_MASTER EMPCODE |
| `if not card_no and sec_mobile:` | `if not has_employee_features and sec_mobile:` | Try mobile lookup only if not found in HR_EMP_MASTER |

---

## Testing Script

Run the automated test:
```bash
cd c:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Backend
python test_specific_users.py
```

Update the passwords in `test_specific_users.py` with actual credentials before running.

---

## Troubleshooting

### Issue: User 3018224986 still shows has_employee_features=true after server restart

**Debug Steps**:
1. Check server logs for: `[AUTH] SEC_USERNAME login: usrid=...`
2. Verify the code change was applied: `grep "FROM HR_EMP_MASTER h" repositories/user_repository.py`
3. Restart the server explicitly
4. Check database: Is user 3018224986 actually in HR_EMP_MASTER?

```sql
SELECT * FROM HR_EMP_MASTER WHERE EMPCODE = (
  SELECT ECODE FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3018224986'
);
```

---

## Summary

| User | Table Location | Expected Response |
|------|---|---|
| 3018224986 | SEC_USERNAME only | `hr_admin=true`, `has_employee_features=false` ← **KEY FIX** |
| 3458000041 | SEC_USERNAME + HR_EMP_MASTER | `hr_admin=true`, `has_employee_features=true` |
| Regular Employee | HR_EMP_MASTER only | `hr_admin=false`, `has_employee_features=true` |
