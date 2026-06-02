# Push Reminder

A VS Code extension that intercepts every `git push` and shows a modal confirmation dialog before it goes through. The push is blocked until you answer — useful as a last-chance checklist before code leaves your machine.

## How it works

When the extension activates, it:

1. Starts a local HTTP server (port 34567 or the next available port)
2. Installs a `pre-push` git hook in every workspace that contains a `.git` directory
3. The hook calls the server on every push; the server shows a VS Code modal dialog
4. If you click **Yes, push** the push proceeds; if you click **No, cancel** (or dismiss the dialog) the push is aborted

The hook is non-destructive — if a `pre-push` hook already exists, the extension appends its snippet rather than replacing the file.

## Requirements

- VS Code 1.80 or later
- `curl` available on your `PATH` (used by the git hook)
- A git repository open in your workspace

## Installation

### From the `.vsix` package (recommended)

1. Download or locate `push-reminder-0.0.1.vsix` from this repository
2. Open VS Code
3. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run **Extensions: Install from VSIX...**
4. Select the `.vsix` file and confir
5. Reload VS Code after installation — or run **Developer: Reload Window** from the Command Palette

### Build from source

```bash
git clone <repo-url>
cd push-reminder-extension
npm install
npm run compile
npx @vscode/vsce package  # produces push-reminder-0.0.1.vsix
```

Then install the generated `.vsix` as described above.

## Usage

The extension activates automatically when you open a folder that contains a `.git` directory. No manual setup is required.

Try it by running `git push` in any terminal — VS Code will pop a modal dialog asking:

> Have you completed all required checks before pushing?

- **Yes, push** — the push continues normally
- **No, cancel** / dismiss — the push is aborted with the message `Push cancelled by Push Reminder.`

## Configuration

Open VS Code settings (`Cmd+,` / `Ctrl+,`) and search for **Push Reminder**, or add the following to your `settings.json`:

```json
"pushReminder.message": "Have you completed all required checks before pushing?"
```

Change the value to any question or reminder you want displayed before each push.

## Uninstalling

Uninstalling the extension via the Extensions panel removes the VS Code side. The `pre-push` hook snippet is cleaned up automatically when the extension deactivates. If you want to manually remove it, open `.git/hooks/pre-push` in your repository and delete the lines between `# push-reminder-vscode-managed` and `# push-reminder-vscode-managed-end`.

## Notes

- The local server only listens on `127.0.0.1` (loopback) and is not accessible from the network
- If port 34567 is taken, the extension tries up to 100 subsequent ports automatically
- The hook respects git worktrees — it resolves the actual `.git` directory regardless of worktree layout
