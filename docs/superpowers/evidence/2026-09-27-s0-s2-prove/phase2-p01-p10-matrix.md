# Phase 2 — P01–P10 dual-target matrix

- appSha: `7d65e97d434bc97cfeaa8647f9a3f1ac155c24ed`
- DEV ref: `zusulknbhaumougqckec` (OLD control)
- PROD ref: `jcnzjigxgkzhjsaekoqz` (NEW QA)
- generated: 2026-09-27T11:42:27.101112+00:00

| Case | DEV | PROD | PROD classification |
|---|---|---|---|
| F6 | PASS | PASS | PASS |
| F7 | PASS | PASS | PASS |
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
- **P01** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — user=john.managera@test.com acl=member company=2f13d7d6-5c26-439b-90c0-b39bd839e66b
- **P02** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — http=401 error='not_authenticated'
- **P03** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — project=03c19732-14fe-462d-bae0-bffb67833da5 upa_http=201 body=[{'id': 'eefc511a-b826-415a-beea-b2280e753fc7', 'user_id': 'efaf817c-4502-4fd0-a2f4-2723c82b52bd', 'project_id': '03c19732-14fe-462d-bae0-bffb67833da5', 'project_role': 'lead_project_manager', 'assigned_by': 'efaf817c-4502-4fd0-a2f4-2723c82b52bd', 'is_active': True, 'created_at': '2026-09-27T11:41:52.728187+00:00', 'updated_at': '2026-09-27T11:41:52.728187+00:00'}] ts_pref=created_at
- **P04** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — app-shaped rejected (400) then strip+junction OK task=13bf30d0-e6c9-417e-9230-48ae56945bf6
- **P05** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — status_http=200 task_files_http=201
- **P06** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — task=13bf30d0-e6c9-417e-9230-48ae56945bf6 submitted→approved
- **P07** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — primary_http=201 delegated_http=409
- **P11** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — report=cc1b408d-69fb-48ae-871f-80ab9fc8758a activity_http=201 resolve_http=200
- **P08** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — acl_write_http=200
- **P09** [Human-GO-skip] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — SKIPPED — live Checkout requires Human GO per charge; QA company only
- **P10a** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — billing-subscription-status anon http=401 error='not_authenticated'
- **P10** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — cancel-subscription anon http=401 error='not_authenticated'
- **P02j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — jwt invite-user http=400 error='invalid_payload'
- **P04j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — app-shaped rejected (400) then strip+junction OK task=5a438586-c135-4e48-9b62-473e547b4c47
- **P05j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — status=200 files=201 stars=201
- **P08j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — jwt acl_write http=200
- **P10j** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — jwt billing-subscription-status http=200 error=None
- **F6** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — subject=alice.workera1@test.com foreign_task=1833b1cc-9122-4e24-9508-f07784fd60ee other=276c0714-ba27-4136-9dbc-9dc603a67c99 read_http=200 patch_http=200 insert_http=403 leaked=False
- **F7** [PASS] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — subject=alice.workera1@test.com sub_co=2f13d7d6-5c26-439b-90c0-b39bd839e66b foreign_co=cc90906f-3543-4094-81ba-eac7bf6867a1 foreign_task=f8d0a8d1-9af1-41ec-9142-5b1e0bdad29c read_http=200 patch_http=200 insert_http=403 leaked=False co_wall=True
- **O4** [RLS-open] plane=DEV ref=zusulknbhaumougqckec sha=7d65e97d — reporting: demote_http=200 before=admin after=member unchanged=False body=[{'id': '7030cce2-991f-421f-a059-11dd22beaf9e', 'name': 'O4 Sole Admin', 'email': 'o4-sole-p-matrix-20260927114150-08788542@example.invalid', 'phone': '', 'company_id': 'fa146f06-bcbe-4e9c-99e0-87abb7e061df', 'position': '', 'system_permission': 'member', 'user_type': 'company_user', 'last_selected_project_id': None, 'is_pending': False, 'approved_by': None, 'approved_at': None, 'created_at': '2026-09-27T11:42:07.38233+00:00', 'updated_at': '2026-09-27T11:42:07.933781+00:00', 'deleted_at': None, 'invite_sign_in_link': None, 'must_set_password': False, 'is_active': True, 'deployable_seat': 'worker'}] OWED: DB last-admin guard

### PROD (`jcnzjigxgkzhjsaekoqz`)
- **P01** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — user=sara@insitetest.com acl=admin company=27c0612d-fb8e-4444-bcf4-545228a763a8
- **P02** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — http=401 error='not_authenticated'
- **P03** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — project=8addf28a-22a7-4e18-8ab0-43bac4f69821 upa_http=201 body=[{'id': '442c247c-19bd-480e-aca3-f84f35b348cd', 'user_id': '1dd31ee0-7f42-42b2-9a6b-76cea9f3579f', 'project_id': '8addf28a-22a7-4e18-8ab0-43bac4f69821', 'project_role': 'lead_project_manager', 'assigned_by': '1dd31ee0-7f42-42b2-9a6b-76cea9f3579f', 'is_active': True, 'created_at': '2026-09-27T11:42:10.134963+00:00', 'updated_at': '2026-09-27T11:42:10.134963+00:00'}] ts_pref=created_at
- **P04** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — app-shaped rejected (400) then strip+junction OK task=6f2de91e-4a5d-47a9-91bd-d50119e90107
- **P05** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — status_http=200 task_files_http=201
- **P06** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — task=6f2de91e-4a5d-47a9-91bd-d50119e90107 submitted→approved
- **P07** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — primary_http=201 delegated_http=201
- **P11** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — report=400c89f9-7946-4222-b28e-edeb1a947ba0 activity_http=201 resolve_http=200
- **P08** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — acl_write_http=200
- **P09** [Human-GO-skip] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — SKIPPED — live Checkout requires Human GO per charge; QA company only
- **P10a** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — billing-subscription-status anon http=401 error='not_authenticated'
- **P10** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — cancel-subscription anon http=401 error='not_authenticated'
- **P02j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — jwt invite-user http=400 error='invalid_payload'
- **P04j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — app-shaped rejected (400) then strip+junction OK task=cf5ddbaa-9be9-4f33-bd81-d927b8fdfc0d
- **P05j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — status=200 files=201 stars=201
- **P08j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — jwt acl_write http=200
- **P10j** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — jwt billing-subscription-status http=200 error=None
- **F6** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — subject=john@insitetest.com foreign_task=68aab0dd-6e53-4a1e-b548-b8b610cf48cc other=4d138961-4aff-4ea9-bc3d-b6b3814256e3 read_http=200 patch_http=200 insert_http=403 leaked=False
- **F7** [PASS] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — subject=john@insitetest.com sub_co=27c0612d-fb8e-4444-bcf4-545228a763a8 foreign_co=1e36594b-218e-4a8a-bd97-cfe9a05214e3 foreign_task=c80cc8b5-dcbe-40e4-9d53-bdfd98e52bf9 read_http=200 patch_http=200 insert_http=403 leaked=False co_wall=True
- **O4** [Fixture/data] plane=PROD ref=jcnzjigxgkzhjsaekoqz sha=7d65e97d — reporting: sole-admin precondition failed count=0
