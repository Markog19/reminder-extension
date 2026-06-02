import * as fs from 'fs';
import * as path from 'path';

const HOOK_MARKER = '# push-reminder-vscode-managed';

export class HookInstaller {
  constructor(private readonly port: number) {}

  install(workspacePath: string): void {
    const gitDir = resolveGitDir(workspacePath);
    if (!gitDir) {
      return;
    }

    fs.writeFileSync(path.join(gitDir, 'push-reminder-port'), String(this.port), 'utf8');

    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    const hookPath = path.join(hooksDir, 'pre-push');
    const snippet = buildHookSnippet();

    if (fs.existsSync(hookPath)) {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (!existing.includes(HOOK_MARKER)) {
        fs.writeFileSync(hookPath, existing.trimEnd() + '\n\n' + snippet, 'utf8');
      }
    } else {
      fs.writeFileSync(hookPath, '#!/bin/sh\n\n' + snippet, 'utf8');
    }

    fs.chmodSync(hookPath, 0o755);
  }

  uninstall(workspacePath: string): void {
    const gitDir = resolveGitDir(workspacePath);
    if (!gitDir) {
      return;
    }

    const portFile = path.join(gitDir, 'push-reminder-port');
    if (fs.existsSync(portFile)) {
      fs.rmSync(portFile);
    }

    const hookPath = path.join(gitDir, 'hooks', 'pre-push');
    if (!fs.existsSync(hookPath)) {
      return;
    }

    const content = fs.readFileSync(hookPath, 'utf8');
    const cleaned = removeSnippet(content);

    if (cleaned.trim() === '#!/bin/sh') {
      fs.rmSync(hookPath);
    } else {
      fs.writeFileSync(hookPath, cleaned, 'utf8');
    }
  }
}

function resolveGitDir(workspacePath: string): string | undefined {
  const gitPath = path.join(workspacePath, '.git');
  if (!fs.existsSync(gitPath)) {
    return undefined;
  }

  const stat = fs.statSync(gitPath);
  if (stat.isDirectory()) {
    return gitPath;
  }

  // Worktree: .git is a file like "gitdir: /path/to/real/git/dir"
  const content = fs.readFileSync(gitPath, 'utf8').trim();
  const match = content.match(/^gitdir:\s*(.+)$/);
  return match ? match[1] : undefined;
}

function buildHookSnippet(): string {
  return `${HOOK_MARKER}
PORT_FILE="$(git rev-parse --git-dir)/push-reminder-port"
if [ -f "$PORT_FILE" ]; then
  PORT=$(cat "$PORT_FILE")
  RESPONSE=$(curl -s --max-time 60 -X POST "http://127.0.0.1:$PORT/pre-push" 2>/dev/null)
  if [ "$RESPONSE" = "abort" ]; then
    echo "Push cancelled by Push Reminder." >&2
    exit 1
  fi
fi
# ${HOOK_MARKER}-end
`;
}

function removeSnippet(content: string): string {
  const start = content.indexOf(HOOK_MARKER);
  if (start === -1) {
    return content;
  }
  const endMarker = `# ${HOOK_MARKER}-end`;
  const end = content.indexOf(endMarker);
  if (end === -1) {
    return content.slice(0, start).trimEnd() + '\n';
  }
  return (
    content.slice(0, start).trimEnd() +
    '\n' +
    content.slice(end + endMarker.length).trimStart()
  );
}
