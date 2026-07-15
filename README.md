# Code Depth Gradations

Code Depth Gradations tints code according to indentation depth. It reads leading spaces and tabs only. There is no parser, syntax tree, language server, or bracket matching pass.

## How it works

The extension processes visible lines in visible editors. VS Code's effective editor tab size supplies the default depth width, including its indentation detection. A tab advances to the next tab stop. Every complete indentation level selects one color from the palette.

Depth zero stays untouched.

## Settings

- `codeDepthGradations.enabled`: turns the effect on or off.
- `codeDepthGradations.indentSize`: columns per depth. `0` uses the editor's detected tab size.
- `codeDepthGradations.renderStyle`: colors the `wholeLine` or only the `indentation` area.
- `codeDepthGradations.overflow`: `clamp` keeps the final color at greater depths; `cycle` repeats the palette.
- `codeDepthGradations.colors`: fallback and high-contrast palette.
- `codeDepthGradations.lightColors`: light-theme palette.
- `codeDepthGradations.darkColors`: dark-theme palette.

Colors accept CSS color strings such as hex, `rgb()`, `rgba()`, `hsl()`, and `hsla()`.

Example:

```json
{
  "codeDepthGradations.indentSize": 2,
  "codeDepthGradations.renderStyle": "wholeLine",
  "codeDepthGradations.overflow": "cycle",
  "codeDepthGradations.darkColors": [
    "rgba(56, 189, 248, 0.05)",
    "rgba(129, 140, 248, 0.07)",
    "rgba(232, 121, 249, 0.09)"
  ]
}
```

## Commands

- **Code Depth Gradations: Toggle**
- **Code Depth Gradations: Refresh**

## Development

```bash
npm install
npm run check
```

Press `F5` in VS Code to launch an Extension Development Host.

## Performance model

Work scales with the lines currently visible on screen. Edits and scrolling are coalesced into one microtask, decoration types are reused by palette slot, and hidden documents receive no rescans.

## License

MIT
