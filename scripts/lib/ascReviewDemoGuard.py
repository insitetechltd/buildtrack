"""
ASC App Review demo account password lock (Python).

Why: Taskr 1.1.3 was rejected twice under Guideline 2.1 when
sara@insitetest.com failed on PROD after automated Auth Admin password
rotation (notably probe-p01-p10 mint_qa_jwt) drifted the ASC Review password.

Break-glass: ASC_DEMO_PASSWORD_BREAK_GLASS=1
If the password changes, update ASC Review Information in the same change.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Mapping

_MANIFEST = Path(__file__).resolve().with_name("asc-review-demo-accounts.json")


class AscDemoPasswordLockedError(RuntimeError):
    """Raised when a script would rotate an ASC Review demo password."""

    code = "ASC_DEMO_PASSWORD_LOCKED"


def load_manifest() -> dict:
    return json.loads(_MANIFEST.read_text(encoding="utf-8"))


def normalize_email(email: str | None) -> str:
    if not email or not isinstance(email, str):
        return ""
    return email.strip().lower()


def asc_locked_demo_emails() -> list[str]:
    emails = load_manifest().get("emails") or []
    return [normalize_email(e) for e in emails if normalize_email(e)]


def is_asc_locked_demo_email(email: str | None) -> bool:
    n = normalize_email(email)
    return bool(n) and n in set(asc_locked_demo_emails())


def asc_demo_password_break_glass_enabled(
    env: Mapping[str, str] | None = None,
) -> bool:
    e = env if env is not None else os.environ
    v = str(e.get("ASC_DEMO_PASSWORD_BREAK_GLASS", "")).strip().lower()
    return v in ("1", "true", "yes")


def assert_may_rotate_asc_demo_password(
    email: str | None,
    env: Mapping[str, str] | None = None,
) -> None:
    if not is_asc_locked_demo_email(email):
        return
    if asc_demo_password_break_glass_enabled(env):
        return
    raise AscDemoPasswordLockedError(
        f"Refusing Auth Admin password change for ASC-locked demo account "
        f"{normalize_email(email)}. Automated QA must not drift App Store "
        f"Review credentials (Guideline 2.1). Break-glass: "
        f"ASC_DEMO_PASSWORD_BREAK_GLASS=1 and update ASC Review Information "
        f"if the password changes."
    )


def known_demo_password_candidates(
    env: Mapping[str, str] | None = None,
) -> list[str]:
    """Password-grant candidates only — never used for Auth Admin PUT on locked emails."""
    e = env if env is not None else os.environ
    out: list[str] = []
    for key in (
        "ASC_REVIEW_DEMO_PASSWORD",
        "MAESTRO_QA_PASSWORD",
        "PROBE_QA_PASSWORD",
    ):
        v = str(e.get(key, "")).strip()
        if v and v not in out:
            out.append(v)
    # Maestro / ASC shared convention (also hardcoded in many YAML flows).
    if "password123" not in out:
        out.append("password123")
    return out
