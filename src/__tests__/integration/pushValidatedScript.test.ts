import { chmodSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const REPO_ROOT = resolve(__dirname, '../../..');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/validation/push-validated.sh');

function createExecutable(directory: string, name: string, contents: string) {
  const filePath = join(directory, name);
  writeFileSync(filePath, contents, 'utf8');
  chmodSync(filePath, 0o755);
}

describe('push-validated.sh', () => {
  it('does not push unless ALLOW_VALIDATED_PUSH=1 is set', () => {
    const binDir = mkdtempSync(join(tmpdir(), 'push-validated-bin-'));
    const pushMarkerPath = join(binDir, 'push-marker.txt');

    createExecutable(
      binDir,
      'git',
      `#!/bin/sh
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
  echo "feature/test"
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then
  echo true
  exit 0
fi
if [ "$1" = "status" ] && [ "$2" = "--porcelain" ]; then
  exit 0
fi
if [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ] && [ "$3" = "--symbolic-full-name" ]; then
  exit 1
fi
if [ "$1" = "push" ]; then
  echo "pushed" > "${pushMarkerPath}"
  exit 0
fi
exit 0
`
    );

    createExecutable(
      binDir,
      'npx',
      `#!/bin/sh
exit 0
`
    );

    createExecutable(
      binDir,
      'npm',
      `#!/bin/sh
exit 0
`
    );

    const result = spawnSync('bash', [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('VALIDATION_EVENT|');
    expect(() => require('fs').readFileSync(pushMarkerPath, 'utf8')).toThrow();
  });
});
