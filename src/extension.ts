import * as vscode from 'vscode';
import {
  indentationDepth,
  normalizeIndentSize,
  paletteIndex,
  type PaletteOverflow,
} from './depth';

const CONFIGURATION_SECTION = 'codeDepthGradations';
const TOGGLE_COMMAND = 'code-depth-gradations.toggle';
const REFRESH_COMMAND = 'code-depth-gradations.refresh';

const FALLBACK_COLORS = [
  'rgba(99, 179, 237, 0.045)',
  'rgba(129, 140, 248, 0.055)',
  'rgba(167, 139, 250, 0.065)',
  'rgba(232, 121, 249, 0.075)',
  'rgba(244, 114, 182, 0.085)',
  'rgba(251, 113, 133, 0.095)',
];

type RenderStyle = 'wholeLine' | 'indentation';

interface Settings {
  readonly enabled: boolean;
  readonly colors: readonly string[];
  readonly lightColors: readonly string[];
  readonly darkColors: readonly string[];
  readonly overflow: PaletteOverflow;
  readonly renderStyle: RenderStyle;
  readonly indentSize: number;
}

class DepthDecorationController implements vscode.Disposable {
  private decorationTypes: vscode.TextEditorDecorationType[] = [];
  private settings: Settings = readSettings();
  private readonly pendingEditors = new Set<vscode.TextEditor>();
  private flushQueued = false;
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
    this.disposeDecorationTypes();
  }

  private scheduleVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.schedule(editor);
    }
  }

  private schedule(editor: vscode.TextEditor): void {
    if (this.disposed) {
      return;
    }

    this.pendingEditors.add(editor);
    if (this.flushQueued) {
      return;
    }

    this.flushQueued = true;
    queueMicrotask(() => {
      this.flushQueued = false;
      const editors = [...this.pendingEditors];
      this.pendingEditors.clear();

      for (const pendingEditor of editors) {
        this.applyDecorations(pendingEditor);
      }
    });
  }

  private rebuildDecorationTypes(): void {
    this.settings = readSettings();
    this.disposeDecorationTypes();

    if (!this.settings.enabled) {
      return;
    }

    const paletteLength = Math.max(
      this.settings.colors.length,
      this.settings.lightColors.length,
      this.settings.darkColors.length,
    );

    for (let index = 0; index < paletteLength; index += 1) {
      const baseColor = colorAt(this.settings.colors, index, this.settings.overflow);
      const lightColor = colorAt(this.settings.lightColors, index, this.settings.overflow);
      const darkColor = colorAt(this.settings.darkColors, index, this.settings.overflow);
      const options: vscode.DecorationRenderOptions = {
        backgroundColor: baseColor,
        isWholeLine: this.settings.renderStyle === 'wholeLine',
      };

      if (lightColor) {
        options.light = { backgroundColor: lightColor };
      }

      if (darkColor) {
        options.dark = { backgroundColor: darkColor };
      }

      this.decorationTypes.push(vscode.window.createTextEditorDecorationType(options));
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

        const line = editor.document.lineAt(lineNumber);
        const depth = indentationDepth(line.text, indentSize);
        const index = paletteIndex(depth, this.decorationTypes.length, this.settings.overflow);
        if (index === undefined) {
          continue;
        }

        const endCharacter = this.settings.renderStyle === 'wholeLine'
          ? 0
          : line.firstNonWhitespaceCharacterIndex;
        if (this.settings.renderStyle === 'indentation' && endCharacter === 0) {
          continue;
        }

        groups[index].push(new vscode.Range(lineNumber, 0, lineNumber, endCharacter));
      }
    }

    for (let index = 0; index < this.decorationTypes.length; index += 1) {
      editor.setDecorations(this.decorationTypes[index], groups[index]);
    }
  }
}

function readSettings(): Settings {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  const colors = readColorArray(configuration, 'colors', FALLBACK_COLORS);
  const configuredOverflow = configuration.get<string>('overflow', 'clamp');
  const configuredRenderStyle = configuration.get<string>('renderStyle', 'wholeLine');
  const configuredIndentSize = configuration.get<number>('indentSize', 0);

  return {
    enabled: configuration.get<boolean>('enabled', true),
    colors,
    lightColors: readColorArray(configuration, 'lightColors', []),
    darkColors: readColorArray(configuration, 'darkColors', []),
    overflow: configuredOverflow === 'cycle' ? 'cycle' : 'clamp',
    renderStyle: configuredRenderStyle === 'indentation' ? 'indentation' : 'wholeLine',
    indentSize: Number.isFinite(configuredIndentSize)
      ? Math.max(0, Math.floor(configuredIndentSize))
      : 0,
  };
}

function readColorArray(
  configuration: vscode.WorkspaceConfiguration,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const configured = configuration.get<unknown[]>(key, [...fallback]);
  const colors = configured
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return colors.length > 0 ? colors : fallback;
}

function colorAt(
  colors: readonly string[],
  index: number,
  overflow: PaletteOverflow,
): string | undefined {
  if (colors.length === 0) {
    return undefined;
  }

  if (overflow === 'cycle') {
    return colors[index % colors.length];
  }

  return colors[Math.min(index, colors.length - 1)];
}

export function activate(context: vscode.ExtensionContext): void {
  new DepthDecorationController(context);
}

export function deactivate(): void {
  // VS Code disposes everything registered with the extension context.
}
