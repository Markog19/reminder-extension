import * as http from 'http';
import * as net from 'net';
import * as fs from 'fs';
import * as vscode from 'vscode';

export class PushReminderServer {
  private server: http.Server | undefined;

  async start(): Promise<number> {
    const port = await findAvailablePort(34567);

    this.server = http.createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/pre-push') {
        res.writeHead(404);
        res.end();
        return;
      }

      const config = vscode.workspace.getConfiguration('pushReminder');
      const message = config.get<string>(
        'message',
        'Have you completed all required checks before pushing?'
      );

      void vscode.window
        .showWarningMessage(message, { modal: true }, 'Yes, push', 'No, cancel')
        .then((answer) => {
          if (answer === 'Yes, push') {
            const checklistEnabled = config.get<boolean>('obsidianChecklist.enabled', false);
            const checklistPath = config.get<string>('obsidianChecklist.filePath', '');
            if (checklistEnabled && checklistPath) {
              resetChecklist(checklistPath);
            }
            res.writeHead(200);
            res.end('proceed');
          } else {
            res.writeHead(200);
            res.end('abort');
          }
        });
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(port, '127.0.0.1', resolve);
    });

    return port;
  }

  stop(): void {
    this.server?.close();
  }
}

function resetChecklist(filePath: string): void {
  const trimmedPath = filePath.trim();
  try {
    const content = fs.readFileSync(trimmedPath, 'utf8');
    const reset = content.replace(/^([-*]\s+)\[x\]/gim, '$1[ ]');
    if (reset !== content) {
      fs.writeFileSync(trimmedPath, reset, 'utf8');
      vscode.window.showInformationMessage('Push Reminder: checklist reset successfully.');
    } else {
      vscode.window.showInformationMessage('Push Reminder: checklist was already clear, nothing to reset.');
    }
  } catch (err) {
    vscode.window.showWarningMessage(
      `Push Reminder: could not reset checklist — ${String(err)}`
    );
  }
}

function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number): void => {
      const probe = net.createServer();
      probe.listen(port, '127.0.0.1', () => {
        probe.close(() => resolve(port));
      });
      probe.on('error', () => {
        if (port < startPort + 100) {
          tryPort(port + 1);
        } else {
          reject(new Error('No available port found in range'));
        }
      });
    };
    tryPort(startPort);
  });
}
