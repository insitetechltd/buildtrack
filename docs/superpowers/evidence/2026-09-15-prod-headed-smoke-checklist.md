# PROD headed smoke checklist — 2026-09-15

- appSha: `9d26c2ba880963e77fc289ffd1f499eb48498ded`
- plane: **PROD** `jcnzjigxgkzhjsaekoqz`
- QA user: `sara@insitetest.com`
- automated artifact: `.cache/prod-new-sot-20260915/headed-prod-qa-smoke.json`

## Automated (JWT, app-shaped + read-back) — this run

| Step | Result | Detail |
|---|---|---|
| project | PASS | ef876f91-0ace-43f1-8b16-861c13f12fe8 |
| create_task | PASS | app-shaped rejected (400) then strip+junction OK task=6e961e00-3427-4e94-8671-402823c1bf24 |
| update_progress | PASS | http=200 |
| task_files | PASS | http=201 |
| star | PASS | http=201 |
| detail_assignees | PASS | col=[] junction=['1dd31ee0-7f42-42b2-9a6b-76cea9f3579f'] coalesced=['1dd31ee0-7f42-42b2-9a6b-76cea9f3579f'] |
| star_readback | PASS | http=200 |
| files_readback | PASS | http=200 |

## Human dogfood still required (camera / UI)

1. Metro `__DEV__` → Dev Admin custom endpoint = PROD URL+anon (or temporary `.env` PROD bake).
2. Confirm PROD banner / ref `jcnzjigxgkzhjsaekoqz` before any tap.
3. Login as QA CA → Create Task + **one real camera/library photo** → save.
4. Open Task Detail → assignees still present → Update Progress → star.
5. Kill app / reopen → photo + star + assignees still visible.

Gate B note: this automated smoke proves destination **data contract**
(JWT write + junction/file/star read-back). It does **not** replace Metro UI.

**Automated verdict:** PASS
