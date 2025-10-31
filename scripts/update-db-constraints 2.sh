#!/bin/bash

# Quick script to update Supabase database constraints
# This script will update the task status constraints to allow 'rejected' instead of 'blocked'

echo "🔄 Updating Supabase database constraints..."

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
  echo "❌ Error: .env file not found"
  echo "Please create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

# Supabase configuration from environment
SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
API_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$API_KEY" ]; then
  echo "❌ Error: Missing environment variables"
  echo "Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file"
  exit 1
fi

# SQL commands to update constraints
SQL_COMMANDS=(
  "ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_current_status_check;"
  "ALTER TABLE tasks ADD CONSTRAINT tasks_current_status_check CHECK (current_status IN ('not_started', 'in_progress', 'rejected', 'completed'));"
  "ALTER TABLE sub_tasks DROP CONSTRAINT IF EXISTS sub_tasks_current_status_check;"
  "ALTER TABLE sub_tasks ADD CONSTRAINT sub_tasks_current_status_check CHECK (current_status IN ('not_started', 'in_progress', 'rejected', 'completed'));"
  "ALTER TABLE task_updates DROP CONSTRAINT IF EXISTS task_updates_status_check;"
  "ALTER TABLE task_updates ADD CONSTRAINT task_updates_status_check CHECK (status IN ('not_started', 'in_progress', 'rejected', 'completed'));"
)

echo "📝 Executing SQL commands..."

for sql in "${SQL_COMMANDS[@]}"; do
  echo "Executing: $sql"
  
  response=$(curl -s -X POST \
    "$SUPABASE_URL/rest/v1/rpc/exec" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": \"$sql\"}")
  
  if echo "$response" | grep -q "error"; then
    echo "❌ Error executing SQL: $response"
  else
    echo "✅ Success"
  fi
done

echo "🎉 Database constraints updated!"
echo ""
echo "You can now test the 'rejected' status functionality."
