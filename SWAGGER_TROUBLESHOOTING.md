# Swagger UI Troubleshooting Guide

## Issue: "Failed to fetch" error in Swagger UI

### Possible Causes:

1. **Server not running**
   - Make sure the backend server is running on port 3000
   - Check: `http://localhost:3000/health` should return a response

2. **CORS Configuration**
   - The server now allows requests from `http://localhost:3000` (Swagger UI)
   - In development mode, all origins are allowed

3. **Network/Firewall Issues**
   - Check if port 3000 is accessible
   - Try accessing `http://localhost:3000/health` directly in browser

### Steps to Fix:

1. **Restart the server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Verify server is running:**
   - Open browser: `http://localhost:3000/health`
   - Should see: `{"success":true,"message":"Akshaya Dairy API is running",...}`

3. **Access Swagger UI:**
   - Open: `http://localhost:3000/api-docs`
   - Try the login endpoint with:
     ```json
     {
       "mobileOrEmail": "9876543210",
       "password": "password123"
     }
     ```

4. **If still failing:**
   - Check browser console for errors
   - Check server logs for CORS errors
   - Verify `.env` file has correct configuration

### Test Login Credentials:

- **Admin:** `9876543210` / `password123`
- Make sure the database is seeded with this user

### Alternative: Use curl to test

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobileOrEmail":"9876543210","password":"password123"}'
```

