import assert from 'node:assert/strict';
import * as vscode from 'vscode';

const EXTENSION_ID = 'teamleaderleo.code-depth-gradations';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `${EXTENSION_ID} should be installed in the development host`);
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('code-depth-gradations.toggle'));
  assert.ok(commands.includes('code-depth-gradations.refresh'));

  const ordinaryDocument = await vscode.workspace.openTextDocument({
    language: 'typescript',
    content: 'function outer() {\n  if (true) {\n    return 1;\n  }\n}\n',
  });
  await vscode.window.showTextDocument(ordinaryDocument);
  await vscode.commands.executeCommand('code-depth-gradations.refresh');

  const adversarialDocument = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content: `${' '.repeat(20_001)}value`,
  });
  await vscode.window.showTextDocument(adversarialDocument);
  await vscode.commands.executeCommand('code-depth-gradations.refresh');

  await vscode.commands.executeCommand('workbench.action.closeAllGroups');
}
