fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios asc_auth_probe

```sh
[bundle exec] fastlane ios asc_auth_probe
```

Read-only ASC auth probe (no writes)

### ios asc_build_status

```sh
[bundle exec] fastlane ios asc_build_status
```

Read-only: list recent iOS builds and whether 280 is VALID

### ios asc_select_build

```sh
[bundle exec] fastlane ios asc_select_build
```

Attach CFBundleVersion to the editable App Store version

### ios asc_paste

```sh
[bundle exec] fastlane ios asc_paste
```

Upload listing metadata + screenshots (no binary, no Submit for Review)

### ios asc_review_blockers

```sh
[bundle exec] fastlane ios asc_review_blockers
```

Read-only: dump open review submissions and resolution threads

### ios asc_submit

```sh
[bundle exec] fastlane ios asc_submit
```

Submit version for App Review (metadata already on ASC). Public stays off.

### ios asc_deliver

```sh
[bundle exec] fastlane ios asc_deliver
```

Metadata + screenshots, then Submit for Review when ASC_SUBMIT=1

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
