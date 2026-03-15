# 🧀 Akshaya Dairy - Backend API

Backend API server for Akshaya Dairy Management System built with Node.js, Express.js, TypeScript, and PostgreSQL.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Database](#database)

## ✨ Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Admin, Driver, and Vendor roles
- **Milk Collection Management** - Record and track milk collections
- **Driver Management** - GPS tracking, duty status, assignments
- **Payment Processing** - Monthly payments, advances, adjustments
- **Real-time Statistics** - Dashboard analytics
- **Swagger Documentation** - Interactive API documentation
- **Input Validation** - JOI validation for all endpoints
- **Error Handling** - Comprehensive error handling and logging

## 🛠 Technology Stack

- **Node.js** + **Express.js**
- **TypeScript**
- **PostgreSQL** with **Knex.js** (Query Builder)
- **JWT** (JSON Web Tokens)
- **JOI** (Validation)
- **Swagger** (API Documentation)
- **Winston** (Logging)
- **bcrypt** (Password Hashing)

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)
- npm or yarn

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb akshaya_dairy
# Or using psql:
# psql -U postgres
# CREATE DATABASE akshaya_dairy;
```

### 3. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=akshaya_dairy
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
```

### 4. Run Migrations and Seeds

```bash
# Run migrations
npm run migrate

# Run seeds (creates sample data)
npm run seed

# Reset database (rollback + migrate + seed)
npm run db:reset
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on http://localhost:3000

## 📚 API Documentation

Once the server is running, access Swagger documentation at:
- **Swagger UI**: http://localhost:3000/api-docs

### Main API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user (Protected)

#### Milk Collections
- `POST /api/milk/collections` - Create milk collection (Protected)
- `GET /api/milk/collections` - Get collections (Protected)
- `GET /api/milk/dashboard/stats` - Dashboard statistics (Protected)
- `GET /api/milk/price/today` - Get today's milk price (Protected)

#### Driver Management
- `PATCH /api/driver/duty-status` - Update duty status (Driver only)
- `POST /api/driver/location` - Save GPS location (Driver only)
- `GET /api/driver/location/current` - Get current location (Protected)
- `GET /api/driver/location/history` - Get location history (Protected)
- `GET /api/driver/centers` - Get assigned centers (Driver only)
- `GET /api/driver/all` - Get all drivers (Admin only)

#### Payments
- `GET /api/payment` - Get payments (Protected)
- `POST /api/payment` - Create payment (Admin only)
- `GET /api/payment/calculate` - Calculate monthly payment (Admin only)
- `PATCH /api/payment/:id/status` - Update payment status (Admin only)

### Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database

### Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

### Seeds

```bash
# Run all seeds
npm run seed

# Run specific seed
npm run seed:users
```

### Database Schema

The system includes 12 main tables:
- `users` - User accounts
- `dairy_centers` - Dairy center information
- `drivers` - Driver details
- `driver_locations` - GPS tracking
- `milk_collections` - Milk collection records
- `milk_prices` - Daily pricing
- `payments` - Payment records
- `driver_salaries` - Driver salary management
- `notifications` - System notifications
- `activity_logs` - Audit trail
- `driver_center_assignments` - Driver assignments
- `milk_plants` - Milk plant deliveries

## 🔑 Default Credentials

After running seeds:

### Admin
- **Mobile/Email**: `9876543210` or `admin@akshayadairy.com`
- **Password**: `password123`

### Driver 1
- **Mobile/Email**: `9876543211` or `driver1@akshayadairy.com`
- **Password**: `password123`

### Vendor 1
- **Mobile/Email**: `9876543213` or `vendor1@akshayadairy.com`
- **Password**: `password123`

## 📝 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run seed` - Run database seeds
- `npm run db:reset` - Reset database (rollback + migrate + seed)
- `npm test` - Run tests

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation with JOI
- CORS configuration
- SQL injection protection (Knex parameterized queries)
- Environment variable management

## 📊 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database connection
│   │   └── swagger.ts   # Swagger setup
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── milk.controller.ts
│   │   ├── driver.controller.ts
│   │   └── payment.controller.ts
│   ├── middleware/      # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/          # TypeScript types/interfaces
│   │   └── types.ts
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── milk.routes.ts
│   │   ├── driver.routes.ts
│   │   └── payment.routes.ts
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   ├── milk.service.ts
│   │   ├── driver.service.ts
│   │   └── payment.service.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   └── validation.ts
│   └── app.ts           # Express app setup
├── database/
│   ├── migrations/      # Knex migrations
│   └── seeds/           # Sample data
├── logs/                # Application logs
├── knexfile.js          # Knex configuration
├── tsconfig.json        # TypeScript configuration
├── nodemon.json         # Nodemon configuration
└── package.json         # Dependencies
```

## 🧪 Testing

```bash
npm test
```

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ for Akshaya Dairy**

