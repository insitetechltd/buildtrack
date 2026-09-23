# Phase 2 — P01–P10 dual-target matrix

- appSha: `89a9aa3261cd3571a49d341132f37742b03e4a2a`
- DEV ref: `zusulknbhaumougqckec` (OLD control)
- PROD ref: `jcnzjigxgkzhjsaekoqz` (NEW QA)
- generated: 2026-09-23T10:39:39.831908+00:00

| Case | DEV | PROD | PROD classification |
|---|---|---|---|
| F6 | PASS | PASS | PASS |
| O4 | FAIL | FAIL | Fixture/data |
| P01 | PASS | PASS | PASS |
| P02 | PASS | PASS | PASS |
| P02j | PASS | PASS | PASS |
| P03 | PASS | PASS | PASS |
| P04 | PASS | PASS | PASS |
| P04j | PASS | PASS | PASS |
| P05 | PASS | PASS | PASS |
| P05j | PASS | PASS | PASS |
| P06 | PASS | PASS | PASS |
| P07 | PASS | PASS | PASS |
| P08 | PASS | PASS | PASS |
| P08j | PASS | PASS | PASS |
| P09 | PASS | PASS | Human-GO-skip |
| P10 | PASS | PASS | PASS |
| P10a | PASS | PASS | PASS |
| P10j | PASS | PASS | PASS |
| P11 | PASS | PASS | PASS |

## Details
### DEV (`zusulknbhaumougqckec`)
- **P01** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — user=john.managera@test.com acl=member company=2f13d7d6-5c26-439b-90c0-b39bd839e66b
- **P02** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — http=401 error='not_authenticated'
- **P03** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — project=ca5d8e34-cbca-4c89-9085-19fa717ffd30 upa_http=201 body=[{'id': 'eb99ca87-bf7c-4915-925f-32d408089612', 'user_id': 'efaf817c-4502-4fd0-a2f4-2723c82b52bd', 'project_id': 'ca5d8e34-cbca-4c89-9085-19fa717ffd30', 'project_role': 'lead_project_manager', 'assigned_by': 'efaf817c-4502-4fd0-a2f4-2723c82b52bd', 'is_active': True, 'created_at': '2026-09-23T10:39:08.085782+00:00', 'updated_at': '2026-09-23T10:39:08.085782+00:00'}] ts_pref=created_at
- **P04** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — app-shaped rejected (400) then strip+junction OK task=3a38e060-bc56-44fe-9173-5bd6cc2af1f6
- **P05** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — status_http=200 task_files_http=201
- **P06** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — task=3a38e060-bc56-44fe-9173-5bd6cc2af1f6 submitted→approved
- **P07** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — primary_http=201 delegated_http=409
- **P11** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — report=719986d1-ae8f-43f4-ad70-88f7c21d8082 activity_http=201 resolve_http=200
- **P08** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — acl_write_http=200
- **P09** [Human-GO-skip] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — SKIPPED — live Checkout requires Human GO per charge; QA company only
- **P10a** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — billing-subscription-status anon http=401 error='not_authenticated'
- **P10** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — cancel-subscription anon http=401 error='not_authenticated'
- **P02j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — jwt invite-user http=400 error='invalid_payload'
- **P04j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — app-shaped rejected (400) then strip+junction OK task=81fcf43b-990a-41b1-8437-efe231cbae73
- **P05j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — status=200 files=201 stars=201
- **P08j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — jwt acl_write http=200
- **P10j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — jwt billing-subscription-status http=200 error=None
- **F6** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — subject=alice.workera1@test.com foreign_task=17acff11-2723-4c72-b9df-a60b62afd4e3 other=276c0714-ba27-4136-9dbc-9dc603a67c99 read_http=200 patch_http=200 insert_http=403 leaked=False
- **O4** [RLS-open] plane=DEV ref=zusulknbhaumougqckec sha=89a9aa32 — reporting: demote_http=200 before=admin after=member unchanged=False body=[{'id': 'cce3ec07-4820-46ac-98bc-ec3d3cf9fe73', 'name': 'O4 Sole Admin', 'email': 'o4-sole-p-matrix-20260923103904-f36bcc7a@example.invalid', 'phone': '', 'company_id': '947b4800-0af3-4b47-a3a3-58fa993eae16', 'position': '', 'system_permission': 'member', 'user_type': 'company_user', 'last_selected_project_id': None, 'is_pending': False, 'approved_by': None, 'approved_at': None, 'created_at': '2026-09-23T10:39:20.653117+00:00', 'updated_at': '2026-09-23T10:39:21.237713+00:00', 'deleted_at': None, 'invite_sign_in_link': None, 'must_set_password': False, 'is_active': True, 'deployable_seat': 'worker'}] OWED: DB last-admin guard

### PROD (`jcnzjigxgkzhjsaekoqz`)
- **P01** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — user=sara@insitetest.com acl=admin company=27c0612d-fb8e-4444-bcf4-545228a763a8
- **P02** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — http=401 error='not_authenticated'
- **P03** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — project=bc00afae-d71f-4a60-9ed8-817dd8ad2918 upa_http=201 body=[{'id': '8eb5ed86-132c-47d7-84c6-84d140f8f6b0', 'user_id': '1dd31ee0-7f42-42b2-9a6b-76cea9f3579f', 'project_id': 'bc00afae-d71f-4a60-9ed8-817dd8ad2918', 'project_role': 'lead_project_manager', 'assigned_by': '1dd31ee0-7f42-42b2-9a6b-76cea9f3579f', 'is_active': True, 'created_at': '2026-09-23T10:39:25.089675+00:00', 'updated_at': '2026-09-23T10:39:25.089675+00:00'}] ts_pref=created_at
- **P04** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — app-shaped rejected (400) then strip+junction OK task=8178d8a5-a916-46f3-bfa7-e635d02274a0
- **P05** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — status_http=200 task_files_http=201
- **P06** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — task=8178d8a5-a916-46f3-bfa7-e635d02274a0 submitted→approved
- **P07** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — primary_http=201 delegated_http=201
- **P11** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — report=a1aee336-0a1d-4c29-bb8f-c41144c24575 activity_http=201 resolve_http=200
- **P08** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — acl_write_http=200
- **P09** [Human-GO-skip] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — SKIPPED — live Checkout requires Human GO per charge; QA company only
- **P10a** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — billing-subscription-status anon http=401 error='not_authenticated'
- **P10** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — cancel-subscription anon http=401 error='not_authenticated'
- **P02j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — jwt invite-user http=400 error='invalid_payload'
- **P04j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — app-shaped rejected (400) then strip+junction OK task=32734b16-96db-47a7-9a19-2ba1ba8491e1
- **P05j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — status=200 files=201 stars=201
- **P08j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — jwt acl_write http=200
- **P10j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — jwt billing-subscription-status http=500 error="No such subscription: 'sub_manual_app_review_insitetest_pro'"
- **F6** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — subject=john@insitetest.com foreign_task=3c046b0a-3236-4a5c-8fcf-f00035272396 other=4d138961-4aff-4ea9-bc3d-b6b3814256e3 read_http=200 patch_http=200 insert_http=403 leaked=False
- **O4** [Fixture/data] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=89a9aa32 — reporting: sole-admin precondition failed count=0
