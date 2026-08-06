#!/usr/bin/env python3
import os

HEADER = 'appId: com.buildtrack.app.local\n---\n'

LAUNCH_AND_HEADER_WAIT = """\
- launchApp:
    appId: "com.buildtrack.app.local"
- extendedWaitUntil:
    visible:
      id: "app-screen-header__profile-trigger"
    timeout: 90000
- waitForAnimationToEnd:
    timeout: 5000
- runFlow:
    when:
      visible:
        id: "root-tab__activity"
    commands:
      - tapOn:
          id: "root-tab__activity"
      - waitForAnimationToEnd:
          timeout: 2500
- assertVisible:
    id: "app-screen-header__profile-trigger"
- waitForAnimationToEnd:
    timeout: 1500
"""

GOTO_TASKS_TAB_RELIABLE = """\
- tapOn:
    point: "96%, 97%"
- waitForAnimationToEnd:
    timeout: 1500
- tapOn:
    point: "96%, 97%"
- waitForAnimationToEnd:
    timeout: 1500
- extendedWaitUntil:
    visible:
      id: "root-tab__tasks"
    timeout: 20000
- tapOn:
    id: "root-tab__tasks"
- waitForAnimationToEnd:
    timeout: 5000
- extendedWaitUntil:
    visible:
      id: "tasks-screen__search_section"
    timeout: 15000
- runFlow:
    when:
      notVisible:
        id: "tasks-screen__search_section"
    commands:
      - tapOn:
          id: "root-tab__tasks"
      - waitForAnimationToEnd:
          timeout: 5000
      - extendedWaitUntil:
          visible:
            id: "tasks-screen__search_section"
          timeout: 15000
- runFlow:
    when:
      notVisible:
        id: "tasks-screen__search_section"
    commands:
      - tapOn:
          text: "Tasks"
      - waitForAnimationToEnd:
          timeout: 6000
      - extendedWaitUntil:
          visible:
            id: "tasks-screen__search_section"
          timeout: 15000
- assertVisible:
    id: "tasks-screen__search_section"
"""

def open_dev_settings(nth=1):
    """Navigate from dashboard home -> DeveloperSettings. For nth>=2, include fallback for stuck profile menu modal state."""
    base = """\
- tapOn:
    id: "app-screen-header__profile-trigger"
- waitForAnimationToEnd:
    timeout: 5000
- extendedWaitUntil:
    visible:
      id: "profile-menu-developer_settings"
    timeout: 20000
"""
    if nth >= 2:
        base += """\
- runFlow:
    when:
      notVisible:
        id: "profile-menu-developer_settings"
    commands:
      - runFlow:
          when:
            visible:
              id: "profile-menu__backdrop"
          commands:
            - tapOn:
                id: "profile-menu__backdrop"
            - waitForAnimationToEnd:
                timeout: 1500
      - tapOn:
          id: "app-screen-header__profile-trigger"
      - waitForAnimationToEnd:
          timeout: 2000
      - extendedWaitUntil:
          visible:
            id: "profile-menu-developer_settings"
          timeout: 20000
"""
    base += """\
- assertVisible:
    id: "profile-menu-developer_settings"
- tapOn:
    id: "profile-menu-developer_settings"
"""
    return base

WAIT_DEVELOPER_SETTINGS_SCREEN = """\
- extendedWaitUntil:
    visible:
      id: "developer-settings-screen__root"
    timeout: 20000
- waitForAnimationToEnd:
    timeout: 2000
- assertVisible:
    id: "developer-settings-screen__root"
"""

def scroll_to_and_tap_init_action():
    return """\
- scrollUntilVisible:
    element:
      id: "developer-settings-action_initialize-sprint7-sandbox"
    direction: DOWN
    speed: 40
    visibilityPercentage: 50
    timeout: 15000
- waitForAnimationToEnd:
    timeout: 2500
- extendedWaitUntil:
    visible:
      id: "developer-settings-action_initialize-sprint7-sandbox"
    timeout: 12000
- assertVisible:
    id: "developer-settings-action_initialize-sprint7-sandbox"
- tapOn:
    id: "developer-settings-action_initialize-sprint7-sandbox"
- waitForAnimationToEnd:
    timeout: 8000
"""

def init_and_wait_for_preset(actor='tristan', preset='preset_a'):
    """actor: tristan | herman. preset: preset_a | preset_b.
    Success-signal-first: wait for preset visible. If not visible, fallback to confirm-sheet tap actor, dismiss info sheet, re-wait preset.
    """
    actor_id = f'initialize-{actor}'
    preset_full = f'developer-settings__{preset}'
    fallback_confirm = f'developer-settings-sheet_confirm-sprint7_{actor_id}'
    return f"""\
- extendedWaitUntil:
    visible:
      id: "{preset_full}"
    timeout: 25000
- runFlow:
    when:
      notVisible:
        id: "{preset_full}"
    commands:
      - runFlow:
          when:
            visible:
              id: "developer-settings-sheet_confirm-sprint7"
          commands:
            - waitForAnimationToEnd:
                timeout: 2500
            - extendedWaitUntil:
                visible:
                  id: "{fallback_confirm}"
                timeout: 15000
            - tapOn:
                id: "{fallback_confirm}"
            - waitForAnimationToEnd:
                timeout: 4000
            - extendedWaitUntil:
                visible:
                  id: "developer-settings-sheet_info-sprint7"
                timeout: 30000
            - waitForAnimationToEnd:
                timeout: 3000
            - extendedWaitUntil:
                visible:
                  id: "developer-settings-sheet_info-sprint7_ok"
                timeout: 15000
            - tapOn:
                id: "developer-settings-sheet_info-sprint7_ok"
            - waitForAnimationToEnd:
                timeout: 5000
      - runFlow:
          when:
            visible:
              id: "developer-settings-sheet_info-sprint7"
          commands:
            - extendedWaitUntil:
                visible:
                  id: "developer-settings-sheet_info-sprint7_ok"
                timeout: 15000
            - tapOn:
                id: "developer-settings-sheet_info-sprint7_ok"
            - waitForAnimationToEnd:
                timeout: 5000
      - scrollUntilVisible:
          element:
            id: "{preset_full}"
          direction: DOWN
          speed: 40
          visibilityPercentage: 50
          timeout: 20000
      - extendedWaitUntil:
          visible:
            id: "{preset_full}"
          timeout: 15000
- assertVisible:
    id: "{preset_full}"
"""

def apply_preset(preset='preset_a'):
    """Tap a specific preset (must already be visible) and dismiss info sheet if presented."""
    preset_full = f'developer-settings__{preset}'
    return f"""\
- scrollUntilVisible:
    element:
      id: "{preset_full}"
    direction: DOWN
    speed: 40
    visibilityPercentage: 50
    timeout: 15000
- waitForAnimationToEnd:
    timeout: 1500
- assertVisible:
    id: "{preset_full}"
- tapOn:
    id: "{preset_full}"
- waitForAnimationToEnd:
    timeout: 3500
- runFlow:
    when:
      visible:
        id: "developer-settings-sheet_info-sprint7"
    commands:
      - waitForAnimationToEnd:
          timeout: 2500
      - extendedWaitUntil:
          visible:
            id: "developer-settings-sheet_info-sprint7_ok"
          timeout: 20000
      - tapOn:
          id: "developer-settings-sheet_info-sprint7_ok"
      - waitForAnimationToEnd:
          timeout: 4500
"""

NAV_BACK_TO_DASHBOARD = """\
- runFlow:
    when:
      visible:
        id: "developer-settings-sheet_info-sprint7"
    commands:
      - waitForAnimationToEnd:
          timeout: 2500
      - extendedWaitUntil:
          visible:
            id: "developer-settings-sheet_info-sprint7_ok"
          timeout: 20000
      - tapOn:
          id: "developer-settings-sheet_info-sprint7_ok"
      - waitForAnimationToEnd:
          timeout: 4500
- runFlow:
    when:
      visible:
        id: "developer-settings-sheet_confirm-sprint7"
    commands:
      - waitForAnimationToEnd:
          timeout: 1500
      - back
      - waitForAnimationToEnd:
          timeout: 2000
- runFlow:
    when:
      visible:
        id: "profile-menu__backdrop"
    commands:
      - tapOn:
          id: "profile-menu__backdrop"
      - waitForAnimationToEnd:
          timeout: 1500
- launchApp:
    appId: "com.buildtrack.app.local"
    clearState: true
- extendedWaitUntil:
    visible:
      id: "app-screen-header__profile-trigger"
    timeout: 180000
- assertVisible:
    id: "app-screen-header__profile-trigger"
- waitForAnimationToEnd:
    timeout: 5000
- runFlow:
    when:
      visible:
        id: "root-tab__activity"
    commands:
      - tapOn:
          id: "root-tab__activity"
      - waitForAnimationToEnd:
          timeout: 3000
- assertVisible:
    id: "app-screen-header__profile-trigger"
"""

def screenshot(name):
    # Relative name (no ext), no slashes
    base = os.path.splitext(os.path.basename(name))[0]
    if base.endswith('.png'):
        base = base[:-4]
    return f'- takeScreenshot:\n    path: "{base}"\n'

# ============================================================
# Scenario A: Rejection Loop — 3 actor switches, 4 screenshots
#   1) Init Herman + preset_a → back → screenshot A1 (Herman dashboard post-init)
#   2) Open DevSettings 2nd → init Tristan + preset_b → back → screenshot A2 (Tristan dashboard)
#   3) Tap Tasks tab (Tristan non-admin) → screenshot A3 (Tristan tasks tab)
#   4) Back to dashboard → open DevSettings 3rd → init Herman + preset_a → back → screenshot A4 (Herman no visible tasks on dashboard)
# ============================================================
def build_A():
    s = HEADER + LAUNCH_AND_HEADER_WAIT
    # Step 1: DevSettings #1 → init Herman + preset_a
    s += open_dev_settings(nth=1)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='herman', preset='preset_a')
    s += apply_preset('preset_a')
    s += NAV_BACK_TO_DASHBOARD
    s += screenshot('qa01-a-01-dashboard-herman-post-init')
    s += '\n'
    # Step 2: DevSettings #2 → init Tristan + preset_b
    s += open_dev_settings(nth=2)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='tristan', preset='preset_b')
    s += apply_preset('preset_b')
    s += NAV_BACK_TO_DASHBOARD
    s += screenshot('qa01-a-02-dashboard-tristan')
    s += '\n'
    # Step 3: Tap tasks tab (Tristan = non-admin → tasks tab mounts)
    s += GOTO_TASKS_TAB_RELIABLE
    s += screenshot('qa01-a-03-tristan-tasks')
    s += '\n'
    # Step 4: Back to dashboard → DevSettings #3 → init Herman + preset_a → screenshot A4
    s += """\
- back
- waitForAnimationToEnd:
    timeout: 2000
- runFlow:
    when:
      notVisible:
        id: "app-screen-header__profile-trigger"
    commands:
      - back
      - waitForAnimationToEnd:
          timeout: 2500
- extendedWaitUntil:
    visible:
      id: "app-screen-header__profile-trigger"
    timeout: 20000
- assertVisible:
    id: "app-screen-header__profile-trigger"
"""
    s += open_dev_settings(nth=3)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='herman', preset='preset_a')
    s += apply_preset('preset_a')
    s += NAV_BACK_TO_DASHBOARD
    s += screenshot('qa01-a-04-herman-no-task')
    return s

# ============================================================
# Scenario B: Overdue Crunch Queue
#   - Init Tristan (non-admin → Tasks tab renders) + preset_b (overdue crunch data)
#   B1: Dashboard overdue queue dashboard screenshot
#   B2: Tap tasks tab → overdue tasks screenshot
#   B3: Back to dashboard → queue overview screenshot
# ============================================================
def build_B():
    s = HEADER + LAUNCH_AND_HEADER_WAIT
    s += open_dev_settings(nth=1)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='tristan', preset='preset_b')
    s += apply_preset('preset_b')
    s += NAV_BACK_TO_DASHBOARD
    s += screenshot('qa01-b-01-dashboard-overdue-queue')
    s += '\n'
    # B2: tasks tab overdue crunch
    s += GOTO_TASKS_TAB_RELIABLE
    s += screenshot('qa01-b-02-tasks-overdue-list')
    s += '\n'
    # B3: Tap Activity tab to return to Dashboard (bottom-tap, not "back" — bottom tabs are root; back does nothing)
    s += """\
- runFlow:
    when:
      visible:
        id: "root-tab__activity"
    commands:
      - tapOn:
          id: "root-tab__activity"
      - waitForAnimationToEnd:
          timeout: 3500
- extendedWaitUntil:
    visible:
      id: "root-tab__activity"
    timeout: 15000
- runFlow:
    when:
      notVisible:
        id: "root-tab__activity"
    commands:
      - tapOn:
          point: "4%, 97%"
      - waitForAnimationToEnd:
          timeout: 3000
- assertVisible:
    id: "app-screen-header__profile-trigger"
- waitForAnimationToEnd:
    timeout: 2500
- scrollUntilVisible:
    element:
      text: "Recent Activity"
    direction: DOWN
    speed: 40
    visibilityPercentage: 50
    timeout: 20000
- waitForAnimationToEnd:
    timeout: 2000
"""
    s += screenshot('qa01-b-03-dashboard-queue-overview-crunch')
    return s

# ============================================================
# Scenario C: Isolation Wall
#   - Init Herman only → apply no preset → screenshot C1 (Herman dashboard shared projects only)
#   - Then: re-enter DevSettings → init Tristan (get tasks tab back) → screenshot C2 (tasks shared)
#   - Back → screenshot C3 (dashboard after switching)
# ============================================================
def build_C():
    s = HEADER + LAUNCH_AND_HEADER_WAIT
    s += open_dev_settings(nth=1)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    # wait for preset_a visible (confirmation of init success), do NOT tap preset
    s += init_and_wait_for_preset(actor='herman', preset='preset_a')
    # No preset tap — just tap back to dashboard (isolation wall: no shared data via preset load)
    s += NAV_BACK_TO_DASHBOARD
    s += screenshot('qa01-c-01-herman-dashboard-only-shared-project')
    s += '\n'
    # Now: enter DevSettings #2 → init Tristan + preset_a so Tasks tab mounts
    s += open_dev_settings(nth=2)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='tristan', preset='preset_a')
    s += apply_preset('preset_a')
    s += NAV_BACK_TO_DASHBOARD
    # Tap tasks tab
    s += GOTO_TASKS_TAB_RELIABLE
    s += screenshot('qa01-c-02-tasks-isolated-view')
    s += '\n'
    # Back home → screenshot C3
    s += """\
- back
- waitForAnimationToEnd:
    timeout: 2000
- runFlow:
    when:
      notVisible:
        id: "app-screen-header__profile-trigger"
    commands:
      - back
      - waitForAnimationToEnd:
          timeout: 2500
- extendedWaitUntil:
    visible:
      id: "app-screen-header__profile-trigger"
    timeout: 20000
- assertVisible:
    id: "app-screen-header__profile-trigger"
"""
    s += screenshot('qa01-c-03-dashboard-after-switch')
    return s

# ============================================================
# Scenario D: iPhone 17 Pro Max Viewport Audit (8 screenshots)
#   D1 Dashboard header (clear of dynamic island)
#   D2 Dashboard (scroll to Recent Activity) — queue grid visible
#   D3 Dashboard further down (scroll again) — drafts / safe area
#   D4 Tasks screen header & empty state
#   D5 Tasks: list region (scroll)
#   D6 Tasks: search + filter bar
#   D7 DevSettings header safe area
#   D8 DevSettings bottom (Clear Local Data safe area)
# ============================================================
def build_D():
    s = HEADER + LAUNCH_AND_HEADER_WAIT
    # Enter DevSettings → init Tristan + preset_a (so queue/drafts render)
    s += open_dev_settings(nth=1)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += scroll_to_and_tap_init_action()
    s += init_and_wait_for_preset(actor='tristan', preset='preset_a')
    s += apply_preset('preset_a')
    s += NAV_BACK_TO_DASHBOARD
    # D1: Dashboard header
    s += screenshot('qa01-d-01-dashboard-header-clear-dynisland')
    s += '\n'
    # D2: Dashboard scroll to "Recent Activity" (covers queue grid and above)
    s += """\
- scrollUntilVisible:
    element:
      text: "Recent Activity"
    direction: DOWN
    speed: 40
    visibilityPercentage: 50
    timeout: 20000
- waitForAnimationToEnd:
    timeout: 2500
"""
    s += screenshot('qa01-d-02-dashboard-queue-grid-below-fold')
    s += '\n'
    # D3: Dashboard scroll more (scroll twice down + settle)
    s += """\
- scrollUntilVisible:
    element:
      text: "Recent Activity"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 2000
- scrollUntilVisible:
    element:
      text: "Recent Activity"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 2500
"""
    s += screenshot('qa01-d-03-dashboard-bottom-safe-area')
    s += '\n'
    # Go to tasks tab (non-admin tristan)
    s += GOTO_TASKS_TAB_RELIABLE
    # D4 Tasks header
    s += screenshot('qa01-d-04-tasks-header-empty-or-list')
    s += '\n'
    # D5 Tasks: scroll via search section anchor
    s += """\
- scrollUntilVisible:
    element:
      id: "tasks-screen__search_section"
    direction: DOWN
    speed: 40
    visibilityPercentage: 50
    timeout: 15000
- waitForAnimationToEnd:
    timeout: 2000
"""
    s += screenshot('qa01-d-05-tasks-search-section-below')
    s += '\n'
    # D6 Tasks: scroll further
    s += """\
- scrollUntilVisible:
    element:
      id: "tasks-screen__search_section"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 2500
- scrollUntilVisible:
    element:
      id: "tasks-screen__search_section"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 2500
"""
    s += screenshot('qa01-d-06-tasks-bottom-safe-area')
    s += '\n'
    # D7 DevSettings: header safe area
    s += open_dev_settings(nth=2)
    s += WAIT_DEVELOPER_SETTINGS_SCREEN
    s += screenshot('qa01-d-07-devsettings-header-safearea')
    s += '\n'
    # D8 DevSettings: scroll to bottom / below init action → Clear Local Data area
    s += scroll_to_and_tap_init_action().replace(
        '- tapOn:\n    id: "developer-settings-action_initialize-sprint7-sandbox"\n',
        '',
    )  # scroll + wait, don't tap init
    s += """\
- scrollUntilVisible:
    element:
      id: "developer-settings-action_initialize-sprint7-sandbox"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 2500
- scrollUntilVisible:
    element:
      id: "developer-settings-action_initialize-sprint7-sandbox"
    direction: DOWN
    speed: 40
    visibilityPercentage: 100
    timeout: 10000
- waitForAnimationToEnd:
    timeout: 3000
"""
    s += screenshot('qa01-d-08-devsettings-bottom-safearea')
    return s


if __name__ == '__main__':
    base_dir = '/Volumes/KooDrive/InsiteApp/maestro/flows'
    files = {
        'A': 'qa01-scenario-a-rejection-loop.yaml',
        'B': 'qa01-scenario-b-overdue-crunch.yaml',
        'C': 'qa01-scenario-c-isolation-wall.yaml',
        'D': 'qa01-scenario-d-iphone17-viewport.yaml',
    }
    builders = {'A': build_A, 'B': build_B, 'C': build_C, 'D': build_D}
    for tag, fname in files.items():
        content = builders[tag]()
        with open(os.path.join(base_dir, fname), 'w', encoding='utf-8') as fh:
            fh.write(content)
        lines = content.count('\n')
        print(f"[write] {fname} → {lines} lines ({len(content)} bytes)")
