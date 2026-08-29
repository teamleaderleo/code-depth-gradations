import * as vscode from 'vscode';
import {
  depthSlot,
  indentationDepth,
  normalizeHexColor,
  normalizeIndentSize,
  opacityForDepth,
  rgbaFromHex,
  type TintMode,
} from './depth';

const CONFIGURATION_SECTION = 'codeDepthGradations';
const TOGGLE_COMMAND = 'code-depth-gradations.toggle';
const REFRESH_COMMAND = 'code-depth-gradations.refresh';
const LIGHT_TINT = '#ffffff';
const DARK_TINT = '#000000';
const DEFAULT_CUSTOM_TINT = '#7c3aed';
const REFRESH_DELAY_MILLISECONDS = 35;
const MAX_PENDING_EDITORS = 32;
const MAX_VISIBLE_LINES_PER_EDITOR = 1_000;
const MAX_VISIBLE_CHARACTERS_PER_EDITOR = 250_000;
const MAX_LINE_LENGTH = 20_000;

type RenderStyle = 'wholeLine' | 'indentation';

interface Settings {
  readonly enabled: boolean;
  readonly renderStyle: RenderStyle;
  readonly indentSize: number;
  readonly maxDepth: number;
  readonly tintMode: TintMode;
  readonly customTint: string;
  readonly minimumOpacity: number;
  readonly maximumOpacity: number;
  readonly curveExponent: number;
}

class DepthDecorationController implements vscode.Disposable {
  private decorationTypes: vscode.TextEditorDecorationType[] = [];
  private settings: Settings = readSettings();
  private readonly pendingEditors = new Set<vscode.TextEditor>();
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  public constructor(context: vscode.ExtensionContext) {
    this.rebuildDecorationTypes();

    context.subscriptions.push(
      vscode.commands.registerCommand(TOGGLE_COMMAND, async () => {
        const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
        const enabled = configuration.get<boolean>('enabled', true);
        const target = vscode.workspace.workspaceFolders
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global;

        await configuration.update('enabled', !enabled, target);
      }),
      vscode.commands.registerCommand(REFRESH_COMMAND, () => {
        this.rebuildDecorationTypes();
        this.scheduleVisibleEditors();
      }),
      vscode.window.onDidChangeVisibleTextEditors(() => this.scheduleVisibleEditors()),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => this.schedule(event.textEditor)),
      vscode.window.onDidChangeTextEditorOptions((event) => this.schedule(event.textEditor)),
      vscode.window.onDidChangeActiveColorTheme(() => {
        this.rebuildDecorationTypes();
        this.scheduleVisibleEditors();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === event.document) {
            this.schedule(editor);
          }
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration(CONFIGURATION_SECTION)) {
          return;
        }

        this.rebuildDecorationTypes();
        this.scheduleVisibleEditors();
      }),
      this,
    );

    this.scheduleVisibleEditors();
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.pendingEditors.clear();
    if (this.flushTimer !== undefined) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.disposeDecorationTypes();
  }

  private scheduleVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.schedule(editor);
    }
  }

  private schedule(editor: vscode.TextEditor): void {
    if (
      this.disposed
      || !vscode.window.visibleTextEditors.includes(editor)
      || (!this.pendingEditors.has(editor) && this.pendingEditors.size >= MAX_PENDING_EDITORS)
    ) {
      return;
    }

    this.pendingEditors.add(editor);
    if (this.flushTimer !== undefined) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      const editors = [...this.pendingEditors];
      this.pendingEditors.clear();

      for (const pendingEditor of editors) {
        this.applyDecorations(pendingEditor);
      }
    }, REFRESH_DELAY_MILLISECONDS);
  }

  private rebuildDecorationTypes(): void {
    this.settings = readSettings();
    this.disposeDecorationTypes();

    if (!this.settings.enabled) {
      return;
    }

    const tint = resolveTint(this.settings, vscode.window.activeColorTheme.kind);

    for (let depth = 1; depth <= this.settings.maxDepth; depth += 1) {
      const opacity = opacityForDepth(
        depth,
        this.settings.maxDepth,
        this.settings.minimumOpacity,
        this.settings.maximumOpacity,
        this.settings.curveExponent,
      );
      if (opacity === undefined) {
        continue;
      }

      const backgroundColor = rgbaFromHex(tint, opacity);
      if (!backgroundColor) {
        continue;
      }

      this.decorationTypes.push(vscode.window.createTextEditorDecorationType({
        backgroundColor,
        isWholeLine: this.settings.renderStyle === 'wholeLine',
      }));
    }
  }

  private disposeDecorationTypes(): void {
    for (const decorationType of this.decorationTypes) {
      decorationType.dispose();
    }

    this.decorationTypes = [];
  }

  private applyDecorations(editor: vscode.TextEditor): void {
    if (
      this.disposed
      || !this.settings.enabled
      || this.decorationTypes.length === 0
      || !vscode.window.visibleTextEditors.includes(editor)
    ) {
      return;
    }

    const groups = this.decorationTypes.map(() => [] as vscode.Range[]);
    const renderedLines = new Set<number>();
    let scannedCharacters = 0;
    const indentSize = this.settings.indentSize > 0
      ? this.settings.indentSize
      : normalizeIndentSize(editor.options.tabSize, 4);

    for (const visibleRange of editor.visibleRanges) {
      const firstLine = Math.max(0, visibleRange.start.line);
      const lastLine = Math.min(editor.document.lineCount - 1, visibleRange.end.line);

      for (let lineNumber = firstLine; lineNumber <= lastLine; lineNumber += 1) {
        if (renderedLines.has(lineNumber)) {
          continue;
        }
        renderedLines.add(lineNumber);

        if (renderedLines.size > MAX_VISIBLE_LINES_PER_EDITOR) {
          this.clearDecorations(editor);
          return;
        }

        const line = editor.document.lineAt(lineNumber);
        scannedCharacters += line.text.length;
        if (
          line.text.length > MAX_LINE_LENGTH
          || scannedCharacters > MAX_VISIBLE_CHARACTERS_PER_EDITOR
        ) {
          this.clearDecorations(editor);
          return;
        }
        const depth = indentationDepth(line.text, indentSize);
        const slot = depthSlot(depth, this.decorationTypes.length);
        if (slot === undefined) {
          continue;
        }

        const endCharacter = this.settings.renderStyle === 'wholeLine'
          ? 0
          : line.firstNonWhitespaceCharacterIndex;
        if (this.settings.renderStyle === 'indentation' && endCharacter === 0) {
          continue;
        }

        groups[slot].push(new vscode.Range(lineNumber, 0, lineNumber, endCharacter));
      }
    }

    for (let index = 0; index < this.decorationTypes.length; index += 1) {
      editor.setDecorations(this.decorationTypes[index], groups[index]);
    }
  }

  private clearDecorations(editor: vscode.TextEditor): void {
    for (const decorationType of this.decorationTypes) {
      editor.setDecorations(decorationType, []);
    }
  }
}

function readSettings(): Settings {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  const configuredRenderStyle = configuration.get<string>('renderStyle', 'wholeLine');
  const configuredTintMode = configuration.get<string>('tintMode', 'auto');
  const indentSize = readInteger(configuration, 'indentSize', 0, 0, 32);
  const minimumOpacity = readNumber(configuration, 'minimumOpacity', 0.012, 0, 1);
  const maximumOpacity = Math.max(
    minimumOpacity,
    readNumber(configuration, 'maximumOpacity', 0.11, 0, 1),
  );

  return {
    enabled: configuration.get<boolean>('enabled', true),
    renderStyle: configuredRenderStyle === 'indentation' ? 'indentation' : 'wholeLine',
    indentSize,
    maxDepth: readInteger(configuration, 'maxDepth', 16, 1, 64),
    tintMode: isTintMode(configuredTintMode) ? configuredTintMode : 'auto',
    customTint: normalizeHexColor(
      configuration.get<string>('customTint', DEFAULT_CUSTOM_TINT),
      DEFAULT_CUSTOM_TINT,
    ),
    minimumOpacity,
    maximumOpacity,
    curveExponent: readNumber(configuration, 'curveExponent', 1.4, 0.1, 5),
  };
}

function resolveTint(settings: Settings, themeKind: vscode.ColorThemeKind): string {
  if (settings.tintMode === 'lighter') {
    return LIGHT_TINT;
  }

  if (settings.tintMode === 'darker') {
    return DARK_TINT;
  }

  if (settings.tintMode === 'custom') {
    return settings.customTint;
  }

  return isLightTheme(themeKind) ? DARK_TINT : LIGHT_TINT;
}

function isLightTheme(themeKind: vscode.ColorThemeKind): boolean {
  return themeKind === vscode.ColorThemeKind.Light
    || themeKind === vscode.ColorThemeKind.HighContrastLight;
}

function isTintMode(value: string): value is TintMode {
  return value === 'auto' || value === 'lighter' || value === 'darker' || value === 'custom';
}

function readInteger(
  configuration: vscode.WorkspaceConfiguration,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const configured = configuration.get<number>(key, fallback);
  if (!Number.isFinite(configured)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, Math.floor(configured)));
}

function readNumber(
  configuration: vscode.WorkspaceConfiguration,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const configured = configuration.get<number>(key, fallback);
  if (!Number.isFinite(configured)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, configured));
}

export function activate(context: vscode.ExtensionContext): void {
  new DepthDecorationController(context);
}

export function deactivate(): void {
  // VS Code disposes everything registered with the extension context.
}
