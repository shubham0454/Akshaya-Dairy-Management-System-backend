# 📚 Swagger API Documentation

## Access Swagger UI

Once the backend server is running, access Swagger documentation at:

**http://localhost:3000/api-docs**

## Testing Login Endpoint

1. **Open Swagger UI**: Navigate to http://localhost:3000/api-docs

2. **Find Login Endpoint**: 
   - Look for the **Authentication** section
   - Click on `POST /api/auth/login` to expand it

3. **Click "Try it out"** button

4. **Enter Login Credentials**:
   ```json
   {
     "mobileOrEmail": "9876543210",
     "password": "password123"
   }
   ```
   
   Or use email:
   ```json
   {
     "mobileOrEmail": "admin@akshayadairy.com",
     "password": "password123"
   }
   ```

5. **Click "Execute"**

6. **View Response**:
   - You'll see the response with status code
   - Copy the `token` from the response
   - Use this token for authenticated endpoints

## Using Authentication Token

After login, you'll receive a JWT token. To use it in Swagger:

1. **Click the "Authorize" button** at the top right of Swagger UI
2. **Enter the token** (without "Bearer" prefix)
3. **Click "Authorize"**
4. **Click "Close"**

Now all protected endpoints will automatically include the token in requests.

## Available Endpoints in Swagger

- **Authentication**: Login, Register, Get Current User
- **Milk**: Collections, Dashboard Stats, Today's Price
- **Driver**: Duty Status, Location, Assigned Centers
- **Payment**: Calculate, Create, Get Payments

## Default Test Credentials

### Admin
- Mobile: `9876543210`
- Email: `admin@akshayadairy.com`
- Password: `password123`

### Driver
- Mobile: `9876543211`
- Email: `driver1@akshayadairy.com`
- Password: `password123`

### Vendor
- Mobile: `9876543213`
- Email: `vendor1@akshayadairy.com`
- Password: `password123`

---

**Note**: Make sure the backend server is running and database is set up before testing endpoints.

