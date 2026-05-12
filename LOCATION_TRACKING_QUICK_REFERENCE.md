# Location Tracking Quick Reference

## Database Table
```
HR_EMP_MASTER
├── EMPCODE (100505.1)
├── NAME (ABDUL BASIT LASHARI)
├── TRACK_LOCATION ('Y' or 'N')
└── TRACK_LOCATION_HR (1-24 hours)
```

## 🎛️ Configuration Grid

| Employee | TRACK_LOCATION | TRACK_LOCATION_HR | Result |
|----------|----------------|-------------------|--------|
| 100505.1 | Y              | 1                 | Track every **1 hour** |
| 100511.1 | Y              | 2                 | Track every **2 hours** |
| 100512.1 | Y              | 4                 | Track every **4 hours** |
| 100513.1 | N              | NULL or 2         | **NO TRACKING** |
| 100514.1 | Y              | 8                 | Track every **8 hours** |

## API Endpoints Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCATION TRACKING API                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  GET  /api/location-tracking/settings/{emp_code}                │
│       → Fetch employee's tracking configuration                 │
│       ↓ Response: {track_location: 'Y', track_location_hr: 2}  │
│                                                                   │
│  POST /api/location-tracking/settings/{emp_code}/update         │
│       → Update tracking settings                                │
│       ↓ Params: track_location='Y', track_location_hr=3         │
│                                                                   │
│  GET  /api/location-tracking/active-employees                   │
│       → List all employees with tracking enabled               │
│       ↓ Response: [45 employees with TRACK_LOCATION='Y']        │
│                                                                   │
│  GET  /api/location-tracking/statistics                         │
│       → Get system-wide statistics                              │
│       ↓ Response: {total_employees: 643, enabled: 45}          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Flutter Mobile Flow

```
┌────────────────────────────────────────────────────────────────┐
│ User Logs In with Card #: 100505.1                             │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ startTracking('100505.1')      │
    └────────────┬───────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────────────────┐
    │ API: GET /api/location-tracking/                  │
    │      settings/100505.1                            │
    └────────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Check Response:     │
        │ - track_location    │
        │ - track_location_hr │
        └────────┬────────────┘
                 │
         ┌───────┴────────┐
         │                │
    track='N'        track='Y'
         │                │
         ▼                ▼
    ┌─────────┐    ┌─────────────────────────────┐
    │ STOP    │    │ START WORKMANAGER          │
    │ Return  │    │ Frequency: 2 hours         │
    │ null    │    │ (from track_location_hr)   │
    └─────────┘    └────────────┬────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────────┐
                    │ Schedule GPS Capture Every   │
                    │ 2 Hours (DYNAMIC)            │
                    └────────────┬─────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────────┐
                    │ Show Notification:           │
                    │ "Tracking every 2 hours"     │
                    └──────────────────────────────┘
```

## Command Examples

### Get Current Setting
```bash
curl -X GET "http://localhost:8000/api/location-tracking/settings/100505.1"
```

### Enable Tracking (Every Hour)
```bash
curl -X POST "http://localhost:8000/api/location-tracking/settings/100505.1/update?track_location=Y&track_location_hr=1"
```

### Enable Tracking (Every 4 Hours)
```bash
curl -X POST "http://localhost:8000/api/location-tracking/settings/100511.1/update?track_location=Y&track_location_hr=4"
```

### Disable Tracking
```bash
curl -X POST "http://localhost:8000/api/location-tracking/settings/100512.1/update?track_location=N"
```

### Get All Tracked Employees
```bash
curl -X GET "http://localhost:8000/api/location-tracking/active-employees"
```

### Get Statistics
```bash
curl -X GET "http://localhost:8000/api/location-tracking/statistics"
```

## SQL Examples

### Check Settings
```sql
SELECT EMPCODE, NAME, TRACK_LOCATION, TRACK_LOCATION_HR 
FROM HR_EMP_MASTER 
WHERE EMPCODE = '100505.1';
```

### Enable for Department
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'Y', TRACK_LOCATION_HR = 2,
    USR_DATE_UPD = SYSDATE
WHERE DEPT_NO = '19' AND STATUS = 'A';
```

### Disable for All
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'N',
    USR_DATE_UPD = SYSDATE
WHERE TRACK_LOCATION = 'Y';
```

### Get Statistics
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN TRACK_LOCATION = 'Y' THEN 1 ELSE 0 END) as enabled,
  SUM(CASE WHEN TRACK_LOCATION = 'Y' THEN 1 ELSE 0 END) as disabled,
  AVG(CASE WHEN TRACK_LOCATION = 'Y' THEN TRACK_LOCATION_HR ELSE NULL END) as avg_interval
FROM HR_EMP_MASTER;
```

## Decision Tree

```
START: Employee opens app
  │
  └─→ startTracking(empCode)?
       │
       ├─→ Fetch settings from backend
       │    │
       │    ├─→ TRACK_LOCATION = 'Y'?
       │    │    │
       │    │    ├─→ YES: Get TRACK_LOCATION_HR
       │    │    │         │
       │    │    │         ├─→ Validate range (1-24)
       │    │    │         │
       │    │    │         ├─→ Schedule Workmanager
       │    │    │         │
       │    │    │         └─→ Show notification
       │    │    │
       │    │    └─→ NO: Return null, stop
       │    │
       │    └─→ Error? Return null, log error
       │
       └─→ Continue...

Every N hours (where N = TRACK_LOCATION_HR):
  │
  ├─→ Get GPS location
  │
  ├─→ Store in SQLite
  │
  └─→ Sync when online
```

## Validation Rules

| Parameter | Type | Range | Example |
|-----------|------|-------|---------|
| empCode | String | Any valid code | "100505.1" |
| TRACK_LOCATION | String | 'Y' or 'N' | 'Y' |
| TRACK_LOCATION_HR | Number | 1-24 | 2 |

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Settings fetched/updated |
| 404 | Not found | Employee doesn't exist |
| 400 | Bad request | Invalid track_location value |
| 500 | Server error | Database connection failed |

## Key Differences

### Before (Old Implementation)
```
✗ Hardcoded 1-hour interval
✗ All employees tracked the same way
✗ No way to disable tracking
✗ No configuration per employee
```

### After (New Implementation)
```
✓ Dynamic interval per employee (1-24 hours)
✓ Enabled/disabled per employee (Y/N)
✓ API to update settings
✓ Respects HR_EMP_MASTER settings
✓ Statistics and reporting
✓ Bulk operations support
```

## Testing Checklist

- [ ] Employee with TRACK_LOCATION='Y', TRACK_LOCATION_HR=1 → Track every 1h
- [ ] Employee with TRACK_LOCATION='Y', TRACK_LOCATION_HR=2 → Track every 2h
- [ ] Employee with TRACK_LOCATION='Y', TRACK_LOCATION_HR=4 → Track every 4h
- [ ] Employee with TRACK_LOCATION='N' → No tracking
- [ ] API returns 404 for non-existent employee
- [ ] API validates hour range (1-24)
- [ ] API validates Y/N for track_location
- [ ] Notification shows correct interval
- [ ] Workmanager schedules with dynamic interval
- [ ] Settings persist after app restart
- [ ] Bulk updates work correctly

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Tracking not starting | TRACK_LOCATION='N' | Update to 'Y' in database |
| Wrong interval | TRACK_LOCATION_HR value | Check database, verify value 1-24 |
| Permission denied | Location permission not granted | Grant "Always" permission |
| API returns 404 | Employee doesn't exist | Check empCode is correct |
| Notification not showing | Android version issue | Check Android 8+ requirements |

## Important Notes ⚠️

1. **Minimum interval: 1 hour** - Can't track more frequently
2. **Maximum interval: 24 hours** - Can't exceed 1 day
3. **NULL handling** - If TRACK_LOCATION_HR is NULL, defaults to 2 hours
4. **Status check** - Only tracks active employees (STATUS = 'A')
5. **Permissions** - Requires location permission set to "Always"
6. **Privacy** - Show users notification that tracking is active
7. **Compliance** - Ensure HR approval before enabling tracking

---

**Quick Reference Version 1.0**  
**For Full Details: See LOCATION_TRACKING_GUIDE.md**
