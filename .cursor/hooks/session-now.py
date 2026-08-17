#!/usr/bin/env python3
"""sessionStart: inject documentation/NOW.md when present. Fail open."""
from __future__ import annotations

import json
import os
import sys

MAX_CHARS = 8000


def workspace_root(payload: dict) -> str:
    roots = payload.get("workspace_roots") or payload.get("workspaceRoots") or []
    if isinstance(roots, list) and roots:
        return str(roots[0])
    cwd = payload.get("cwd") or payload.get("workspace_path")
    if cwd:
        return str(cwd)
    return os.getcwd()


def find_now(root: str) -> str | None:
    for rel in ("documentation/NOW.md", "docs/NOW.md", "NOW.md"):
        path = os.path.join(root, rel)
        if os.path.isfile(path):
            return path
    return None


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        print("{}")
        return

    root = workspace_root(payload)
    path = find_now(root)
    if not path:
        print("{}")
        return

    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        print("{}")
        return

    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n\n…(NOW.md truncated)"

    rel = os.path.relpath(path, root)
    ctx = (
        "Session SOP: git-tracked NOW file (overwrite at teardown; chat is scratch).\n"
        f"Read and obey `{rel}`:\n\n{text}"
    )
    print(json.dumps({"additional_context": ctx}))


if __name__ == "__main__":
    main()
