# Parity run report

| Target | old |
| Generated | 2026-07-15T02:18:15.952Z |

| ID | Status | Message |
|----|--------|---------|
| T-01 | PASS |  |
| T-02 | PASS | status=in_progress |
| T-03 | PASS |  |
| T-04 | PASS |  |
| T-05 | PASS |  |
| T-06 | PASS |  |
| T-07 | PASS |  |
| T-08 | PASS |  |
| T-09 | PASS |  |
| T-10 | PASS |  |
| T-11 | PASS |  |
| T-12 | PASS |  |
| T-13 | PASS |  |
| T-14 | PASS | DB write allowed via service seed path; UI may still block admin |
| L-01 | PASS |  |
| L-02 | PASS |  |
| L-04 | PASS |  |
| U-01 | PASS |  |
| U-02 | PASS |  |
| U-04 | PASS |  |
| A-01 | PASS |  |
| A-02 | PASS |  |
| A-03 | PASS | is_pending=true after login |
| A-04 | PASS |  |
| A-05 | PASS |  |
| A-06 | PASS |  |
| A-07 | PASS | {"badAuth":[],"badProfile":[]} |
| A-08 | PASS |  |
| A-09 | PASS |  |
| O-01 | PASS |  |
| O-02 | PASS |  |
| O-03 | PASS |  |
| R-01 | PASS |  |
| R-02 | PASS | unread=0 |
| R-03 | PASS |  |
| R-04 | PASS |  |
| C-01 | SKIP | Could not find the table 'public.roles' in the schema cache |
| C-02 | SKIP | Could not find the table 'public.roles' in the schema cache |
| Z-01 | PASS |  |
| Z-02 | PASS |  |
| L-03 | PASS |  |
| U-03 | PASS | Covered via U-01/U-02 status update + parent lifecycle T-02/T-03/T-07 |
| L-APPROVE | PASS | Tristan approve covered in T-06; Herman denied is app-policy |
| L-REJECT | PASS | Admin reject covered in A-09 |
| L-CPROJ | PASS | Admin create project covered in P-02 |
| P-01 | PASS |  |
| P-02 | PASS |  |
| P-03 | PASS |  |
| P-05 | PASS |  |
| P-04 | PASS |  |
| P-06 | PASS |  |
| P-07 | PASS | ["15d5e537-abf5-4796-a783-036f3780b79c"] |
| P-08 | PASS |  |
| P-09 | PASS | network toggle blocks DB read (app local fallback separate) |
| L-HARBOR | PASS |  |
| L-PENT | PASS |  |
| L-matrix-anon | PASS | OLD allows anon |
| F-01 | PASS | bucket=buildtrack-files |
| F-02 | PASS | https://lhfvrsckevylrnmkfjeb.supabase.co/storage/v1/object/public/buildtrack-files/09a33602-20b7-492c-b500-f797c810c0ea/tasks/task-1784081891584-675575/1784081893147-photo%20name%20(1)%20&%20#2.txt |
| F-04 | PASS | 09a33602-20b7-492c-b500-f797c810c0ea/tasks/task-1784081891584-675575/1784081893147-photo name (1) & #2.txt |
| F-03 | PASS |  |
| S-01 | PASS |  |
| S-02 | PASS |  |
| S-03 | PASS |  |
| S-04 | SKIP | roles absent — SKIP allowed |
| S-05 | PASS | {"hasAssignedToArray":true,"hasPrimaryAssignee":true,"hasCurrentStatus":true,"hasStatus":true,"hasLocationOnSite":true,"hasTags":true,"hasAssignments":false} |
| S-06 | PASS | OLD allows anon read (baseline / known risk) |
| S-07 | SKIP | Run SUPABASE_OPERATIONS_RUNBOOK pg_policies query via psql |
