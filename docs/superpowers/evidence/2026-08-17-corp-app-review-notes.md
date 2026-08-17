# App Store Review Notes — Corp account model (RC)

Paste into App Store Connect → App Review Information → Notes (adapt as needed).

```text
Taskr is a construction field app sold as an organizational (company) subscription.

Account model:
- New companies are created via in-app “Create company” (first user becomes company admin).
- Additional seats (PM / worker) are provisioned only by the company admin via User Management → Invite (temporary password shared out-of-band). There is no public self-serve “join any company” registration.
- Workers do not self-delete company data. Company admins remove seat access; full tenant deletion (company + projects + tasks + photos) is reserved for the data owner (web admin / Wave 2). Jobsite history retains actor names for auditability.

Demo access: [provide admin credentials]
```

Privacy policy should mirror: org owns project data; individual seat removal ≠ project wipe.
