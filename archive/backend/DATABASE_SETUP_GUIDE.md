# Database Setup Guide for Tests

## Current Status

✅ **Syntax errors fixed** - All TypeScript syntax errors have been resolved
✅ **Docker database started** - PostgreSQL is running in Docker container `scrolluniversity-test-db`
⚠️ **Schema issues** - The Prisma schema has duplicate models and needs cleanup

## Quick Start for Tests

### Option 1: Use Docker Database (Recommended for Integration Tests)

1. **Start the database:**
```bash
cd backend
docker-compose -f docker-compose.test.yml up -d
```

2. **Wait for database to be ready:**
```bash
docker exec scrolluniversity-test-db pg_isready -U scrolluser -d scrolluniversity
```

3. **Fix schema duplicates** (needs manual cleanup):
   - Remove duplicate `ScrollCoinTransaction` model
   - Remove duplicate `LectureType` enum
   - Remove duplicate `Scholarship` model
   - Remove duplicate `ScholarshipApplication` model
   - Remove duplicate `ApplicationStatus` enum
   - Fix `scholarshipId` reference in line 1011

4. **Push schema to database:**
```bash
npx prisma db push --skip-generate
```

5. **Run tests:**
```bash
npm test
```

### Option 2: Use Mocked Prisma (Recommended for Unit Tests)

The test setup already mocks external services. For pure unit tests that don't need database:

1. **Run tests with mocked database:**
```bash
npm test -- --testPathPattern="unit"
```

## Database Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** scrolluniversity
- **User:** scrolluser
- **Password:** scrollpass
- **Connection String:** `postgresql://scrolluser:scrollpass@localhost:5432/scrolluniversity`

## Stopping the Database

```bash
cd backend
docker-compose -f docker-compose.test.yml down
```

## Removing Database Data

```bash
cd backend
docker-compose -f docker-compose.test.yml down -v
```

## Current Test Status

The NotificationService tests are ready to run once the database schema is fixed. All syntax errors have been resolved:

- ✅ Fixed merge conflict markers in auth.ts
- ✅ Fixed missing bracket in ReviewWorkflowService.ts
- ✅ Fixed method name spacing in DailyDevotionService.ts
- ✅ Fixed property name spacing in prophetic-checkin.types.ts
- ✅ Fixed parameter mismatches in AdmissionsAnalyticsService.ts
- ✅ Fixed parameter mismatches in CommitteeCoordinator.ts

## Next Steps

1. Clean up duplicate models in `backend/prisma/schema.prisma`
2. Run `npx prisma db push --skip-generate`
3. Run tests with `npm test`

All code now compiles without syntax errors! 🎉
