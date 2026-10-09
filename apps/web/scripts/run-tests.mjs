import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

// Node 20 does not expand test globs; enumerate files without relying on a shell.
function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const tests = findTests(join(projectRoot, 'src')).sort();
if (tests.length === 0) {
  console.error('No frontend .test.ts files found in src.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
