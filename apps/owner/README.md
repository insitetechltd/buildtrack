# HQ (M-OPS-03 Owner Admin)

Internal TestFlight only. Bundle: `com.insite.hq`. Path: `apps/owner/`. Display name: **HQ**.

Same daily-TF rulebook as Taskr: profile **`dev`** → EAS environment **`preview`** → **DEV**. Never App Store.

```bash
cd apps/owner
./build-and-submit.sh ios          # DEV Internal TF
# ./build-and-submit.sh ios dev    # same
```
