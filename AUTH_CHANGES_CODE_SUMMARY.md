# Authentication Changes - Code Summary

## Files Modified

1. **models/auth_models.py** - Added new field to LoginResponse
2. **repositories/user_repository.py** - Updated authenticate_user logic
3. **routers/auth_router.py** - Updated LoginResponse initialization

---

## Code Changes

### 1. LoginResponse Model
**File**: `models/auth_models.py`

Added new field:
```python
has_employee_features: bool  # True if user can access employee modules
```

This field indicates whether a user has access to employee features (dashboard, leaves, attendance, etc.).

---

### 2. Authentication Logic Updates
**File**: `repositories/user_repository.py`

#### SEC_USERNAME Authentication (Lines ~113-176):
```python
if sec_authenticated:
    # SEC_USERNAME user - HR Admin with access to company/branch management
    usrid_str = str(usrid)
    emp_name = str(descr or "").strip()  # Use DESCR from SEC_USERNAME
    empcode = str(ecode or "").strip()
    card_no = None
    has_employee_features = False  # Will be set to True only if in HR_EMP_MASTER

    # Try to find card_no and check if user is in HR_EMP_MASTER
    if empcode:
        # Query EMPLOYEE table
        if row:
            card_no = str(row[0]) if row[0] else None
            has_employee_features = True  # ← User is in HR_EMP_MASTER

    # Get company and branch access rights
    cur.execute("""
        SELECT sc.COMPC, NVL(ci.DESCR, TO_CHAR(sc.COMPC))
        FROM SEC_USERCMPN sc
        ...
    """)
    
    # Return with hr_admin='Y'
    return {
        "card_no": card_no or username,
        "emp_name": emp_name,           # ← From SEC_USERNAME DESCR
        "hr_admin": "Y",                # ← ALWAYS 'Y' for SEC_USERNAME
        "has_employee_features": has_employee_features,  # ← Only if in HR_EMP_MASTER
        "allowed_companies": companies,   # ← From SEC_USERCMPN
        "allowed_branches": branches,     # ← From SEC_USERBRCH
        ...
    }
```

**Key Changes**:
- ✅ emp_name comes from SEC_USERNAME.DESCR (not overridden)
- ✅ hr_admin is ALWAYS 'Y' for SEC_USERNAME users
- ✅ company/branch rights always fetched from SEC_USERCMPN/SEC_USERBRCH
- ✅ has_employee_features set based on whether user exists in HR_EMP_MASTER

#### HR_EMP_MASTER Authentication (Lines ~178-215):
```python
# STEP 2: HR_EMP_MASTER (normal employee)
# Regular employees can only access their own data, NO HR admin features
cur.execute("""
    SELECT TO_CHAR(e.CARD_NO), h.USER_PASWD, h.NAME,
           h.EMPCODE, h."ATDTCARD#"
    FROM HR_EMP_MASTER h
    ...
""")

return {
    "card_no": card_no,
    "emp_name": str(row[2] or "").strip(),
    "hr_admin": "N",                    # ← ALWAYS 'N' (never HR admin)
    "has_employee_features": True,      # ← Can access employee modules
    "allowed_companies": [],            # ← EMPTY (no management rights)
    "allowed_branches": [],             # ← EMPTY (no management rights)
    ...
}
```

**Key Changes**:
- ✅ hr_admin is ALWAYS 'N' (even if HR_EMP_MASTER.HR_ADMIN='Y')
- ✅ NO company/branch rights (empty lists)
- ✅ has_employee_features always True

---

### 3. Router Response Initialization
**File**: `routers/auth_router.py`

Updated LoginResponse to include new field:
```python
return LoginResponse(
    status="SUCCESS",
    card_no=user["card_no"],
    emp_name=user.get("emp_name", ""),
    face_registered=user.get("face_registered", "N") == "Y",
    hr_admin=user.get("hr_admin", "N") == "Y",
    has_self_service=user.get("has_self_service", True),
    has_employee_features=user.get("has_employee_features", True),  # ← NEW FIELD
    allowed_companies=user.get("allowed_companies", []),
    allowed_branches=user.get("allowed_branches", []),
    company_list=user.get("company_list", []),
    branch_list=user.get("branch_list", []),
)
```

---

## Response Examples

### Example 1: SEC_USERNAME User (in HR_EMP_MASTER)
```json
{
  "status": "SUCCESS",
  "card_no": "3018224986",
  "emp_name": "Rajesh Kumar",
  "face_registered": false,
  "hr_admin": true,
  "has_self_service": true,
  "has_employee_features": true,
  "allowed_companies": ["1", "2"],
  "allowed_branches": ["10", "20", "30"],
  "company_list": [
    {"code": "1", "name": "TCS Ltd"},
    {"code": "2", "name": "Accenture"}
  ],
  "branch_list": [
    {"code": "10", "name": "Mumbai"},
    {"code": "20", "name": "Delhi"},
    {"code": "30", "name": "Bangalore"}
  ]
}
```

### Example 2: SEC_USERNAME User (NOT in HR_EMP_MASTER)
```json
{
  "status": "SUCCESS",
  "card_no": "9876543210",
  "emp_name": "System Administrator",
  "face_registered": false,
  "hr_admin": true,
  "has_self_service": true,
  "has_employee_features": false,
  "allowed_companies": ["1"],
  "allowed_branches": ["10"],
  "company_list": [
    {"code": "1", "name": "TCS Ltd"}
  ],
  "branch_list": [
    {"code": "10", "name": "Mumbai"}
  ]
}
```

### Example 3: HR_EMP_MASTER User
```json
{
  "status": "SUCCESS",
  "card_no": "100001.1",
  "emp_name": "John Smith",
  "face_registered": false,
  "hr_admin": false,
  "has_self_service": true,
  "has_employee_features": true,
  "allowed_companies": [],
  "allowed_branches": [],
  "company_list": [],
  "branch_list": []
}
```

---

## Verification Checklist

- [ ] Start server and test login endpoint
- [ ] Verify SEC_USERNAME users get hr_admin=true
- [ ] Verify HR_EMP_MASTER users get hr_admin=false
- [ ] Verify SEC_USERNAME users get company/branch rights
- [ ] Verify HR_EMP_MASTER users get empty company/branch arrays
- [ ] Verify SEC_USERNAME user NOT in HR_EMP_MASTER gets has_employee_features=false
- [ ] Check server logs for authentication messages
- [ ] Test with Flutter app frontend changes applied
- [ ] Verify HR modules only show for hr_admin=true users
- [ ] Verify employee modules only show for has_employee_features=true users

---

## Database Integration Points

The authentication system now queries these tables:

1. **SEC_USERNAME** - User credentials and basic info (USRID, DESCR, MOBILE, ECODE, PASWD)
2. **HR_EMP_MASTER** - Employee information (NAME, EMPCODE, MOBILE#, ATDTCARD#, USER_PASWD)
3. **EMPLOYEE** - Employee card numbers and employee code mapping
4. **SEC_USERCMPN** - Company access rights for SEC_USERNAME users
5. **SEC_USERBRCH** - Branch access rights for SEC_USERNAME users
6. **COMPANY_INFO** - Company names/descriptions
7. **COM_LOCATION** - Branch/location names

---

## Important: Oracle Crypto Issue

⚠️ **Note**: The `datacrypt.decryptdata()` function in SEC_USERNAME query may fail with ORA-28817 error. This needs proper Oracle database permissions:

```sql
-- Run in Oracle as DBA
GRANT EXECUTE ON DBMS_CRYPTO TO HRMS;
```

If this fails, the system falls back to HR_EMP_MASTER authentication gracefully.
