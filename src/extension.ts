import * as vscode from 'vscode';
import { PushReminderServer } from './server';
import { HookInstaller } from './hookInstaller';

let server: PushReminderServer | undefined;
let installer: HookInstaller | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  server = new PushReminderServer();

  let port: number;
  try {
    port = await server.start();
  } catch (err) {
    vscode.window.showErrorMessage(`Push Reminder: failed to start server — ${String(err)}`);
    return;
  }

  installer = new HookInstaller(port);

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    tryInstall(installer, folder);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      for (const folder of e.added) {
        tryInstall(installer!, folder);
      }
    }),
    { dispose: () => server?.stop() }
  );
}

export function deactivate(): void {
  server?.stop();
}

function tryInstall(inst: HookInstaller, folder: vscode.WorkspaceFolder): void {
  try {
    inst.install(folder.uri.fsPath);
  } catch (err) {
    vscode.window.showWarningMessage(
      `Push Reminder: could not install hook in ${folder.name} — ${String(err)}`
    );
  }
}
