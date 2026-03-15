# Driver Collections - Multiple Collections Per Day

## Overview
The system allows drivers to work multiple times per day, specifically:
- **Morning collection**: Drivers can collect milk in the morning
- **Evening collection**: The same driver can collect milk in the evening on the same day
- **Multiple vendors**: Drivers can collect from different vendors/centers on the same day

## Database Schema

The `milk_collections` table supports multiple collections per driver per day:

### Key Fields:
- `driver_id`: The driver who collected the milk
- `collection_date`: Date of collection
- `collection_time`: Either 'morning' or 'evening'
- `vendor_id`: The dairy center/vendor from which milk was collected

### Constraints:
- **NO unique constraint** on `(driver_id, collection_date, collection_time)` - allows multiple collections
- **NO unique constraint** on `(driver_id, vendor_id, collection_date, collection_time)` - allows same driver to collect from same vendor multiple times if needed
- **Unique constraint** only on `collection_code` - ensures each collection has a unique code

### Indexes:
- `idx_driver_date_time`: Composite index on `(driver_id, collection_date, collection_time)` for efficient querying
- `idx_vendor_date_time`: Composite index on `(vendor_id, collection_date, collection_time)` for vendor reports

## Business Logic

### Allowed Scenarios:
1. ✅ Driver collects from Vendor A in the morning
2. ✅ Same driver collects from Vendor B in the evening (same day)
3. ✅ Same driver collects from Vendor A in the evening (same day, different time)
4. ✅ Driver collects from multiple vendors in the morning (different centers)

### Example:
```
Driver: John Doe
Date: 2025-11-27

Collection 1:
- Time: morning
- Vendor: Shinde Dairy Farm
- Weight: 50 kg

Collection 2:
- Time: evening  
- Vendor: Shinde Dairy Farm
- Weight: 45 kg

Both collections are allowed and will be stored separately.
```

## API Usage

### Create Morning Collection:
```json
POST /api/milk/collections
{
  "vendor_id": "uuid",
  "center_id": "uuid",
  "collection_date": "2025-11-27",
  "collection_time": "morning",
  "milk_type": "cow",
  "milk_weight": 50.5,
  "fat_percentage": 4.5,
  "snf_percentage": 8.5
}
```

### Create Evening Collection (Same Day):
```json
POST /api/milk/collections
{
  "vendor_id": "uuid",
  "center_id": "uuid",
  "collection_date": "2025-11-27",
  "collection_time": "evening",
  "milk_type": "cow",
  "milk_weight": 45.0,
  "fat_percentage": 4.3,
  "snf_percentage": 8.4
}
```

## Querying Collections

### Get all collections for a driver on a specific day:
```sql
SELECT * FROM milk_collections 
WHERE driver_id = 'driver-uuid' 
  AND collection_date = '2025-11-27'
ORDER BY collection_time;
```

### Get morning and evening totals for a driver:
```sql
SELECT 
  collection_time,
  SUM(milk_weight) as total_weight,
  SUM(total_amount) as total_amount
FROM milk_collections 
WHERE driver_id = 'driver-uuid' 
  AND collection_date = '2025-11-27'
GROUP BY collection_time;
```

## Migration

To apply the database changes that explicitly support this feature:

```bash
cd backend
npx knex migrate:latest
```

This will add the necessary indexes for efficient querying of driver collections by date and time.

