# Location Tracking Implementation Guide

## Overview
This document describes the implementation of employee location tracking based on HR_EMP_MASTER database table settings. The system allows HR to control:
- **Whether** an employee's location should be tracked (TRACK_LOCATION: Y/N)
- **How often** the location should be recorded (TRACK_LOCATION_HR: interval in hours)

---

## Database Schema

### HR_EMP_MASTER Table Columns
```sql
-- Employee Code (Primary Key)
EMPCODE VARCHAR2(100) NOT NULL

-- Location Tracking Configuration
TRACK_LOCATION VARCHAR2(1)      -- 'Y' = Enable tracking, 'N' = Disable tracking
TRACK_LOCATION_HR NUMBER        -- Interval in hours (e.g., 2 = track every 2 hours)
```

### Sample Data
```sql
-- Employee with tracking enabled every 2 hours
EMPCODE: 100505.1
NAME: ABDUL BASIT LASHARI
TRACK_LOCATION: Y
TRACK_LOCATION_HR: 2

-- Employee with tracking disabled
EMPCODE: 100511.1
NAME: HALAR KHAN
TRACK_LOCATION: N
TRACK_LOCATION_HR: NULL
```

---

## Backend API Endpoints

### 1. Get Employee Tracking Settings
**Endpoint:** `GET /api/location-tracking/settings/{emp_code}`

**Description:** Fetch location tracking configuration for a specific employee from HR_EMP_MASTER

**Request:**
```bash
curl -X GET "http://localhost:8000/api/location-tracking/settings/100505.1"
```

**Response (200 OK):**
```json
{
  "emp_code": "100505.1",
  "employee_name": "ABDUL BASIT LASHARI",
  "track_location": "Y",
  "track_location_hr": 2,
  "status": "A",
  "message": "Location tracking is ENABLED"
}
```

**Response (404 Not Found):**
```json
{
  "detail": "Employee 100505.1 not found"
}
```

---

### 2. Update Employee Tracking Settings
**Endpoint:** `POST /api/location-tracking/settings/{emp_code}/update`

**Description:** Update location tracking settings for an employee

**Request:**
```bash
curl -X POST "http://localhost:8000/api/location-tracking/settings/100505.1/update?track_location=Y&track_location_hr=3"
```

**Parameters:**
- `track_location` (required): 'Y' or 'N'
- `track_location_hr` (optional): 1-24 (default: 2)

**Response (200 OK):**
```json
{
  "success": true,
  "emp_code": "100505.1",
  "track_location": "Y",
  "track_location_hr": 3,
  "message": "Settings updated successfully"
}
```

---

### 3. Get All Active Tracking Employees
**Endpoint:** `GET /api/location-tracking/active-employees`

**Description:** Get all employees with tracking enabled (TRACK_LOCATION = 'Y')

**Request:**
```bash
curl -X GET "http://localhost:8000/api/location-tracking/active-employees"
```

**Response (200 OK):**
```json
{
  "total_tracking": 45,
  "employees": [
    {
      "emp_code": "100505.1",
      "employee_name": "ABDUL BASIT LASHARI",
      "track_location_hr": 2,
      "location": "1",
      "department": "19",
      "status": "A"
    },
    {
      "emp_code": "100511.1",
      "employee_name": "HALAR KHAN",
      "track_location_hr": 2,
      "location": "1",
      "department": "17",
      "status": "A"
    }
  ]
}
```

---

### 4. Get Tracking Statistics
**Endpoint:** `GET /api/location-tracking/statistics`

**Description:** Get system-wide location tracking statistics

**Request:**
```bash
curl -X GET "http://localhost:8000/api/location-tracking/statistics"
```

**Response (200 OK):**
```json
{
  "total_employees": 643,
  "tracking_enabled": 45,
  "tracking_disabled": 598,
  "average_interval_hours": 2.3,
  "total_tracking_hours": 104
}
```

---

## Flutter Mobile App Implementation

### 1. Location Tracking Config Service
**File:** `lib/core/services/location_tracking_config_service.dart`

This service handles communication with the backend to fetch and update employee tracking configurations.

#### Key Classes:

**LocationTrackingConfig**
```dart
class LocationTrackingConfig {
  final String empCode;
  final String employeeName;
  final String trackLocation;  // 'Y' or 'N'
  final int trackLocationHr;   // Hours interval
  final bool isTrackingEnabled; // true if trackLocation == 'Y'
  
  Duration get trackingInterval => Duration(hours: trackLocationHr);
}
```

**LocationTrackingConfigService**
```dart
class LocationTrackingConfigService {
  // Get tracking settings for specific employee
  Future<LocationTrackingConfig> getTrackingSettings(String empCode);
  
  // Update tracking settings
  Future<bool> updateTrackingSettings({
    required String empCode,
    required bool enableTracking,
    required int intervalHours,
  });
  
  // Get all active tracking employees
  Future<List<LocationTrackingConfig>> getActiveTrackingEmployees();
  
  // Get statistics
  Future<Map<String, dynamic>> getTrackingStatistics();
  
  // Check if employee should be tracked
  Future<bool> shouldTrackEmployee(String empCode);
}
```

#### Usage Example:
```dart
final configService = LocationTrackingConfigService();

// Get employee tracking settings
final config = await configService.getTrackingSettings('100505.1');

if (config.isTrackingEnabled) {
  print('Tracking enabled every ${config.trackLocationHr} hours');
} else {
  print('Tracking is disabled for this employee');
}

// Get active employees
final employees = await configService.getActiveTrackingEmployees();
print('Total employees with tracking: ${employees.length}');
```

---

### 2. Updated Location Tracking Service
**File:** `lib/core/services/location_tracking_service.dart`

Enhanced to respect HR_EMP_MASTER settings and use dynamic intervals.

#### Key Changes:

1. **Check Configuration Before Starting**
   - Validates if employee is allowed to track (TRACK_LOCATION = 'Y')
   - Returns null if tracking is disabled

2. **Dynamic Interval**
   - Uses TRACK_LOCATION_HR value instead of hardcoded 1 hour
   - Minimum: 1 hour, Maximum: 24 hours

3. **Enhanced Logging**
   - Shows emoji indicators (✓, ✅, ⚠️, ❌)
   - Displays tracking interval clearly

#### Updated startTracking Method:
```dart
Future<LocationTrackingConfig?> startTracking(String cardNo) async {
  try {
    // Step 1: Check if employee is allowed to track
    final config = await _configService.getTrackingSettings(cardNo);
    
    if (!config.isTrackingEnabled) {
      debugPrint('[LocationTracking] ⚠️ Tracking DISABLED for employee $cardNo');
      return null;
    }

    // Step 2: Request location permissions
    // Step 3: Save configuration
    // Step 4: Register periodic task with DYNAMIC interval
    // Step 5: Show notification with interval info
    
    return config;
  } catch (e) {
    debugPrint('[LocationTracking] ❌ Failed to start tracking: $e');
    return null;
  }
}
```

#### Usage Example:
```dart
final trackingService = LocationTrackingService();

// Start tracking (only if allowed)
final config = await trackingService.startTracking('100505.1');

if (config != null) {
  print('Tracking started: ${config.employeeName}');
  print('Interval: every ${config.trackLocationHr} hours');
  print('Notification message updated accordingly');
} else {
  print('Tracking disabled for this employee or permission denied');
  showSnackBar('Location tracking is not enabled for your account');
}
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile App Login                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
         ┌──────────────────────────────────────┐
         │  User starts work session            │
         │  cardNo = "100505.1"                 │
         └────────────┬─────────────────────────┘
                      │
                      ▼
    ┌─────────────────────────────────────────────┐
    │ Backend: GET /api/location-tracking/        │
    │          settings/100505.1                  │
    └─────────────┬───────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────────────┐
    │ Database Query: HR_EMP_MASTER                │
    │ SELECT TRACK_LOCATION, TRACK_LOCATION_HR    │
    │ WHERE EMPCODE = '100505.1'                  │
    └─────────────┬────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────────────┐
    │ Response: {                                  │
    │   track_location: "Y",                       │
    │   track_location_hr: 2                       │
    │ }                                            │
    └─────────────┬────────────────────────────────┘
                  │
          ┌───────┴───────┐
          │               │
      track='N'       track='Y'
          │               │
          ▼               ▼
    ┌──────────┐    ┌──────────────────────────────┐
    │ Stop     │    │ Start Workmanager Task       │
    │ Return   │    │ Frequency: 2 hours           │
    │ null     │    │ (Dynamic based on setting)   │
    └──────────┘    └────────────┬─────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────────┐
                    │ Show Notification            │
                    │ "Tracking every 2 hours"     │
                    └────────────┬─────────────────┘
                                 │
                    Every 2 hours ▼
                    ┌──────────────────────────────┐
                    │ Capture GPS Location         │
                    │ Store in Local SQLite DB     │
                    └────────────┬─────────────────┘
                                 │
                    When online   ▼
                    ┌──────────────────────────────┐
                    │ Sync to Backend              │
                    │ POST /auth/location/batch    │
                    └──────────────────────────────┘
```

---

## Implementation Checklist

### Backend (Python/FastAPI)
- [x] Create location_tracking_router.py with 4 endpoints
- [x] Query HR_EMP_MASTER for TRACK_LOCATION settings
- [x] Validate tracking parameters (1-24 hour range)
- [x] Add router to main.py
- [x] Error handling for missing employees
- [ ] Add rate limiting to endpoints
- [ ] Add audit logging for tracking changes
- [ ] Add authentication check (admin only for updates)

### Mobile (Flutter)
- [x] Create LocationTrackingConfigService
- [x] Update LocationTrackingService to use config
- [x] Implement dynamic interval scheduling
- [x] Add enhanced logging with emoji indicators
- [x] Update notification message
- [ ] Add BLoC/Provider state management
- [ ] Add UI screen to view/manage tracking settings
- [ ] Add retry logic with exponential backoff
- [ ] Add local cache of config settings
- [ ] Add offline capability

### Testing
- [ ] Test with tracking enabled (Y)
- [ ] Test with tracking disabled (N)
- [ ] Test various intervals (1h, 2h, 4h, 8h, 12h, 24h)
- [ ] Test permission denial scenarios
- [ ] Test background location permission handling
- [ ] Test sync when connectivity restored
- [ ] Test notification display on different Android versions
- [ ] Load test with 100+ tracked employees

---

## Configuration Examples

### Scenario 1: Field Supervisor (Track Hourly)
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'Y', TRACK_LOCATION_HR = 1
WHERE EMPCODE = '100505.1';
```
- Location tracked every **1 hour**
- Useful for field supervisors, delivery personnel

### Scenario 2: Sales Officer (Track Every 2-3 Hours)
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'Y', TRACK_LOCATION_HR = 3
WHERE EMPCODE = '100511.1';
```
- Location tracked every **3 hours**
- Suitable for sales officers with multiple site visits

### Scenario 3: Office Staff (Tracking Disabled)
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'N', TRACK_LOCATION_HR = NULL
WHERE EMPCODE = '100512.1';
```
- Location tracking **disabled**
- No GPS data recorded

### Scenario 4: Bulk Enable Tracking
```sql
UPDATE HR_EMP_MASTER 
SET TRACK_LOCATION = 'Y', TRACK_LOCATION_HR = 2
WHERE DEPT_NO IN ('17', '19') AND STATUS = 'A';
```
- Enable tracking for entire departments
- Default 2-hour interval

---

## Security Considerations

1. **API Authentication**
   - All endpoints should require authentication
   - Use JWT or OAuth2 tokens

2. **Authorization**
   - Only HR managers can update tracking settings
   - Employees can only view their own settings
   - Implement role-based access control (RBAC)

3. **Data Privacy**
   - Encrypt location data in transit (HTTPS)
   - Encrypt location data at rest in database
   - Implement data retention policies
   - Log all access to location data

4. **Location Permissions**
   - Request permissions explicitly
   - Show privacy notice to employees
   - Provide easy way to disable tracking
   - Support Android 10+ location updates limitations

---

## Error Handling

### Backend Errors
```python
# 404: Employee not found
{"detail": "Employee 100505.1 not found"}

# 400: Invalid parameters
{"detail": "track_location must be 'Y' or 'N'"}
{"detail": "track_location_hr must be between 1 and 24 hours"}

# 500: Database error
{"detail": "Error fetching tracking settings: [error details]"}
```

### Mobile Errors
```dart
// Permission denied
'Location permission not granted (background)'

// Configuration fetch failed
'Error fetching tracking settings: Connection timeout'

// Invalid interval
'Tracking interval must be 1-24 hours'
```

---

## Future Enhancements

1. **Geofencing**
   - Create virtual boundaries (office, warehouse, etc.)
   - Alert if employee leaves designated area
   - Integrate with HR_LOCATION table

2. **Route Tracking**
   - Store complete route instead of just points
   - Show route visualization on dashboard
   - Calculate actual distance traveled

3. **Real-time Tracking**
   - Live location updates on admin dashboard
   - Real-time alerts for off-site activities
   - Integration with maps API

4. **Analytics**
   - Generate location-based reports
   - Identify patterns and inefficiencies
   - Calculate commute times

5. **Mobile App UI**
   - Dashboard showing tracking status
   - History of tracked locations
   - Settings to manage tracking preferences

---

## Database Queries

### Check tracking configuration
```sql
SELECT EMPCODE, NAME, TRACK_LOCATION, TRACK_LOCATION_HR 
FROM HR_EMP_MASTER 
WHERE EMPCODE = '100505.1';
```

### Get employees with tracking enabled
```sql
SELECT EMPCODE, NAME, TRACK_LOCATION_HR 
FROM HR_EMP_MASTER 
WHERE TRACK_LOCATION = 'Y' AND STATUS = 'A'
ORDER BY EMPCODE;
```

### Get tracking statistics
```sql
SELECT 
  COUNT(*) as total_employees,
  SUM(CASE WHEN TRACK_LOCATION = 'Y' THEN 1 ELSE 0 END) as tracking_enabled,
  SUM(CASE WHEN TRACK_LOCATION = 'Y' THEN 1 ELSE 0 END) as tracking_disabled,
  AVG(CASE WHEN TRACK_LOCATION = 'Y' THEN TRACK_LOCATION_HR ELSE NULL END) as avg_interval
FROM HR_EMP_MASTER;
```

---

## Support & Troubleshooting

### Issue: Tracking not starting
- Check if TRACK_LOCATION = 'Y' in database
- Verify location permissions are granted
- Check device location services are enabled
- Review app logs for error messages

### Issue: Wrong tracking interval
- Verify TRACK_LOCATION_HR value in database
- Check if interval is between 1-24
- Restart app after database changes
- Clear app cache if needed

### Issue: Locations not syncing
- Check network connectivity
- Verify server is running on correct port (8000)
- Check if employee code is correct
- Review API endpoint URLs in app config

---

**Document Version:** 1.0  
**Last Updated:** May 6, 2026  
**Author:** Development Team
