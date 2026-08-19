# Draft resume + TestFlight 183 (2026-08-17)

## Product

Dashboard **Drafts In Progress**: tap opens Create Task prefilled as an unfinished create (`resumeAsCreate`), not Task Detail. Swipe left deletes (confirm → `deleteTaskById`). Submit still updates the existing row (no duplicate).

## Validation

- `npx tsc --noEmit` rc=0
- Jest: DashboardScreen, useDashboardViewAdapter, useCreateTaskViewAdapter, createTaskRouteParams, DashboardScreenInteraction, CreateTaskScreen — 6 suites / 78 passed

## TestFlight

- **IPA:** `.eas/artifacts/build-1786964815186.ipa`
- **Version:** 1.1.3
- **Build:** 183 (remote autoIncrement)
- **Bundle ID:** `com.buildtrack.app.local`
- **ASC App:** `6754898737`
- **Submit:** `npx eas submit --platform ios --path .eas/artifacts/build-1786964815186.ipa --profile production --non-interactive`
- **Submission:** `76017f0a-b301-46ee-9a5b-3305e7f5cf45`
- **Do not** tick Public
