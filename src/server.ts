import * as http from 'http';
import * as net from 'net';
import * as vscode from 'vscode';

export class PushReminderServer {
  private server: http.Server | undefined;
  private port: number | undefined;

  async start(): Promise<number> {
    this.port = await findAvailablePort(34567);

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

      vscode.window
        .showWarningMessage(message, { modal: true }, 'Yes, push', 'No, cancel')
        .then((answer) => {
          if (answer === 'Yes, push') {
            res.writeHead(200);
            res.end('proceed');
          } else {
            res.writeHead(200);
            res.end('abort');
          }
        });
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, '127.0.0.1', resolve);
    });

    return this.port;
  }

  stop(): void {
    this.server?.close();
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
