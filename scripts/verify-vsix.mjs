import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const vsixPath = process.argv[2];
assert.ok(vsixPath, 'usage: node scripts/verify-vsix.mjs <extension.vsix>');

const expectedFiles = [
  '[Content_Types].xml',
  'extension.vsixmanifest',
  'extension/LICENSE.txt',
  'extension/SECURITY.md',
  'extension/changelog.md',
  'extension/dist/extension.js',
  'extension/package.json',
  'extension/readme.md',
];

const listing = spawnSync('unzip', ['-Z1', vsixPath], { encoding: 'utf8' });
assert.equal(listing.status, 0, listing.stderr);
const actualFiles = listing.stdout.trim().split('\n').sort();
assert.deepEqual(actualFiles, expectedFiles.sort(), 'VSIX contents changed; review and update the allowlist');

const archiveSize = fs.statSync(vsixPath).size;
assert.ok(archiveSize < 250_000, `VSIX is unexpectedly large: ${archiveSize} bytes`);

const bundle = spawnSync('unzip', ['-p', vsixPath, 'extension/dist/extension.js'], {
  encoding: 'utf8',
  maxBuffer: 1_000_000,
});
assert.equal(bundle.status, 0, bundle.stderr);
for (const forbiddenCapability of [
  'child_process',
  'node:fs',
  'node:http',
  'node:https',
  'process.env',
]) {
  assert.ok(
    !bundle.stdout.includes(forbiddenCapability),
    `runtime bundle contains forbidden capability: ${forbiddenCapability}`,
  );
}

console.log(`Verified ${actualFiles.length} allowlisted files in ${archiveSize} bytes.`);
