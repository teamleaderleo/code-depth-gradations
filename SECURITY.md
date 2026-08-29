# Security

## Runtime contract

Code Depth Gradations is a visual-only extension. Its runtime bundle may read VS Code's visible editor text, visible ranges, editor options, color-theme kind, and this extension's settings. It may create and dispose editor decorations and register its two commands.

It does not import filesystem, process-launching, networking, credential, terminal, task, debug, telemetry, or workspace-edit APIs. It does not send source code anywhere or write project files. It supports untrusted workspaces because its behavior does not depend on workspace trust.

Rendering fails closed when one editor refresh would exceed any hard bound:

- 1,000 distinct visible lines;
- 250,000 visible characters in aggregate;
- 20,000 characters in one line;
- 64 generated decoration types, enforced by the setting schema and runtime validation;
- at most 32 pending visible editors, with refreshes coalesced over 35 milliseconds.

Exceeding a bound clears this extension's decorations for that editor instead of attempting a partial or unbounded scan. Hidden editors are not scanned.

## Reporting a problem

Please open a GitHub security advisory for vulnerabilities. Ordinary defects can use the public issue tracker. Do not include private source code, credentials, or personal data in either report.

## Release gate

Before tagging a release:

1. Start from a reviewed, clean commit whose CI is green.
2. Install dependencies only with `npm ci`; review lockfile changes as code.
3. Run `npm run check` and `xvfb-run -a npm run test:integration`.
4. Inspect `code-depth-gradations.vsix`. The automated allowlist permits only the manifest, package metadata, README, changelog, license, and production bundle.
5. Install that exact VSIX in an Extension Development Host and inspect ordinary, deeply nested, split-editor, huge-line, disabled, theme-switch, and untrusted-workspace behavior.
6. Record the Git commit, `package-lock.json` SHA-256, and VSIX SHA-256 in the release notes.
7. Create the tag from that exact commit. Keep any Marketplace publishing credential short lived and out of repository, logs, shells, and local files.

The GitHub Actions workflow has read-only repository permission and pins third-party actions by full commit SHA.
