#!/usr/bin/env python3
"""Smoke tests for ascReviewDemoGuard (no network)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ascReviewDemoGuard import (
    AscDemoPasswordLockedError,
    assert_may_rotate_asc_demo_password,
    is_asc_locked_demo_email,
    known_demo_password_candidates,
)


def main() -> int:
    assert is_asc_locked_demo_email("Sara@InsiteTest.com")
    assert not is_asc_locked_demo_email("carol.admina@test.com")
    try:
        assert_may_rotate_asc_demo_password("sara@insitetest.com", env={})
        print("FAIL: expected AscDemoPasswordLockedError")
        return 1
    except AscDemoPasswordLockedError:
        pass
    assert_may_rotate_asc_demo_password(
        "sara@insitetest.com",
        env={"ASC_DEMO_PASSWORD_BREAK_GLASS": "1"},
    )
    assert_may_rotate_asc_demo_password("carol.admina@test.com", env={})
    cands = known_demo_password_candidates({})
    assert "password123" in cands
    print("PASS ascReviewDemoGuard")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
