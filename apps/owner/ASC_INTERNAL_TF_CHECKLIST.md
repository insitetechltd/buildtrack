# ASC setup — hq (Human checklist)

## Done

1. ✅ Bundle ID **`com.insite.hq`** (`832V68UPKV`)
2. ✅ ASC App **`6806629041`** in `eas.json`
3. ✅ iOS Dist Cert + Provisioning Profile
4. ✅ Phase 0 TF smoke — login `tristan@insitetech.co` PASS (build 2)
5. ✅ Phase 1a Edge `owner-kpi-snapshot` on DEV — owner 200 / non-owner 403 / bad window 400
6. ✅ Phase 1a local IPA submitted — `apps/owner/.eas/artifacts/hq-phase1a-20260830-024958.ipa`
7. ✅ Phase 1c Edge `owner-tenant-read` on DEV — listCompanies / getCompany / drill actions
8. ✅ Phase 1c local IPA submitted — `apps/owner/.eas/artifacts/hq-phase1c-20260830-111922.ipa`
9. ✅ Phase 1b `platform_owners` + Economics Edge + Phase 1d write Edge on DEV (JWT smoke create/deactivate/ban/403)
10. ✅ Phase 1b/Econ/1d local IPA submitted — `.eas/artifacts/hq-phase1b-econ-1d-20260830-143300.ipa` · [submission](https://expo.dev/accounts/insitetech/projects/insite-owner/submissions/4406b2cf-a836-4f41-887a-05de058fbfff) (build **7**)
11. ✅ Read-only ops enrich (`owner-ops-read`) — local IPA `.eas/artifacts/hq-ops-read-20260830-160800.ipa` · [submission](https://expo.dev/accounts/insitetech/projects/insite-owner/submissions/c066fe87-7880-4c45-bb8a-3a8ec7f8755d) (build **10**)
12. ✅ Tenant drill-down IA — local IPA `.eas/artifacts/hq-tenant-drill-20260831-001808.ipa` · [submission](https://expo.dev/accounts/insitetech/projects/insite-owner/submissions/21f4c3d6-b44c-439f-ae30-5e46c2530e17) (build **11**)

## You (headed)

1. Wait Apple processing → Internal TF install latest hq build (**10**)
2. Login → **Monitoring** → provider health + secret presence + auth signals
3. **Economics** → Stripe card (Not configured / withheld MRR OK) + Postgres counts
4. **Tenant hub** → Companies / Projects / Users (+ Audit). Cards show encapsulated counts (company: projects·users; project: tasks·members; user: projects). Detail closes the triangle; list footers cross hubs.
5. No External / Public / App Review

## Standing rule

**Before every HQ TF build:** commit the ship slice and `git push origin` so the IPA’s embedded commit matches remote.

Kickoff: `docs/superpowers/plans/2026-08-30-m-ops-03-owner-internal-tf-kickoff.md`
