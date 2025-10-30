# Dev Admin Interface & Testing Guide

## 📋 Overview

The Dev Admin Interface provides comprehensive database management and testing capabilities for BuildTrack. This allows developers and testers to:
- **Switch between multiple database environments** (development, testing, staging, production)
- **Execute testing scripts** to generate or cleanup mock data
- **Reset databases** to initial state
- **Run health checks** and comprehensive test suites
- **Manage environment configurations** dynamically

---

## 🚀 Quick Start

### 1. Access Dev Admin Interface

**For Admin Users:**
1. Login with an admin account
2. Navigate to **Admin Dashboard**
3. Click **"Dev Admin Tools"** card (red icon with code symbol)

**Direct Navigation:**
- The Dev Admin screen is only accessible to users with **admin role**
- Located at: `src/screens/DevAdminScreen.tsx`

---

## 🗄️ Database Environment Management

### Default Environments

The system comes with a **production** environment pre-configured:
- **Production**: Uses credentials from `.env` file
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Adding New Environments

#### Method 1: Via Dev Admin UI
1. Open **Dev Admin Tools**
2. Tap **"Add"** button in the **Database Environments** section
3. Fill in:
   - **Environment Name** (e.g., `testing`, `staging`, `dev`)
   - **Supabase URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (your Supabase anon/public key)
4. Tap **"Add"**

#### Method 2: Programmatically
```typescript
import { useDatabaseConfig } from '../state/databaseConfigStore';

const { addEnvironment } = useDatabaseConfig();

addEnvironment(
  'testing',
  'https://your-test-project.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Testing environment' // optional description
);
```

### Switching Environments

**Via UI:**
1. Open **Dev Admin Tools**
2. In **Database Environments** section, tap the environment you want to switch to
3. Confirm the switch (production switch requires confirmation)

**Programmatically:**
```typescript
const { switchEnvironment } = useDatabaseConfig();
await switchEnvironment('testing');
```

### Environment Configuration Storage

- Environments are stored in **AsyncStorage** and persist across app restarts
- Active environment is automatically restored on app launch
- Cannot delete the **production** environment
- Cannot delete the currently active environment

---

## 🛠️ Testing Tools

### 1. Generate Mock Tasks

**Purpose:** Create test tasks for the current environment

**Action:** Generates 50 mock tasks with:
- Realistic data (titles, descriptions, categories)
- Random assignments to users in your company
- Various statuses (pending, wip, done, etc.)
- Random priorities (low, medium, high, urgent)
- Random due dates within the next 30 days

**Identification:** All mock tasks have `[TEST]` prefix in title

**Use Case:**
- Testing task filters and sorting
- Performance testing with large datasets
- UI testing with various task states

### 2. Cleanup Mock Tasks

**Purpose:** Remove all mock/test tasks from database

**Action:** Deletes all tasks with `[TEST]` prefix in title

**Safety:** 
- Requires confirmation before deletion
- Only affects mock tasks, not real data

### 3. Reset Database

**⚠️ DANGER: Destructive Operation**

**Purpose:** Clear ALL data and reset database to initial state

**Action:** Deletes:
- All task updates
- All subtasks
- All tasks
- All user project assignments
- All projects

**Preserves:**
- Users
- Companies
- Roles

**Safety:**
- Requires confirmation with destructive alert
- Cannot be undone
- Production warning displayed when on production environment

**Use Case:**
- Starting fresh for a new test cycle
- Cleaning up after extensive testing
- Resetting to baseline state

### 4. Seed Database

**Purpose:** Populate database with realistic sample data

**Action:** Creates:
- 3 sample projects (Office Renovation, Warehouse Construction, Retail Store Fit-Out)
- 30 mock tasks distributed across the projects
- Realistic project statuses and dates

**Requirements:**
- Must be authenticated
- Projects will be scoped to your company

**Use Case:**
- Setting up a demo environment
- Creating baseline data for testing
- Quick test data generation

### 5. Run Comprehensive Tests

**Purpose:** Execute full test suite to verify system integrity

**Tests Included:**
1. Database Connection
2. User Authentication
3. Fetch Companies
4. Fetch Users
5. Fetch Projects
6. Fetch Tasks
7. RLS Policies Active

**Output:** Shows:
- Number of tests passed
- Number of tests failed
- Total test count

**Use Case:**
- Verifying database setup
- Checking after schema changes
- CI/CD health checks

### 6. Database Health Check

**Purpose:** Verify database connection and get statistics

**Metrics Provided:**
- **Status**: `healthy` (<1s), `degraded` (1-3s), `down` (>3s)
- **Tables**: Total number of main tables (7)
- **Users**: Total user count
- **Projects**: Total project count
- **Tasks**: Total task count
- **Response Time**: Query response time in milliseconds

**Use Case:**
- Quick status check
- Performance monitoring
- Troubleshooting slow queries

---

## 📦 Creating a Testing Instance Database

### Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Set project details:
   - **Name**: `buildtrack-testing` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to your location
4. Wait for project creation (~2 minutes)

### Step 2: Setup Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the complete database schema from:
   - `scripts/database-schema-with-roles.sql` (if using roles system)
   - OR `scripts/database-schema.sql` (for basic schema)
4. Paste into SQL Editor
5. Click **"Run"** (⌘/Ctrl + Enter)
6. Verify: Should see "Success. No rows returned"

### Step 3: Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long JWT token)
3. Save these securely

### Step 4: Add to BuildTrack

**Option A: Via Dev Admin UI (Recommended)**
1. Open BuildTrack app
2. Go to **Dev Admin Tools**
3. Tap **"Add"** in Database Environments
4. Enter:
   - Name: `testing`
   - URL: Your Project URL
   - Key: Your anon key
5. Tap **"Add"**
6. Tap the **"testing"** environment to switch to it

**Option B: Via Code**
```typescript
// In any component or script
import { useDatabaseConfig } from './src/state/databaseConfigStore';

const { addEnvironment, switchEnvironment } = useDatabaseConfig.getState();

// Add testing environment
addEnvironment(
  'testing',
  'https://your-testing-project.supabase.co',
  'your-anon-key-here'
);

// Switch to testing
await switchEnvironment('testing');
```

### Step 5: Seed with Initial Data

1. While on the `testing` environment:
2. Open **Dev Admin Tools**
3. Click **"Seed Database"**
4. Wait for completion
5. Verify data was created

---

## 🔐 Environment Security

### Best Practices

1. **Never commit credentials** to git
   - Environments stored in AsyncStorage (local only)
   - `.env` file is gitignored

2. **Use separate databases** for each environment
   - Production: Real customer data
   - Staging: Pre-release testing
   - Testing: Automated tests / manual QA
   - Development: Local development

3. **Restrict production access**
   - Production switch requires confirmation
   - Visual warning when connected to production
   - Consider additional authentication for production access

4. **Regular backups**
   - Use Supabase's backup features
   - Export data before major operations
   - Keep snapshots of testing databases

### Production Safety Features

When connected to **production** environment:
- Red warning banner displayed prominently
- Switch requires explicit confirmation
- All destructive operations show warning
- Recommended: Disable Dev Admin in production builds

---

## 🧪 Testing Workflows

### Workflow 1: Daily Development

```bash
1. Switch to 'development' environment
2. Generate mock tasks (50)
3. Develop features
4. Cleanup mock tasks
5. Switch back to 'testing' for integration tests
```

### Workflow 2: Feature Testing

```bash
1. Switch to 'testing' environment
2. Reset database (clean slate)
3. Seed database (baseline data)
4. Test new feature
5. Run comprehensive tests
6. Verify health check
```

### Workflow 3: QA Cycle

```bash
1. Switch to 'staging' environment
2. Seed database with realistic data
3. Execute test plans
4. Generate mock tasks for edge cases
5. Run comprehensive tests
6. Document findings
7. Cleanup mock tasks
```

### Workflow 4: Performance Testing

```bash
1. Switch to 'testing' environment
2. Generate mock tasks (run multiple times for 200+ tasks)
3. Run health check (measure response time)
4. Test UI performance
5. Reset database when done
```

---

## 📖 API Reference

### DatabaseConfigStore

```typescript
import { useDatabaseConfig } from './src/state/databaseConfigStore';

const {
  activeEnvironment,      // string | null - Currently active environment
  environments,           // Record<string, DatabaseEnvironment> - All environments
  supabaseClient,         // SupabaseClient | null - Active client
  
  switchEnvironment,      // (envName: string) => Promise<void>
  addEnvironment,         // (name, url, key, description?) => void
  removeEnvironment,      // (name: string) => void
  getActiveClient,        // () => SupabaseClient | null
  reinitializeClient,     // () => Promise<void>
} = useDatabaseConfig();
```

### Database Utilities

```typescript
import * as databaseUtils from './src/utils/databaseUtils';

// Generate mock tasks
await databaseUtils.generateMockTasks(50);

// Cleanup mock tasks
await databaseUtils.cleanupMockTasks();

// Reset database (DANGER)
await databaseUtils.resetDatabase();

// Seed with sample data
await databaseUtils.seedDatabase();

// Run comprehensive tests
const results = await databaseUtils.runComprehensiveTests();
// Returns: { passed: number, failed: number, total: number, details: Array }

// Check database health
const health = await databaseUtils.checkDatabaseHealth();
// Returns: { status, tables, users, projects, tasks, responseTime }

// Export data (for backup)
const data = await databaseUtils.exportDatabaseData();
// Returns: { companies, users, projects, tasks }
```

---

## 🐛 Troubleshooting

### Issue: Cannot Connect to Environment

**Symptoms:** "Failed to connect" error when switching

**Solutions:**
1. Verify URL and Key are correct
2. Check network connection
3. Verify Supabase project is active (not paused)
4. Test connection in Supabase Dashboard
5. Check RLS policies allow your user access

### Issue: Tests Failing

**Symptoms:** Comprehensive tests show failures

**Solutions:**
1. Check database schema is up to date
2. Verify RLS policies are configured
3. Ensure user is authenticated
4. Check for missing tables or columns
5. Review Supabase logs for errors

### Issue: Mock Tasks Not Generating

**Symptoms:** "No projects found" error

**Solutions:**
1. Create at least one project first
2. Ensure user is assigned to a project
3. Verify user has company_id set
4. Check projects table has data
5. Seed database to create baseline projects

### Issue: Environment Not Persisting

**Symptoms:** Reverts to production on app restart

**Solutions:**
1. Check AsyncStorage permissions
2. Verify rehydration in logs
3. Clear app data and re-add environment
4. Check for AsyncStorage errors
5. Ensure environment was successfully added

### Issue: Production Warning Not Showing

**Symptoms:** No warning when on production

**Solutions:**
1. Verify `activeEnvironment === 'production'`
2. Check DevAdminScreen rendering logic
3. Ensure production environment is named correctly
4. Review logs for environment switch

---

## 🎯 Best Practices

### 1. Environment Naming

- Use consistent names: `development`, `testing`, `staging`, `production`
- Avoid special characters or spaces
- Keep names lowercase for consistency

### 2. Testing Data

- Always prefix test data with `[TEST]` or similar
- Use cleanup scripts regularly
- Don't mix test and real data in same environment

### 3. Database Operations

- Always backup before destructive operations
- Test in non-production first
- Verify health after major changes
- Monitor response times

### 4. Access Control

- Limit Dev Admin access to admin role only
- Consider additional authentication layer for production
- Log all destructive operations
- Review access logs regularly

### 5. Development Workflow

- Use local/development environment for active development
- Use testing environment for integration tests
- Use staging for pre-release validation
- Minimize production database access

---

## 📝 Change Log

### v1.0 - Initial Release
- Dev Admin Interface created
- Multi-environment support
- Database utilities (generate, cleanup, reset, seed)
- Comprehensive test suite
- Health check system
- Environment persistence

---

## 🔗 Related Documentation

- **[SUPABASE_INTEGRATION_GUIDE.md](SUPABASE_INTEGRATION_GUIDE.md)** - Main Supabase integration guide
- **[SUPABASE_QUICKSTART.md](SUPABASE_QUICKSTART.md)** - Quick setup checklist
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing guide
- **[DATABASE_SCHEMA.sql](scripts/database-schema-with-roles.sql)** - Complete database schema

---

## 💡 Tips & Tricks

### Quick Environment Switch
Create a script for rapid environment switching:
```typescript
// scripts/switchEnv.ts
import { useDatabaseConfig } from './src/state/databaseConfigStore';

const env = process.argv[2] || 'testing';
const { switchEnvironment } = useDatabaseConfig.getState();

switchEnvironment(env)
  .then(() => console.log(`✅ Switched to ${env}`))
  .catch(err => console.error(`❌ Failed: ${err.message}`));
```

### Automated Testing Setup
```typescript
// scripts/setupTestEnv.ts
import * as dbUtils from './src/utils/databaseUtils';

async function setupTestEnvironment() {
  console.log('🧹 Resetting database...');
  await dbUtils.resetDatabase();
  
  console.log('🌱 Seeding data...');
  await dbUtils.seedDatabase();
  
  console.log('🎯 Generating mock tasks...');
  await dbUtils.generateMockTasks(100);
  
  console.log('✅ Test environment ready!');
}

setupTestEnvironment();
```

### Health Monitoring
Set up periodic health checks:
```typescript
import { checkDatabaseHealth } from './src/utils/databaseUtils';

setInterval(async () => {
  const health = await checkDatabaseHealth();
  if (health.status !== 'healthy') {
    console.warn(`⚠️ Database ${health.status}: ${health.responseTime}ms`);
  }
}, 60000); // Check every minute
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase logs in dashboard
3. Check console logs in app
4. Verify database schema is current
5. Test with fresh environment

---

**Last Updated:** October 29, 2025  
**Version:** 1.0.0  
**Maintainer:** BuildTrack Development Team


