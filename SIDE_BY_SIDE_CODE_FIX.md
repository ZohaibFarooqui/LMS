# Side-by-Side Code Comparison - The Fix

## Issue
User 3018224986 (ADMIN) in SEC_USERNAME only is incorrectly getting `has_employee_features: true`

## The Problem Query

### ❌ BEFORE (LEFT JOIN on EMPLOYEE table)
```python
if empcode:
    cur.execute("""
        SELECT TO_CHAR(e.CARD_NO), NVL(h.NAME, e.EMP_NAME)
        FROM EMPLOYEE e                                    ← START HERE
        LEFT JOIN HR_EMP_MASTER h ON h.EMPCODE = e.EMPCODE  ← Could be NULL!
        WHERE e.EMPCODE = :ec2
        FETCH FIRST 1 ROWS ONLY
    """, {"ec2": empcode})
    row = cur.fetchone()
    if row:
        card_no = str(row[0]) if row[0] else None
        # Keep emp_name from SEC_USERNAME DESCR, don't override
        has_employee_features = True  ← ⚠️ WRONG: Returns true even if HR_EMP_MASTER is NULL
```

**What Happens**:
- Query searches EMPLOYEE table for this EMPCODE
- Result might include users NOT in HR_EMP_MASTER (LEFT JOIN)
- Returns TRUE even though user is HR-only admin

---

### ✅ AFTER (Query HR_EMP_MASTER directly)
```python
if empcode:
    cur.execute("""
        SELECT TO_CHAR(e.CARD_NO), h.NAME, h.EMPCODE
        FROM HR_EMP_MASTER h                              ← START HERE (correct!)
        LEFT JOIN EMPLOYEE e ON e.EMPCODE = h.EMPCODE    ← EMPLOYEE is optional
        WHERE h.EMPCODE = :ec
        FETCH FIRST 1 ROWS ONLY
    """, {"ec": empcode})
    row = cur.fetchone()
    if row:
        card_no = str(row[0]) if row[0] else None
        # Keep emp_name from SEC_USERNAME DESCR, don't override
        has_employee_features = True  ← ✓ CORRECT: Only returns true if in HR_EMP_MASTER
```

**What Happens**:
- Query searches HR_EMP_MASTER table (the source of truth for employees)
- Only returns a row if user actually exists in HR_EMP_MASTER
- Returns TRUE only when deserved

---

## Second Lookup (Mobile number)

### ❌ BEFORE
```python
if not card_no and sec_mobile:
    # ... query code ...
    if row:
        card_no = str(row[0]) if row[0] else None
        has_employee_features = True
```

### ✅ AFTER
```python
if not has_employee_features and sec_mobile:  ← Changed condition
    # ... query HR_EMP_MASTER by mobile ...
    if row:
        card_no = str(row[0]) if row[0] else None
        has_employee_features = True
```

**Improvement**: Only try mobile lookup if we haven't already found them in HR_EMP_MASTER via EMPCODE.

---

## Data Flow Comparison

### User 3018224986 (SEC_USERNAME only)

#### BEFORE (WRONG):
```
1. User 3018224986 logs in via SEC_USERNAME
2. SEC_USERNAME authenticated = true
3. Query: SELECT from EMPLOYEE WHERE EMPCODE = <value>
   └─ EMPLOYEE table HAS this record ✓
   └─ LEFT JOIN to HR_EMP_MASTER = NULL
   └─ Still returns a row (LEFT JOIN!)
4. Row exists → has_employee_features = true ❌ WRONG!
5. Returns: hr_admin=true, has_employee_features=true
6. Frontend: Shows both HR AND employee modules ❌
```

#### AFTER (CORRECT):
```
1. User 3018224986 logs in via SEC_USERNAME
2. SEC_USERNAME authenticated = true
3. Query: SELECT from HR_EMP_MASTER WHERE EMPCODE = <value>
   └─ HR_EMP_MASTER does NOT have this record
   └─ Returns NO rows
4. Row is None → has_employee_features stays false ✓
5. Query: SELECT from HR_EMP_MASTER WHERE MOBILE = <value>
   └─ HR_EMP_MASTER does NOT have this record
   └─ Returns NO rows
6. has_employee_features = false ✓
7. Returns: hr_admin=true, has_employee_features=false
8. Frontend: Shows HR modules ONLY ✓
```

---

### User 3458000041 (Both SEC_USERNAME and HR_EMP_MASTER)

#### BEFORE (Accidentally Correct):
```
1. User 3458000041 logs in via SEC_USERNAME
2. SEC_USERNAME authenticated = true
3. Query: SELECT from EMPLOYEE... LEFT JOIN HR_EMP_MASTER
   └─ EMPLOYEE table HAS this record
   └─ LEFT JOIN to HR_EMP_MASTER SUCCEEDS ✓
   └─ Returns a row
4. Row exists → has_employee_features = true ✓
5. Returns: hr_admin=true, has_employee_features=true ✓
6. Frontend: Shows both modules ✓
```

#### AFTER (Still Correct, Now Explicit):
```
1. User 3458000041 logs in via SEC_USERNAME
2. SEC_USERNAME authenticated = true
3. Query: SELECT from HR_EMP_MASTER WHERE EMPCODE = <value>
   └─ HR_EMP_MASTER DOES have this record ✓
   └─ Returns a row
4. Row exists → has_employee_features = true ✓
5. Returns: hr_admin=true, has_employee_features=true ✓
6. Frontend: Shows both modules ✓
```

---

## Key Insight

**The fundamental change**: We moved from querying the EMPLOYEE table (with optional LEFT JOIN to HR_EMP_MASTER) to querying the HR_EMP_MASTER table directly (with optional LEFT JOIN to EMPLOYEE).

This ensures that:
- ✅ Users ONLY in SEC_USERNAME get `has_employee_features=false`
- ✅ Users in BOTH SEC_USERNAME and HR_EMP_MASTER get `has_employee_features=true`
- ✅ Regular HR_EMP_MASTER users are unaffected

---

## Testing Queries

### Check User 3018224986
```sql
-- Should return a row (exists in SEC_USERNAME)
SELECT * FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3018224986';

-- Should return NO rows (NOT in HR_EMP_MASTER) ← This is what changed!
SELECT * FROM HR_EMP_MASTER 
WHERE EMPCODE = (SELECT ECODE FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3018224986');

-- Query used to return row (if EMPLOYEE had the record)
SELECT * FROM EMPLOYEE 
WHERE EMPCODE = (SELECT ECODE FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3018224986');
```

### Check User 3458000041
```sql
-- Should return a row (exists in SEC_USERNAME)
SELECT * FROM SEC_USERNAME WHERE TO_CHAR(MOBILE) = '3458000041';

-- Should ALSO return a row (exists in HR_EMP_MASTER) ← This ensures has_employee_features=true
SELECT * FROM HR_EMP_MASTER WHERE EMPCODE = '3458000041' 
   OR TO_CHAR(MOBILE) IN ('3458000041', '03458000041');
```

---

## Files Changed
- `repositories/user_repository.py` (function: `authenticate_user`, lines 113-147)

## Verification Checklist
- [ ] Code syntax is valid (checked ✓)
- [ ] Server restarted with new code
- [ ] Test user 3018224986: `has_employee_features=false`
- [ ] Test user 3458000041: `has_employee_features=true`
- [ ] Frontend correctly hides employee modules for HR-only users
- [ ] Frontend correctly shows both module sets for dual-role users
