# Authentication Changes - Testing Guide

## Summary of Changes

The authentication system has been restructured to enforce proper access control based on login source and user roles.

---

## Key Changes Made

### 1. **SEC_USERNAME Users (HR Administrators)**
- **Data Source**: All user data comes from SEC_USERNAME table (USRID, DESCR, MOBILE, ECODE)
- **HR Admin Rights**: `hr_admin = "Y"` (ALWAYS for SEC_USERNAME users)
- **Company/Branch Access**: Loaded from SEC_USERCMPN and SEC_USERBRCH tables
- **Employee Features**: 
  - `has_employee_features = True` if user exists in HR_EMP_MASTER
  - `has_employee_features = False` if user exists ONLY in SEC_USERNAME (HR-only access)

### 2. **HR_EMP_MASTER Users (Regular Employees)**
- **Data Source**: HR_EMP_MASTER table
- **HR Admin Rights**: `hr_admin = "N"` (NEVER HR admins)
- **Company/Branch Access**: Empty (no management rights)
- **Employee Features**: `has_employee_features = True` (can access employee modules)

### 3. **Response Model Changes**
Added new field to `LoginResponse`:
```python
has_employee_features: bool  # True if user can access employee modules
```

---

## Testing Scenarios

### ✅ Test Case 1: SEC_USERNAME user in HR_EMP_MASTER
**Credentials**: Mobile or ECODE from SEC_USERNAME table

**Expected Response**:
```json
{
  "status": "SUCCESS",
  "card_no": "<card_from_employee_table>",
  "emp_name": "<DESCR_from_SEC_USERNAME>",
  "hr_admin": true,                    // ✓ True for SEC_USERNAME
  "has_employee_features": true,       // ✓ True (exists in HR_EMP_MASTER)
  "allowed_companies": ["1", "2"],     // ✓ From SEC_USERCMPN
  "allowed_branches": ["10", "20"],    // ✓ From SEC_USERBRCH
  "company_list": [{"code": "1", "name": "Company A"}, ...],
  "branch_list": [{"code": "10", "name": "Branch A"}, ...]
}
```

**Frontend Should Allow**:
- ✓ Access HR modules (hr_admin=true)
- ✓ Access employee modules (has_employee_features=true)
- ✓ Manage companies/branches (has allowed_companies/allowed_branches)

---

### ✅ Test Case 2: SEC_USERNAME user NOT in HR_EMP_MASTER
**Credentials**: Mobile or ECODE from SEC_USERNAME table (not in HR_EMP_MASTER)

**Expected Response**:
```json
{
  "status": "SUCCESS",
  "card_no": "<username_as_fallback>",
  "emp_name": "<DESCR_from_SEC_USERNAME>",
  "hr_admin": true,                     // ✓ True for SEC_USERNAME
  "has_employee_features": false,       // ✓ False (NOT in HR_EMP_MASTER)
  "allowed_companies": ["1", "2"],      // ✓ From SEC_USERCMPN
  "allowed_branches": ["10"],           // ✓ From SEC_USERBRCH
  "company_list": [{"code": "1", "name": "Company A"}, ...],
  "branch_list": [{"code": "10", "name": "Branch A"}, ...]
}
```

**Frontend Should Allow**:
- ✓ Access HR modules (hr_admin=true)
- ✗ BLOCK employee modules (has_employee_features=false) ← **KEY DIFFERENCE**
- ✓ Manage companies/branches (has allowed_companies/allowed_branches)

---

### ✅ Test Case 3: HR_EMP_MASTER User (Regular Employee)
**Credentials**: Mobile, ATDTCARD#, or EMPCODE from HR_EMP_MASTER table

**Expected Response**:
```json
{
  "status": "SUCCESS",
  "card_no": "<card_from_employee_table>",
  "emp_name": "<NAME_from_HR_EMP_MASTER>",
  "hr_admin": false,                    // ✓ False for HR_EMP_MASTER
  "has_employee_features": true,        // ✓ True (employee)
  "allowed_companies": [],              // ✓ Empty (no management rights)
  "allowed_branches": [],               // ✓ Empty (no management rights)
  "company_list": [],
  "branch_list": []
}
```

**Frontend Should Allow**:
- ✗ BLOCK HR modules (hr_admin=false)
- ✓ Access employee modules (has_employee_features=true)
- ✗ BLOCK company/branch management (empty allowed_companies/branches)

---

## Testing Instructions

### Manual Testing via API

#### Test SEC_USERNAME Login:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "9123456789", "password": "your_password"}'
```

#### Test HR_EMP_MASTER Login:
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "100001.1", "password": "your_password"}'
```

### Automated Testing

Run the test script:
```bash
cd c:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Backend
python test_auth_changes.py
```

Edit the test usernames/passwords in `test_auth_changes.py` with real credentials.

---

## Database Queries to Verify Setup

```sql
-- 1. Check SEC_USERNAME users and their rights
SELECT su.USRID, su.DESCR, su.MOBILE, su.ECODE,
       COUNT(DISTINCT sc.COMPC) as company_count,
       COUNT(DISTINCT sb.BRNCH) as branch_count
FROM SEC_USERNAME su
LEFT JOIN SEC_USERCMPN sc ON su.USRID = sc.USRID
LEFT JOIN SEC_USERBRCH sb ON su.USRID = sb.USRID
WHERE su.STATS = 'E'
GROUP BY su.USRID, su.DESCR, su.MOBILE, su.ECODE;

-- 2. Check if SEC_USERNAME user exists in HR_EMP_MASTER
SELECT su.DESCR, su.MOBILE, su.ECODE,
       CASE WHEN hem.EMPCODE IS NOT NULL THEN 'YES' ELSE 'NO' END as in_hr_emp_master
FROM SEC_USERNAME su
LEFT JOIN HR_EMP_MASTER hem ON hem.EMPCODE = su.ECODE
WHERE su.STATS = 'E';

-- 3. Check specific user's company/branch rights
SELECT sc.COMPC, ci.DESCR as company_name,
       sb.BRNCH, cl.DESCR as branch_name
FROM SEC_USERCMPN sc
LEFT JOIN COMPANY_INFO ci ON ci.COMPC = sc.COMPC
LEFT JOIN SEC_USERBRCH sb ON sb.USRID = sc.USRID
LEFT JOIN COM_LOCATION cl ON TO_CHAR(cl.LCODE) = TO_CHAR(sb.BRNCH)
WHERE sc.USRID = 2  -- Replace with actual USRID
ORDER BY sc.COMPC, sb.BRNCH;
```

---

## Frontend Integration

### 1. Show/Hide HR Modules
```javascript
// Show HR modules only for HR admins
if (loginResponse.hr_admin) {
  showHRModules(); // Employee management, leave types, etc.
} else {
  hideHRModules();
}
```

### 2. Show/Hide Employee Modules
```javascript
// Show employee modules only if user has employee features
if (loginResponse.has_employee_features) {
  showEmployeeModules(); // My dashboard, my leaves, attendance, etc.
} else {
  hideEmployeeModules();
}
```

### 3. Company/Branch Filtering
```javascript
// Use these for access control on sensitive data
const canAccessCompany = (companyCode) => {
  return loginResponse.allowed_companies.includes(companyCode);
};

const canAccessBranch = (branchCode) => {
  return loginResponse.allowed_branches.includes(branchCode);
};

// For dropdown filters in HR modules
const availableCompanies = loginResponse.company_list;
const availableBranches = loginResponse.branch_list;
```

---

## Important Notes

⚠️ **Critical**: The `hr_admin` field now has **only two valid states**:
- `true`: Only for SEC_USERNAME users (HR administrators with full access)
- `false`: For HR_EMP_MASTER or EMPLOYEE table users

🔑 **Key Distinction**: 
- Previous: `hr_admin` field in HR_EMP_MASTER table was sometimes 'Y'
- **Now**: `hr_admin` field is IGNORED for HR_EMP_MASTER users - they ALWAYS get `hr_admin=false`
- Only SEC_USERNAME authenticated users can be HR admins

📊 **Access Rights Summary**:

| User Type | Source | hr_admin | has_employee_features | Company Rights | Branch Rights |
|-----------|--------|----------|----------------------|-----------------|----------------|
| HR Admin | SEC_USERNAME | ✓ True | May vary | ✓ Yes (from SEC_USERCMPN) | ✓ Yes (from SEC_USERBRCH) |
| HR Admin (HR-only) | SEC_USERNAME | ✓ True | ✗ False | ✓ Yes (from SEC_USERCMPN) | ✓ Yes (from SEC_USERBRCH) |
| Employee | HR_EMP_MASTER | ✗ False | ✓ True | ✗ No | ✗ No |

---

## Troubleshooting

### Issue: HR_EMP_MASTER user getting hr_admin=true
**Solution**: Check that the user is NOT logging in via SEC_USERNAME. The authenticate_user function tries SEC_USERNAME first.

### Issue: SEC_USERNAME user not seeing company/branch rights
**Solution**: Verify SEC_USERCMPN and SEC_USERBRCH tables have entries for this user's USRID:
```sql
SELECT * FROM SEC_USERCMPN WHERE USRID = <user_usrid>;
SELECT * FROM SEC_USERBRCH WHERE USRID = <user_usrid>;
```

### Issue: SEC_USERNAME user not in HR_EMP_MASTER showing employee data
**Solution**: This is correct behavior - they should see HR features only.
