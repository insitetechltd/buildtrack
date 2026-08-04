# InsiteApp Web Desktop Control Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-pass desktop web admin control-shell mockup on the canvas that extends the implemented mobile app’s visual language into a desktop dashboard shell.

**Architecture:** Create a new standalone mock project under `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/` using the same pattern as the existing mobile mock: one shared CSS token file, one HTML page for the admin home screen, and one `.design` file that registers the page on the canvas. Keep the implementation static and design-focused: no framework, no runtime state, no API calls, and no extra screens beyond the approved first-pass admin home.

**Tech Stack:** Static HTML, CSS custom properties, `.design` canvas metadata JSON, existing Taskr/InsiteApp mock-project pattern

---

## File Structure

- **Create:** `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css`
  - Owns the desktop tokens, layout primitives, card styling, typography, and semantic state treatments derived from the implemented mobile app.
- **Create:** `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html`
  - Owns the approved Option 1 mockup page: sidebar, context bar, KPI row, projects panel, queue summary, attention panel, activity feed, and quick actions.
- **Create:** `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design`
  - Registers the HTML page on the canvas as a desktop page project.
- **Verify against:** `docs/superpowers/specs/2026-07-15-insiteapp-web-desktop-control-shell-design.md`
  - Source of truth for layout, content zones, and visual direction.
- **Reference only:** `docs/superpowers/mocks/taskr-new-interface-mock/taskr-new-interface-mock.design`
  - Pattern reference for `.design` structure and `devMetadata.htmlSrc` wiring.

### Task 1: Scaffold The Desktop Mock Project Shell

**Files:**
- Create: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css`
- Create: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design`
- Verify against: `docs/superpowers/specs/2026-07-15-insiteapp-web-desktop-control-shell-design.md`

- [ ] **Step 1: Create the mock project directories**

Run:

```bash
mkdir -p docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages
```

Expected:

```text
No output
```

- [ ] **Step 2: Create the shared desktop token and layout stylesheet**

Write `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css` with this complete content:

```css
:root {
  --shell: #08576E;
  --shell-strong: #0D6E87;
  --shell-accent: #12A8E0;
  --workspace: #E7F4F8;
  --panel-tint: #F8FCFF;
  --surface: #FFFFFF;
  --surface-muted: #F4FAFC;
  --line: #C8E2EA;
  --line-strong: #B5D5DF;
  --text: #07111E;
  --text-strong: #0D2630;
  --text-muted: #577783;
  --text-soft: #497080;
  --text-inverse: #F8FCFF;
  --info: #2563EB;
  --info-soft: #EFF6FF;
  --success: #16A34A;
  --success-soft: #ECFDF3;
  --warning: #D97706;
  --warning-soft: #FFF7ED;
  --danger: #DC2626;
  --danger-soft: #FEF2F2;
  --radius-xl: 28px;
  --radius-lg: 22px;
  --radius-md: 16px;
  --radius-sm: 12px;
  --shadow-sm: 0 8px 24px rgba(8, 87, 110, 0.08);
  --shadow-md: 0 20px 44px rgba(8, 87, 110, 0.10);
  --sidebar-width: 272px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: linear-gradient(180deg, #edf7fa 0%, #e7f4f8 100%);
  color: var(--text);
  font-family: Inter, "SF Pro Display", "Segoe UI", sans-serif;
}

body {
  padding: 20px;
}

.app-shell {
  min-height: calc(100vh - 40px);
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  background: var(--workspace);
}

.sidebar {
  background: linear-gradient(180deg, var(--shell) 0%, #06495c 100%);
  color: var(--text-inverse);
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 20px;
}

.brand-copy h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brand-copy p {
  margin: 6px 0 0;
  color: #B9D9E4;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.workspace-badge {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.workspace-badge .eyebrow,
.section-label,
.metric-label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  font-weight: 700;
}

.workspace-badge .eyebrow {
  color: #B9D9E4;
  margin-bottom: 8px;
}

.workspace-badge .value {
  font-size: 16px;
  font-weight: 700;
}

.sidebar-nav {
  display: grid;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  color: #E7F4F8;
  text-decoration: none;
  font-weight: 600;
}

.nav-item.active {
  background: rgba(18, 168, 224, 0.18);
  box-shadow: inset 0 0 0 1px rgba(185, 217, 228, 0.16);
}

.nav-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #7FD7F3;
  flex: 0 0 auto;
}

.sidebar-foot {
  margin-top: auto;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.sidebar-foot p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: #D6ECF2;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 18px;
  background: rgba(248, 252, 255, 0.85);
  border-bottom: 1px solid rgba(181, 213, 223, 0.7);
  backdrop-filter: blur(16px);
}

.topbar-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.switcher,
.search,
.icon-chip,
.profile-chip,
.header-action {
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.switcher,
.profile-chip,
.header-action {
  padding: 12px 14px;
}

.switcher strong,
.profile-chip strong {
  display: block;
  font-size: 14px;
  color: var(--text-strong);
}

.switcher span,
.profile-chip span {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.search {
  min-width: 320px;
  padding: 13px 16px;
  color: var(--text-muted);
}

.icon-chip {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--shell);
}

.profile-chip {
  min-width: 168px;
}

.page {
  padding: 24px;
  display: grid;
  gap: 22px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 34px;
  line-height: 1.05;
  letter-spacing: -0.04em;
  color: var(--text-strong);
}

.page-header p {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-muted);
  max-width: 760px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header-action.primary {
  background: var(--shell);
  color: var(--text-inverse);
  border-color: transparent;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card,
.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.metric-card {
  padding: 18px;
  display: grid;
  gap: 10px;
}

.metric-value {
  font-size: 34px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-strong);
}

.metric-meta {
  font-size: 13px;
  color: var(--text-muted);
}

.metric-card.info .metric-pill { background: var(--info-soft); color: var(--info); }
.metric-card.success .metric-pill { background: var(--success-soft); color: var(--success); }
.metric-card.warning .metric-pill { background: var(--warning-soft); color: var(--warning); }
.metric-card.danger .metric-pill { background: var(--danger-soft); color: var(--danger); }

.metric-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 18px;
  align-items: start;
}

.stack {
  display: grid;
  gap: 18px;
}

.panel {
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.15;
  color: var(--text-strong);
}

.panel-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted);
}

.project-list,
.activity-list,
.queue-list,
.action-list {
  display: grid;
  gap: 12px;
}

.project-row,
.activity-row,
.queue-row,
.action-row,
.attention-row {
  display: grid;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: var(--surface-muted);
  border: 1px solid #D8EAF0;
}

.split {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.row-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-strong);
}

.row-copy,
.row-meta {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.status-pill.info { background: var(--info-soft); color: var(--info); }
.status-pill.success { background: var(--success-soft); color: var(--success); }
.status-pill.warning { background: var(--warning-soft); color: var(--warning); }
.status-pill.danger { background: var(--danger-soft); color: var(--danger); }

.queue-row {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.queue-count {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: -0.04em;
}

.attention-grid {
  display: grid;
  gap: 12px;
}

.attention-row {
  background: #FFFFFF;
}

.attention-row.warning {
  border-color: #FED7AA;
  background: #FFF7ED;
}

.attention-row.danger {
  border-color: #FECACA;
  background: #FEF2F2;
}

.action-row {
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.action-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(8, 87, 110, 0.10);
  display: grid;
  place-items: center;
  color: var(--shell);
  font-weight: 800;
}

@media (max-width: 1280px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Create the `.design` file that registers the desktop page on the canvas**

Write `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design` with this complete content:

```json
{
  "data": [
    {
      "id": "page-admin-control-shell",
      "title": "Admin Control Shell",
      "type": "page",
      "version": 1,
      "createdAt": 1784121600000,
      "canvasData": {
        "x": 0,
        "y": 0,
        "group": 0
      },
      "devMetadata": {
        "htmlSrc": "pages/admin-control-shell.html",
        "interactions": []
      }
    }
  ],
  "config": {
    "autoLayout": true,
    "deviceType": "desktop",
    "projectName": "InsiteApp Web Desktop Control Shell",
    "showEdge": true
  }
}
```

- [ ] **Step 4: Validate the scaffold files**

Run:

```bash
python3 -m json.tool docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design >/dev/null && ls docs/superpowers/mocks/insiteapp-web-desktop-control-shell
```

Expected:

```text
colors_and_type.css
insiteapp-web-desktop-control-shell.design
pages
```

- [ ] **Step 5: Commit the scaffold**

```bash
git add docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design
git commit -m "feat(mock): scaffold desktop control shell project"
```

### Task 2: Build The Approved Desktop Admin Home Page

**Files:**
- Create: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html`
- Modify: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css`
- Verify against: `docs/superpowers/specs/2026-07-15-insiteapp-web-desktop-control-shell-design.md`

- [ ] **Step 1: Create the admin home HTML page**

Write `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html` with this complete content:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Control Shell</title>
    <link rel="stylesheet" href="../colors_and_type.css">
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">I</div>
          <div class="brand-copy">
            <h1>Taskr</h1>
            <p>Operations Workspace</p>
          </div>
        </div>

        <div class="workspace-badge">
          <div class="eyebrow">Current Workspace</div>
          <div class="value">Insite Construction Group</div>
        </div>

        <nav class="sidebar-nav">
          <a class="nav-item active" href="#"><span class="nav-dot"></span>Dashboard</a>
          <a class="nav-item" href="#"><span class="nav-dot"></span>Organization</a>
          <a class="nav-item" href="#"><span class="nav-dot"></span>Projects</a>
          <a class="nav-item" href="#"><span class="nav-dot"></span>Tasks</a>
          <a class="nav-item" href="#"><span class="nav-dot"></span>Reports</a>
          <a class="nav-item" href="#"><span class="nav-dot"></span>Settings</a>
        </nav>

        <div class="sidebar-foot">
          <div class="eyebrow">Priority</div>
          <strong>7 items need attention today</strong>
          <p>Overdue tasks, pending reviews, and approval blockers should remain visible without opening secondary screens.</p>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div class="topbar-group">
            <div class="switcher">
              <strong>Insite Construction Group</strong>
              <span>Organization context</span>
            </div>
            <div class="switcher">
              <strong>Harbour Tower Fit-Out</strong>
              <span>Current project</span>
            </div>
          </div>

          <div class="topbar-group">
            <div class="search">Search tasks, users, projects, or approvals</div>
            <div class="icon-chip">3</div>
            <div class="profile-chip">
              <strong>Tristan</strong>
              <span>Project Administrator</span>
            </div>
          </div>
        </header>

        <section class="page">
          <div class="page-header">
            <div>
              <div class="section-label">Dashboard</div>
              <h2>Admin Control Shell</h2>
              <p>Monitor organization health, keep project context visible, and move quickly between exceptions, queues, and recent delivery activity.</p>
            </div>

            <div class="header-actions">
              <div class="header-action">Invite User</div>
              <div class="header-action">Review Queue</div>
              <div class="header-action primary">Create Project</div>
            </div>
          </div>

          <section class="metrics">
            <article class="metric-card info">
              <div class="metric-pill">Live</div>
              <div class="metric-value">14</div>
              <div class="metric-label">Active Projects</div>
              <div class="metric-meta">3 changed status in the last 24 hours</div>
            </article>
            <article class="metric-card danger">
              <div class="metric-pill">Urgent</div>
              <div class="metric-value">18</div>
              <div class="metric-label">Overdue Tasks</div>
              <div class="metric-meta">6 are blocking downstream work packages</div>
            </article>
            <article class="metric-card warning">
              <div class="metric-pill">Review</div>
              <div class="metric-value">11</div>
              <div class="metric-label">Pending Reviews</div>
              <div class="metric-meta">4 waiting more than 48 hours</div>
            </article>
            <article class="metric-card success">
              <div class="metric-pill">Week</div>
              <div class="metric-value">52</div>
              <div class="metric-label">Completed This Week</div>
              <div class="metric-meta">Across 5 projects and 3 trade groups</div>
            </article>
          </section>

          <section class="dashboard-grid">
            <div class="stack">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">Active Projects</h3>
                    <p class="panel-subtitle">Project health, phase visibility, and emerging risk signals.</p>
                  </div>
                  <div class="status-pill info">View all</div>
                </div>

                <div class="project-list">
                  <div class="project-row">
                    <div class="split">
                      <div>
                        <h4 class="row-title">Harbour Tower Fit-Out</h4>
                        <div class="row-copy">Interior finishes · 84% complete · 2 inspections due this week</div>
                      </div>
                      <div class="status-pill warning">Attention</div>
                    </div>
                    <div class="row-meta">14 open tasks · 3 overdue · last update 42 min ago</div>
                  </div>

                  <div class="project-row">
                    <div class="split">
                      <div>
                        <h4 class="row-title">West Yard Services Upgrade</h4>
                        <div class="row-copy">Electrical package · 61% complete · review queue elevated</div>
                      </div>
                      <div class="status-pill danger">Overdue</div>
                    </div>
                    <div class="row-meta">9 open tasks · 5 pending review · last update 18 min ago</div>
                  </div>

                  <div class="project-row">
                    <div class="split">
                      <div>
                        <h4 class="row-title">North Block Fire Remediation</h4>
                        <div class="row-copy">Compliance workstream · close-out documentation underway</div>
                      </div>
                      <div class="status-pill success">Stable</div>
                    </div>
                    <div class="row-meta">6 open tasks · 0 overdue · last update 1 hr ago</div>
                  </div>
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">Recent Activity</h3>
                    <p class="panel-subtitle">Latest operational updates across current organization and project scope.</p>
                  </div>
                </div>

                <div class="activity-list">
                  <div class="activity-row">
                    <div class="split">
                      <h4 class="row-title">Fire door install photos submitted for review</h4>
                      <div class="status-pill warning">Review</div>
                    </div>
                    <div class="row-copy">Task 18-302 · Harbour Tower Fit-Out · by Sam Lee</div>
                    <div class="row-meta">9:42 AM</div>
                  </div>

                  <div class="activity-row">
                    <div class="split">
                      <h4 class="row-title">Concrete patching marked complete</h4>
                      <div class="status-pill success">Complete</div>
                    </div>
                    <div class="row-copy">Task 12-114 · North Block Fire Remediation · by Sarah Chan</div>
                    <div class="row-meta">8:57 AM</div>
                  </div>

                  <div class="activity-row">
                    <div class="split">
                      <h4 class="row-title">Electrical trench task escalated by project lead</h4>
                      <div class="status-pill danger">Escalated</div>
                    </div>
                    <div class="row-copy">Task 08-211 · West Yard Services Upgrade · blocked by access</div>
                    <div class="row-meta">8:21 AM</div>
                  </div>
                </div>
              </article>
            </div>

            <div class="stack">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">Queue Overview</h3>
                    <p class="panel-subtitle">Core task buckets that need direct action.</p>
                  </div>
                </div>

                <div class="queue-list">
                  <div class="queue-row">
                    <div>
                      <h4 class="row-title">Assigned</h4>
                      <div class="row-meta">Newly assigned work requiring acknowledgement</div>
                    </div>
                    <div class="queue-count">24</div>
                  </div>
                  <div class="queue-row">
                    <div>
                      <h4 class="row-title">In Progress</h4>
                      <div class="row-meta">Work actively being executed in current project scope</div>
                    </div>
                    <div class="queue-count">37</div>
                  </div>
                  <div class="queue-row">
                    <div>
                      <h4 class="row-title">Reviewing</h4>
                      <div class="row-meta">Submitted updates pending admin or lead review</div>
                    </div>
                    <div class="queue-count">11</div>
                  </div>
                  <div class="queue-row">
                    <div>
                      <h4 class="row-title">Completed</h4>
                      <div class="row-meta">Approved work closed in the last seven days</div>
                    </div>
                    <div class="queue-count">52</div>
                  </div>
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">Attention Needed</h3>
                    <p class="panel-subtitle">Exceptions and blockers surfaced without needing deeper navigation.</p>
                  </div>
                </div>

                <div class="attention-grid">
                  <div class="attention-row danger">
                    <h4 class="row-title">6 overdue tasks are blocking follow-on work</h4>
                    <div class="row-copy">Most impacted: West Yard Services Upgrade and Harbour Tower Fit-Out.</div>
                  </div>
                  <div class="attention-row warning">
                    <h4 class="row-title">4 review submissions have been waiting over 48 hours</h4>
                    <div class="row-copy">Recommendation: clear review queue before end-of-day handoff.</div>
                  </div>
                  <div class="attention-row">
                    <h4 class="row-title">2 users still need role confirmation</h4>
                    <div class="row-copy">Pending workspace access to project-level task flows.</div>
                  </div>
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <h3 class="panel-title">Quick Actions</h3>
                    <p class="panel-subtitle">High-frequency admin actions kept visible.</p>
                  </div>
                </div>

                <div class="action-list">
                  <div class="action-row">
                    <div class="action-icon">+</div>
                    <div>
                      <h4 class="row-title">Add Project</h4>
                      <div class="row-meta">Create a new project shell and assign delivery leads.</div>
                    </div>
                    <div class="status-pill info">Open</div>
                  </div>
                  <div class="action-row">
                    <div class="action-icon">U</div>
                    <div>
                      <h4 class="row-title">Invite User</h4>
                      <div class="row-meta">Add a team member and define organization/project access.</div>
                    </div>
                    <div class="status-pill info">Open</div>
                  </div>
                  <div class="action-row">
                    <div class="action-icon">R</div>
                    <div>
                      <h4 class="row-title">Review Approvals</h4>
                      <div class="row-meta">Process pending task submissions and unblock field teams.</div>
                    </div>
                    <div class="status-pill warning">11</div>
                  </div>
                  <div class="action-row">
                    <div class="action-icon">T</div>
                    <div>
                      <h4 class="row-title">Open Task List</h4>
                      <div class="row-meta">Jump to the operational task workspace with filters applied.</div>
                    </div>
                    <div class="status-pill success">Ready</div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
  </body>
</html>
```

- [ ] **Step 2: If the layout needs one missing helper after HTML assembly, add only this scoped CSS patch**

Append this block to `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css` only if the HTML needs more robust wrapping behavior:

```css
.header-actions,
.topbar-group {
  align-items: center;
}

.project-list,
.activity-list,
.queue-list,
.action-list,
.attention-grid {
  min-width: 0;
}

.row-title,
.row-copy,
.row-meta,
.panel-title,
.panel-subtitle {
  min-width: 0;
}
```

- [ ] **Step 3: Verify the HTML contains all approved information zones**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
html = Path("docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html").read_text()
required = [
    "Dashboard",
    "Active Projects",
    "Queue Overview",
    "Attention Needed",
    "Recent Activity",
    "Quick Actions",
    "Insite Construction Group",
    "Harbour Tower Fit-Out",
]
missing = [item for item in required if item not in html]
print("OK" if not missing else "MISSING: " + ", ".join(missing))
PY
```

Expected:

```text
OK
```

- [ ] **Step 4: Run a lightweight local preview**

Run:

```bash
python3 -m http.server 4173 --directory docs/superpowers/mocks/insiteapp-web-desktop-control-shell
```

Expected:

```text
Serving HTTP on 0.0.0.0 port 4173
```

Then visually confirm:

```text
The page reads as a desktop admin shell with a deep teal sidebar, pale blue workspace, white KPI/cards, clear context bar, and visible admin action zones.
```

- [ ] **Step 5: Commit the page implementation**

```bash
git add docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css
git commit -m "feat(mock): add desktop admin control shell page"
```

### Task 3: Wire The Canvas Metadata And Final Validation

**Files:**
- Modify: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design`
- Verify: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/pages/admin-control-shell.html`
- Verify: `docs/superpowers/mocks/insiteapp-web-desktop-control-shell/colors_and_type.css`

- [ ] **Step 1: Make sure the `.design` metadata exactly matches the implemented page file**

The file should still resolve to this object:

```json
{
  "id": "page-admin-control-shell",
  "title": "Admin Control Shell",
  "type": "page",
  "version": 1,
  "createdAt": 1784121600000,
  "canvasData": {
    "x": 0,
    "y": 0,
    "group": 0
  },
  "devMetadata": {
    "htmlSrc": "pages/admin-control-shell.html",
    "interactions": []
  }
}
```

- [ ] **Step 2: Validate the final project structure**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
root = Path("docs/superpowers/mocks/insiteapp-web-desktop-control-shell")
expected = [
    root / "colors_and_type.css",
    root / "insiteapp-web-desktop-control-shell.design",
    root / "pages" / "admin-control-shell.html",
]
missing = [str(path) for path in expected if not path.exists()]
print("OK" if not missing else "MISSING: " + ", ".join(missing))
PY
```

Expected:

```text
OK
```

- [ ] **Step 3: Validate the `.design` JSON and check for patch hygiene**

Run:

```bash
python3 -m json.tool docs/superpowers/mocks/insiteapp-web-desktop-control-shell/insiteapp-web-desktop-control-shell.design >/dev/null && git diff --check
```

Expected:

```text
No output from git diff --check
```

- [ ] **Step 4: Create the final project commit**

```bash
git add docs/superpowers/mocks/insiteapp-web-desktop-control-shell
git commit -m "feat(mock): add insiteapp desktop control shell concept"
```

## Self-Review

- **Spec coverage:** The plan covers the approved single-screen desktop control shell, keeps the deep teal / pale blue / white card language, includes sidebar + top context bar + KPI row + active projects + queue overview + attention panel + activity + quick actions, and preserves the desktop-first scope from the spec.
- **Placeholder scan:** No `TBD`, `TODO`, or undefined implementation steps remain. Each code-writing step includes full file content or an explicit patch block.
- **Type consistency:** File names, `.design` ids, project names, and `htmlSrc` references are consistent across the scaffold, page implementation, and validation tasks.
