# M-WEB-01 spike acceptance (grilled 2026-10-16)

**Status:** Spike implementation complete on branch `cursor/m-web-01-spike-20261016` (localhost only).  
**Primary commercial track:** `M-AUTHZ-02` stays first; this is idle/parallel.  
**Host:** localhost only (`expo start --web`). No `app.insiteworks.co` deploy in spike.

## Locked scope

| Area | In spike / M-WEB-01 v1 |
| --- | --- |
| Stack | Expo Web + React Router DOM; Next only if Expo spike fails |
| Gates | CA / PM / Worker + **PA** (map from `getUserSystemPermission` + `isProjectAdminAssignment`) |
| Company | `/a/users` (Edge invite SoT) + `/a/projects` (create / edit / archive / open) |
| Project | `/p/:id/workspace` (meta + edit + KPIs), `/p/:id/team`, `/p/:id/tasks` (list + light edit). Settings deferred to DMS (defaults) |
| Task edit | title, description, assignee, due, status, tags |
| Mass tasks | CSV ≤200; full Create Task fields **except photos** |
| CSV review | Grid marks good/bad; click bad → fix form; **Import valid only**; nothing written until confirm |
| Unknown assignee | Row is **bad** (no auto-add to project) |
| Out | Photos on web create, DMS/RFI/submittals, reports/branding/roles catalog, production deploy |

## Spike week-0 prove bar

1. `Platform.OS === 'web'` renders `WebApp`, not mobile navigator (`App.web.tsx`)  
2. Login via existing `authStore`  
3. Shell + nav to locked routes  
4. Access helpers: CA → company routes; CA or PA → project desk + CSV  

## Landed (2026-10-16)

5. CA `/a/users` — live roster + Edge invite + copy pending invite link  
6. CA `/a/projects` — live list + create / edit / archive (`status=cancelled`; no `archived` col on DEV) + open → workspace  
7. `/p/:id/tasks` — live list (mobile-like) + light edit panel  
8. `/p/:id/team` — roster add / PA crown / remove  
9. `/p/:id/settings` — **removed from spike** (was duplicate of Workspace edit; restore under DMS for folder roots / reviewer defaults)  
10. `/p/:id/tasks/import` — CSV paste → review good/bad → fix in place → Import valid only  

## M-WEB-02 (same spike branch)

11. `/p/:id/workspace` — project metadata + Edit/archive + KPI cards (open / doing / review / overdue / members / PA)  
12. `/desk` — user landing: per-project KPI cards (tasks active/idle/closed/overdue + users active/idle) + rollup strip; open → workspace  
13. `/a/company` — CA-only company overview: company name, users active/idle/pending, projects active/idle/closed, past-week task buckets, company KPIs (Users/Projects remain management lists)  

## Assumptions

- Archive = set project `status` to `cancelled` (DEV lacks `projects.archived`).  
- Access helpers are UX-hide only; RLS enforces.  
- No PROD desk deploy without Tristan GO.
