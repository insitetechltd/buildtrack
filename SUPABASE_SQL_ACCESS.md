# Running SQL Directly to Supabase

## Overview
To run SQL queries directly against your Supabase database, you have several options. Each requires different credentials and access levels.

## Option 1: Supabase Dashboard SQL Editor (Recommended - Easiest)

### What You Need:
- **Supabase account access** (the account that created/manages the project)
- **Project access** (you must be a member of the Supabase project)

### Steps:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Paste your SQL query
5. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Advantages:
- ✅ No additional credentials needed
- ✅ Full database access (uses service role key internally)
- ✅ Visual query results
- ✅ Query history saved
- ✅ Can save queries for later

### Limitations:
- ❌ Requires web browser access
- ❌ Must have project member access

---

## Option 2: Supabase CLI

### What You Need:
1. **Supabase CLI** installed
2. **Project Reference ID** (found in Project Settings → General)
3. **Access Token** (from Supabase Dashboard → Account Settings → Access Tokens)

### Installation:
```bash
# Install Supabase CLI
npm install -g supabase

# Or using Homebrew (Mac)
brew install supabase/tap/supabase
```

### Setup:
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Or use environment variables
export SUPABASE_ACCESS_TOKEN=your_access_token
export SUPABASE_DB_PASSWORD=your_database_password
```

### Running SQL:
```bash
# Run a SQL file
supabase db execute --file check_sam_tasks.sql

# Run inline SQL
supabase db execute --sql "SELECT COUNT(*) FROM tasks;"
```

### Advantages:
- ✅ Can be automated/scripted
- ✅ Works from command line
- ✅ Good for CI/CD pipelines

### Limitations:
- ❌ Requires CLI installation
- ❌ Needs access token setup

---

## Option 3: Direct Database Connection (PostgreSQL)

### What You Need:
1. **Database Host** (found in Project Settings → Database → Connection string)
2. **Database Password** (found in Project Settings → Database → Database password)
3. **Database Name** (usually `postgres`)
4. **Port** (usually `5432`)

### Connection String Format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### Using psql (PostgreSQL CLI):
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### Using pgAdmin or DBeaver:
- Use the connection string above
- Or enter credentials manually:
  - Host: `db.[YOUR-PROJECT-REF].supabase.co`
  - Port: `5432`
  - Database: `postgres`
  - Username: `postgres`
  - Password: `[YOUR-PASSWORD]`

### Advantages:
- ✅ Full PostgreSQL access
- ✅ Can use any PostgreSQL client
- ✅ Supports transactions, stored procedures, etc.

### Limitations:
- ❌ Requires database password (separate from API keys)
- ❌ More complex setup
- ❌ Direct database access (bypasses Supabase security)

---

## Option 4: Using Supabase JavaScript Client (Programmatic)

### What You Need:
1. **Supabase URL** (`EXPO_PUBLIC_SUPABASE_URL`)
2. **Service Role Key** (NOT the anon key - found in Project Settings → API → service_role key)

⚠️ **WARNING**: Service role key bypasses Row Level Security (RLS). Only use in secure server-side code, never in client-side code!

### Example:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Service role key, not anon key
);

// Execute raw SQL
const { data, error } = await supabase.rpc('exec_sql', {
  query: 'SELECT COUNT(*) FROM tasks WHERE assigned_to @> ARRAY[\'user-id\']::uuid[];'
});
```

### Advantages:
- ✅ Can be integrated into your app
- ✅ Programmatic access

### Limitations:
- ❌ Requires service role key (security risk if exposed)
- ❌ Limited SQL execution (must use RPC functions)
- ❌ Not recommended for direct SQL queries

---

## Finding Your Credentials

### From Supabase Dashboard:

1. **Project URL & Anon Key**:
   - Go to **Settings** → **API**
   - Copy `Project URL` (this is your `EXPO_PUBLIC_SUPABASE_URL`)
   - Copy `anon` `public` key (this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

2. **Service Role Key** (⚠️ Keep Secret!):
   - Go to **Settings** → **API**
   - Copy `service_role` `secret` key
   - ⚠️ **NEVER** expose this in client-side code!

3. **Database Password**:
   - Go to **Settings** → **Database**
   - Click **Reset Database Password** if you don't have it
   - ⚠️ Save this securely - you can't view it again!

4. **Project Reference ID**:
   - Go to **Settings** → **General**
   - Copy **Reference ID** (used for CLI and direct connections)

5. **Database Connection String**:
   - Go to **Settings** → **Database**
   - Copy **Connection string** (URI format)
   - Or construct: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

---

## Recommended Approach for Your Use Case

For checking Sam's tasks, I recommend:

### **Option 1: Supabase Dashboard SQL Editor** (Easiest)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the queries from `check_sam_tasks.sql`
4. Paste and run

This requires no additional setup and gives you full access.

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Anon Key**: Safe for client-side use, but respects Row Level Security (RLS)
2. **Service Role Key**: Bypasses RLS - **NEVER** use in client-side code!
3. **Database Password**: Full database access - keep secure!
4. **Access Tokens**: For CLI access - treat like passwords

---

## Quick Reference

| Method | Credentials Needed | Best For |
|--------|-------------------|----------|
| Dashboard SQL Editor | Supabase account | Quick queries, exploration |
| Supabase CLI | Access token | Automation, scripts |
| Direct PostgreSQL | Database password | Advanced queries, migrations |
| JavaScript Client | Service role key | Server-side programmatic access |

---

## Troubleshooting

### "Permission denied" errors:
- Check if you're using the correct key (anon vs service role)
- Verify Row Level Security (RLS) policies aren't blocking access
- Ensure you have project member access

### "Connection refused" errors:
- Verify the project reference ID is correct
- Check if database password is correct
- Ensure your IP isn't blocked (check Database → Network Restrictions)

### "Query timeout" errors:
- Optimize your query (add indexes, limit results)
- Check database performance in Dashboard → Database → Performance

---

## Related Files
- `check_sam_tasks.sql`: SQL queries for checking Sam's tasks
- `SAM_TASKS_CHECK.md`: Documentation for the queries
- `src/api/supabase.ts`: Supabase client configuration

