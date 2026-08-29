# Code Depth Gradations

Code Depth Gradations gives each indented line one solid, full-line shade based on leading spaces and tabs. Deeper code moves gradually farther from the active editor background.

The extension stays lexical and lightweight. It performs no parsing, syntax-tree analysis, bracket matching, or language-specific work.

It is deliberately *not* a replacement for syntax highlighting, semantic highlighting, bracket-pair guides, or a code parser. Your theme still colors language keywords; this extension adds a restrained background cue for nesting.

## Theme-relative color

The default `auto` mode uses translucent neutral tints:

- dark and high-contrast-dark themes become gradually lighter with depth;
- light and high-contrast-light themes become gradually darker with depth.

Because every shade remains translucent, VS Code composites it over the theme's current `editor.background`. Custom themes, user color customizations, and theme switches keep their own background identity. The extension rebuilds its shade set as soon as the active color theme changes.

Depth zero stays exactly on the theme background.

## Depth curve

Each complete indentation level maps to one shade. The opacity begins at `minimumOpacity`, approaches `maximumOpacity` at `maxDepth`, and follows `curveExponent` between them.

- `curveExponent: 1` creates a linear progression.
- Values above `1` keep shallow nesting quieter and make deeper nesting more pronounced.
- Values below `1` reveal more contrast near the first few levels.

Lines deeper than `maxDepth` use the final shade.

## Settings

- `codeDepthGradations.enabled`: turns the effect on or off.
- `codeDepthGradations.indentSize`: columns per depth. `0` uses the editor's detected tab size.
- `codeDepthGradations.renderStyle`: `wholeLine` applies one solid shade across the complete line; `indentation` limits it to leading whitespace.
- `codeDepthGradations.maxDepth`: number of generated shades.
- `codeDepthGradations.tintMode`: `auto`, `lighter`, `darker`, or `custom`.
- `codeDepthGradations.customTint`: hex tint used by `custom` mode.
- `codeDepthGradations.minimumOpacity`: tint strength at depth 1.
- `codeDepthGradations.maximumOpacity`: tint strength at the deepest generated level.
- `codeDepthGradations.curveExponent`: progression curve from shallow to deep.

A quiet default:

```json
{
  "codeDepthGradations.renderStyle": "wholeLine",
  "codeDepthGradations.tintMode": "auto",
  "codeDepthGradations.maxDepth": 16,
  "codeDepthGradations.minimumOpacity": 0.012,
  "codeDepthGradations.maximumOpacity": 0.11,
  "codeDepthGradations.curveExponent": 1.4
}
```

A richer violet wash that still blends with the theme background:

```json
{
  "codeDepthGradations.tintMode": "custom",
  "codeDepthGradations.customTint": "#7c3aed",
  "codeDepthGradations.minimumOpacity": 0.015,
  "codeDepthGradations.maximumOpacity": 0.14,
  "codeDepthGradations.curveExponent": 1.65
}
```

## Indentation counting

VS Code's effective editor tab size supplies the default depth width, including its indentation detection. A tab advances to the next tab stop, so mixed spaces and tabs produce stable visual depths.

## Commands

- **Code Depth Gradations: Toggle**
- **Code Depth Gradations: Refresh**

## Performance

Work scales with the lines currently visible on screen. Edits and scrolling are coalesced, decoration types are reused by depth level, and hidden documents receive no rescans.

The renderer also has hard work limits. It clears its own decorations for an editor instead of scanning more than 1,000 visible lines, 250,000 visible characters, or a 20,000-character line. These limits keep generated and minified files from monopolizing the extension host.

## Privacy and capabilities

This is a local, visual-only extension. It has no networking, telemetry, shell, terminal, task, debugger, credential, or filesystem-writing behavior. It looks only at text currently visible in VS Code, editor/theme options, and its own settings, then asks VS Code to draw decorations. See [SECURITY.md](SECURITY.md) for the enforced bounds and release checklist.

## Install a local release candidate

```bash
npm ci
npm run check
code --install-extension code-depth-gradations.vsix
```

Reload VS Code, then use **Code Depth Gradations: Toggle** from the Command Palette. The packaged-file allowlist is part of `npm run check`, so an unexpected file fails the build instead of silently entering the VSIX.

## Development

```bash
npm ci
npm run check
xvfb-run -a npm run test:integration
```

Press `F5` in VS Code to launch an Extension Development Host.

The shortest editing loop is `npm run watch`, then `F5`. Use `npm test` for pure depth math, `npm run test:integration` for real activation on the oldest supported VS Code (1.86.2), and the full `npm run check` before handing work off. Set `VSCODE_TEST_VERSION=stable` to repeat the smoke test on current VS Code. Dependencies are reproducible through the committed lockfile; use `npm install` only when intentionally changing them.

## License

MIT
