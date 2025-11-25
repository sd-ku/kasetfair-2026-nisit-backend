# Kaset Fair 2026 Backend

Backend API for Kaset Fair 2026 built with NestJS, Prisma, and PostgreSQL.

---

## 🚀 Production Deployment

### Prerequisites
- **Docker** & **Docker Compose**
- `.env` file with production configuration

### Step 1: Setup Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://appuser:apppass@db:5432/appdb?schema=public"
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
POSTGRES_PORT=5432

# Application
NODE_ENV=production
PORT=8000

# JWT & Auth (use strong secrets in production!)
JWT_SECRET=your-production-jwt-secret-here
JWT_EXPIRES_IN=7d

# AWS S3
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# CORS
FRONTEND_URL=https://ksf.sa.ku.ac.th
```

### Step 2: Build and Start Services

```bash
# Build and start database and backend
docker compose up -d --build db backend
```

### Step 3: Run Database Migrations

```bash
# Apply all pending migrations
docker compose exec backend npx prisma migrate deploy --schema=prisma/schema.prisma
```

### Step 4: Seed Initial Data

```bash
# Seed database with initial data (dormitories, questions, consent text)
docker compose exec backend npx prisma db seed
```

**Expected output:**
```
🌱 Starting database seeding...

📝 Seeding store question templates...
✅ Seeded store question templates successfully

🏠 Seeding dormitory types...
✅ Seeded dormitory types successfully

📄 Seeding consent text...
✅ Seeded consent text successfully

🎉 Database seeding completed!
```

### Step 5: Verify Deployment

```bash
# Check if all services are running
docker compose ps

# View backend logs
docker compose logs -f backend

# List database tables
docker compose exec db psql -U appuser -d appdb -c "\dt"

# Check seeded data (optional)
docker compose exec db psql -U appuser -d appdb -c "SELECT * FROM dormitory_type LIMIT 10;"
```

### Services URLs

- **Backend API**: https://api-ksf.sa.ku.ac.th
- **PostgreSQL**: localhost:5432

---

## 💻 Development Setup

### Prerequisites
- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+
- **Docker** & **Docker Compose**

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment Variables

Create a `.env` file:

```env
# Database - use 'localhost' for local development
DATABASE_URL="postgresql://appuser:apppass@localhost:5432/appdb?schema=public"
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
POSTGRES_PORT=5432

# Application
NODE_ENV=development
PORT=8000

# JWT & Auth
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=1d

# AWS S3
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

### 3. Start Database Only

```bash
# Start PostgreSQL and pgAdmin
docker compose up -d db pgadmin
```

### 4. Generate Prisma Client

```bash
pnpm run prisma:generate
```

### 5. Run Migrations

```bash
pnpm run prisma:migrate
```

### 6. Seed Database

```bash
npx tsx prisma/seed.ts
```

### 7. Start Backend

```bash
# Development mode with hot reload
pnpm run start:dev

# Or debug mode
pnpm run start:debug
```

### 8. Access Services

- **Backend API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/api/docs
- **PostgreSQL**: localhost:5432
- **pgAdmin**: http://localhost:5050

---

## 🗄️ Database Commands

### View Tables

```bash
# List all tables
docker compose exec db psql -U appuser -d appdb -c "\dt"

# Describe table structure
docker compose exec db psql -U appuser -d appdb -c "\d nisit"
docker compose exec db psql -U appuser -d appdb -c "\d store"
```

### Query Data

```bash
# Count records
docker compose exec db psql -U appuser -d appdb -c "SELECT COUNT(*) FROM nisit;"
docker compose exec db psql -U appuser -d appdb -c "SELECT COUNT(*) FROM store;"

# View data
docker compose exec db psql -U appuser -d appdb -c "SELECT * FROM nisit LIMIT 10;"
docker compose exec db psql -U appuser -d appdb -c "SELECT * FROM dormitory_type;"
```

### Migration Commands

```bash
# Check migration status
docker compose exec backend npx prisma migrate status --schema=prisma/schema.prisma

# Create new migration (development only)
pnpm run prisma:migrate

# Apply migrations (production)
docker compose exec backend npx prisma migrate deploy --schema=prisma/schema.prisma

# Reset database (⚠️ WARNING: Deletes all data!)
docker compose exec backend npx prisma migrate reset --schema=prisma/schema.prisma
```

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Application port | `8000` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | `1d` or `7d` |
| `AWS_REGION` | AWS region for S3 | `ap-southeast-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `AWS_S3_BUCKET` | S3 bucket name | - |
| `FRONTEND_URL` | Frontend URL for CORS | `https://ksf.sa.ku.ac.th` |

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# Check PostgreSQL logs
docker compose logs db

# Test connection
docker compose exec db psql -U appuser -d appdb
```

### Migration Errors

```bash
# Check migration status
docker compose exec backend npx prisma migrate status

# Mark migration as applied (if needed)
docker compose exec backend npx prisma migrate resolve --applied "migration_name"
```

### Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :8000

# Change port in .env file
PORT=8001
```

### Docker Build Fails

```bash
# Clean and rebuild
docker compose down -v
docker system prune -a
docker compose build --no-cache
docker compose up -d
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma Client
docker compose exec backend npx prisma generate --schema=prisma/schema.prisma

# Or locally
pnpm run prisma:generate
```

---

## 📚 Common Commands

```bash
# View all running containers
docker compose ps

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v

# View backend logs
docker compose logs -f backend

# Access backend container shell
docker compose exec backend sh

# Access PostgreSQL shell
docker compose exec db psql -U appuser -d appdb

# Run tests (local)
pnpm test

# Run linter (local)
pnpm run lint

# Format code (local)
pnpm run format
```

---

## 📝 Important Notes

### Database URL Format
- **Inside Docker**: Use `@db:5432` (service name)
- **Outside Docker**: Use `@localhost:5432` (host machine)

### Swagger Documentation
- **Development**: Available at `/api/docs`
- **Production**: Disabled for security

### Security
- Never commit `.env` files to version control
- Use strong passwords and secrets in production
- Always backup database before running migrations

### Seeded Data
The seed script populates:
- **Store Question Templates** (3 questions about waste and equipment)
- **Dormitory Types** (26 dormitories including หอพัก 1-24, off-campus, and others)
- **Consent Text** (Terms and conditions for Kaset Fair 2026)