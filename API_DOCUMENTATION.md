# 📚 Complete API Documentation

## Swagger UI Access

**URL**: http://localhost:3000/api-docs

## API Endpoints Overview

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/register` | User registration | No |
| GET | `/api/auth/me` | Get current user | Yes |

### 🥛 Milk Collections (`/api/milk`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/milk/collections` | Create milk collection | Yes | Driver |
| GET | `/api/milk/collections` | Get milk collections | Yes | All |
| GET | `/api/milk/dashboard/stats` | Get dashboard statistics | Yes | All |
| GET | `/api/milk/price/today` | Get today's milk price | Yes | All |

### 🚗 Driver Management (`/api/driver`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| PATCH | `/api/driver/duty-status` | Update duty status | Yes | Driver |
| POST | `/api/driver/location` | Save GPS location | Yes | Driver |
| GET | `/api/driver/location/current` | Get current location | Yes | All |
| GET | `/api/driver/location/history` | Get location history | Yes | All |
| GET | `/api/driver/centers` | Get assigned centers | Yes | Driver |
| GET | `/api/driver/all` | Get all drivers | Yes | Admin |

### 💰 Payments (`/api/payment`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/payment/calculate` | Calculate monthly payment | Yes | Admin |
| POST | `/api/payment` | Create payment | Yes | Admin |
| GET | `/api/payment` | Get payments | Yes | All |
| PATCH | `/api/payment/:id/status` | Update payment status | Yes | Admin |

### 💵 Milk Pricing (`/api/milk-price`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/api/milk-price` | Set daily milk price | Yes | Admin |
| GET | `/api/milk-price` | Get milk prices | Yes | All |
| GET | `/api/milk-price/single` | Get single price | Yes | All |
| GET | `/api/milk-price/preview` | Calculate price preview | Yes | All |

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. **Login** via `/api/auth/login` with credentials
2. **Copy the token** from the response
3. **Use in Swagger**: Click "Authorize" button and paste token

## Testing in Swagger UI

### Step 1: Access Swagger
Navigate to: http://localhost:3000/api-docs

### Step 2: Login
1. Find `POST /api/auth/login` under **Authentication**
2. Click "Try it out"
3. Enter credentials:
   ```json
   {
     "mobileOrEmail": "9876543210",
     "password": "password123"
   }
   ```
4. Click "Execute"
5. Copy the `token` from response

### Step 3: Authorize
1. Click **"Authorize"** button (top right)
2. Paste token (without "Bearer")
3. Click "Authorize"
4. Click "Close"

### Step 4: Test Protected Endpoints
Now all protected endpoints will automatically include the token.

## Default Test Credentials

### Admin
- **Mobile**: `9876543210`
- **Email**: `admin@akshayadairy.com`
- **Password**: `password123`

### Driver
- **Mobile**: `9876543211`
- **Email**: `driver1@akshayadairy.com`
- **Password**: `password123`

### Vendor
- **Mobile**: `9876543213`
- **Email**: `vendor1@akshayadairy.com`
- **Password**: `password123`

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Invalid/missing token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented. Consider adding for production.

## Notes

- All dates should be in `YYYY-MM-DD` format
- All UUIDs should be valid UUID v4 format
- All monetary values are in Indian Rupees (₹)
- All weights are in kilograms (kg)
- All percentages are decimal numbers (e.g., 4.5 for 4.5%)

---

For detailed endpoint documentation, visit: **http://localhost:3000/api-docs**

