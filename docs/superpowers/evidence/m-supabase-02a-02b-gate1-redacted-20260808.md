# M-SUPABASE-02a/02b Gate 1 — Redacted Live SQL Evidence (2026-08-08)

Source: `WS_SUPABASE_01_READONLY_AUDIT.sql` via Option A pooler `aws-1-ap-south-1.pooler.supabase.com:6543`.
Secrets: none. UUIDs/emails/<PROJECT_REF> redacted. Password never stored in this file.

## 7/7 Section Outputs

```
    section    
---------------
 PUBLIC_TABLES
(1 row)

        table_name        
--------------------------
 companies
 project_locations
 projects
 projects_location_backup
 task_activities
 task_delegation_history
 task_edit_history
 task_read_status
 task_status_history
 task_updates
 tasks
 user_project_assignments
 users
(13 rows)

        section        
-----------------------
 TASK_LOCATION_COLUMNS
(1 row)

   column_name    | data_type | is_nullable 
------------------+-----------+-------------
 project_id       | uuid      | YES
 assigned_by      | uuid      | YES
 location         | jsonb     | YES
 location_on_site | text      | YES
(4 rows)

            section             
--------------------------------
 PROJECT_LOCATIONS_TABLE_EXISTS
(1 row)

 project_locations_table_count 
-------------------------------
                             1
(1 row)

          section          
---------------------------
 PROJECT_LOCATIONS_COLUMNS
(1 row)

 column_name |        data_type         | is_nullable 
-------------+--------------------------+-------------
 id          | uuid                     | NO
 project_id  | uuid                     | NO
 label       | text                     | NO
 created_by  | uuid                     | YES
 created_at  | timestamp with time zone | NO
 updated_at  | timestamp with time zone | NO
(6 rows)

         section          
--------------------------
 TASK_LOCATION_JSON_TYPES
(1 row)

 json_type | row_count 
-----------+-----------
 null      |        97
(1 row)

             section              
----------------------------------
 TASK_LOCATION_ON_SITE_POPULATION
(1 row)

 with_location_on_site | without_location_on_site 
-----------------------+--------------------------
                    25 |                       72
(1 row)

            section             
--------------------------------
 TASK_LOCATION_LABEL_CANDIDATES
(1 row)

              project_id              | candidate_count |     first_label_sample     |     last_label_sample      
--------------------------------------+-----------------+----------------------------+----------------------------
 <REDACTED_UUID> |              18 | Live Task Core Site Zone A | Live Task Core Site Zone A
 <REDACTED_UUID> |               7 | Home                       | Office
(2 rows)

          section          
---------------------------
 PROJECT_ASSIGNMENT_COUNTS
(1 row)

              project_id              | assignment_count | active_assignment_count 
--------------------------------------+------------------+-------------------------
 <REDACTED_UUID> |                5 |                       5
 <REDACTED_UUID> |                4 |                       4
 <REDACTED_UUID> |                4 |                       4
 <REDACTED_UUID> |                4 |                       4
 <REDACTED_UUID> |                3 |                       3
 <REDACTED_UUID> |                2 |                       2
 <REDACTED_UUID> |                1 |                       1
(7 rows)
```

## Anon SELECT headline counts

### Pre-remediation (Gate 1 follow-on, role=anon inside transaction)

| table | anon SELECT row_count |
|---|---:|
| companies | 5 |
| users | 29 |
| projects | 19 |
| tasks | 97 |
| task_activities | 257 |
| task_read_status | 2073 |
| project_locations | 0 |

Notes: `project_locations` already RLS-blocked (0). Remaining 6 tables leaked rows to `anon` (F-001 confirmed live 2026-08-08). `users.id → auth.users` FK was **absent** pre-02b. Helper functions `user_has_project_access` / `user_is_pending` / `user_system_permission` absent on live tenant.

### Post-02a remediation close proof

| table | anon SELECT result |
|---|---|
| companies | permission_denied (PASS) |
| users | permission_denied (PASS) |
| projects | permission_denied (PASS) |
| tasks | permission_denied (PASS) |
| task_activities | permission_denied (PASS) |
| task_read_status | permission_denied (PASS) |
| project_locations | permission_denied (PASS) |

Mechanism: `REVOKE ALL … FROM anon` + RLS enabled + restrictive `anon_block_all` USING false on all 7.

### 02b close proof

- Constraint `users_id_fkey_auth_users`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID` (state=NOT_VALID; VALIDATE deferred).
- Policy `users_self_write`: INSERT TO authenticated WITH CHECK (id = auth.uid()) present.
- Signup parity harness: not present under `src/__tests__/parity` for this gate; N/A this cycle.

