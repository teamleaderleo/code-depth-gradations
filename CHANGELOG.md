# Changelog

## 0.1.0

- Add solid whole-line shading based on indentation depth.
- Derive default shades from the active theme through translucent light/dark overlays.
- Refresh shades immediately when the active color theme changes.
- Add configurable minimum opacity, maximum opacity, maximum depth, and curve exponent.
- Add automatic, lighter, darker, and custom tint modes.
- Add automatic editor tab-size support and an explicit indent-size override.
- Keep indentation-only rendering as an optional compact mode.
- Add toggle and refresh commands.
- Add tests for indentation counting, shade slots, opacity curves, and tint conversion.
- Bound visible work and fail closed on huge or minified editor views.
- Add a locked toolchain, read-only pinned CI, extension-host smoke test, and exact VSIX allowlist.
- Document the visual-only runtime contract, privacy properties, and reproducible release procedure.
