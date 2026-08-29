import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTests } from '@vscode/test-electron';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  await runTests({
    version: process.env.VSCODE_TEST_VERSION ?? '1.86.2',
    extensionDevelopmentPath: repositoryRoot,
    extensionTestsPath: path.join(repositoryRoot, '.integration-dist', 'integration', 'extension.test.js'),
    launchArgs: ['--disable-workspace-trust'],
  });
} catch (error) {
  console.error('Extension-host smoke test failed.');
  console.error(error);
  process.exitCode = 1;
}
