import { chmodSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const REPO_ROOT = resolve(__dirname, "../../..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts/validation/validate-local.sh");

function createExecutable(directory: string, name: string, contents: string) {
  const filePath = join(directory, name);
  writeFileSync(filePath, contents, "utf8");
  chmodSync(filePath, 0o755);
}

describe("validate-local.sh", () => {
  it("emits DIRTY_TREE_WARN telemetry and succeeds when compile and regression pass", () => {
    const binDir = mkdtempSync(join(tmpdir(), "validate-local-bin-"));

    createExecutable(
      binDir,
      "git",
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  echo " M src/example.ts"
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      "npx",
      `#!/bin/sh
echo "TypeScript clean"
exit 0
`
    );

    createExecutable(
      binDir,
      "npm",
      `#!/bin/sh
echo "Regression clean"
exit 0
`
    );

    const result = spawnSync("bash", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VALIDATE_LOCAL_STRICT_DIRTY_TREE: "0",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[DIRTY_TREE_WARN]");
    expect(result.stdout).toContain("[VALIDATION_SUCCESS]");
    expect(result.stdout).toContain(`|${REPO_ROOT}|`);
  });

  it("emits TYPE_ERROR telemetry and stops before regression when the compile gate fails", () => {
    const binDir = mkdtempSync(join(tmpdir(), "validate-local-bin-"));
    const npmMarkerPath = join(binDir, "npm-marker.txt");

    createExecutable(
      binDir,
      "git",
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      "npx",
      `#!/bin/sh
echo "src/example.ts(4,1): error TS1005: ';' expected." 1>&2
exit 2
`
    );

    createExecutable(
      binDir,
      "npm",
      `#!/bin/sh
echo "npm should not run" > "${npmMarkerPath}"
exit 0
`
    );

    const result = spawnSync("bash", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VALIDATE_LOCAL_STRICT_DIRTY_TREE: "0",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(20);
    expect(result.stderr).toContain("[TYPE_ERROR]");
    expect(result.stderr).toContain("upstream exit 2");
    expect(result.stderr).toContain("error TS1005");
    expect(result.stdout).not.toContain("[VALIDATION_SUCCESS]");
    expect(result.stdout).not.toContain("stage_3_regression");
  });

  it("runs simulation gate when VALIDATE_LOCAL_RUN_SIMULATION=1 is set", () => {
    const binDir = mkdtempSync(join(tmpdir(), "validate-local-bin-"));
    const simulationMarkerPath = join(binDir, "simulation-marker.txt");

    createExecutable(
      binDir,
      "git",
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      "npx",
      `#!/bin/sh
exit 0
`
    );

    createExecutable(
      binDir,
      "npm",
      `#!/bin/sh
if [ "$1" = "run" ] && [ "$2" = "test:simulation:ui" ]; then
  echo "ran simulation" > "${simulationMarkerPath}"
  exit 0
fi
exit 0
`
    );

    const result = spawnSync("bash", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VALIDATE_LOCAL_RUN_SIMULATION: "1",
        VALIDATE_LOCAL_STRICT_DIRTY_TREE: "0",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[VALIDATION_SUCCESS]");
    expect(() => require("fs").readFileSync(simulationMarkerPath, "utf8")).not.toThrow();
  });

  it("runs the journey gate when VALIDATE_LOCAL_RUN_JOURNEYS=1 is set", () => {
    const binDir = mkdtempSync(join(tmpdir(), "validate-local-bin-"));
    const journeyMarkerPath = join(binDir, "journey-marker.txt");

    createExecutable(
      binDir,
      "git",
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      "npx",
      `#!/bin/sh
exit 0
`
    );

    createExecutable(
      binDir,
      "npm",
      `#!/bin/sh
if [ "$1" = "run" ] && [ "$2" = "test:e2e:journeys" ]; then
  echo "ran journeys" > "${journeyMarkerPath}"
  exit 0
fi
exit 0
`
    );

    const result = spawnSync("bash", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VALIDATE_LOCAL_RUN_JOURNEYS: "1",
        VALIDATE_LOCAL_STRICT_DIRTY_TREE: "0",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("stage_4_journeys");
    expect(result.stdout).toContain("[VALIDATION_SUCCESS]");
    expect(() => require("fs").readFileSync(journeyMarkerPath, "utf8")).not.toThrow();
  });

  it("runs the Maestro smoke gate when VALIDATE_LOCAL_RUN_MAESTRO_SMOKE=1 is set", () => {
    const binDir = mkdtempSync(join(tmpdir(), "validate-local-bin-"));
    const maestroMarkerPath = join(binDir, "maestro-marker.txt");

    createExecutable(
      binDir,
      "git",
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      "npx",
      `#!/bin/sh
exit 0
`
    );

    createExecutable(
      binDir,
      "npm",
      `#!/bin/sh
if [ "$1" = "run" ] && [ "$2" = "test:e2e:maestro:smoke" ]; then
  echo "ran maestro smoke" > "${maestroMarkerPath}"
  exit 0
fi
exit 0
`
    );

    const result = spawnSync("bash", [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        VALIDATE_LOCAL_RUN_MAESTRO_SMOKE: "1",
        VALIDATE_LOCAL_STRICT_DIRTY_TREE: "0",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("stage_6_maestro_smoke");
    expect(result.stdout).toContain("[VALIDATION_SUCCESS]");
    expect(() => require("fs").readFileSync(maestroMarkerPath, "utf8")).not.toThrow();
  });
});
