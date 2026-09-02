# Code Alignment for VS Code

A [Visual Studio Code](https://code.visualstudio.com/) extension that aligns code into columns by a delimiter.

It is inspired by the Visual Studio extension [Code alignment](https://github.com/cpmcgrath/codealignment) by [Chris McGrath](https://github.com/cpmcgrath). A [Rider plugin](https://github.com/Hasan-75/CodeAlignment-Rider) provides the same workflow in JetBrains Rider.

This extension is **not** on the Marketplace. Install a `.vsix` from disk (GitHub Releases or a local build).

```
var x      = 1
var longer = 2
```

## Install from VSIX

1. Get `codealignment-vscode-1.0.0.vsix` from [Releases](https://github.com/Hasan-75/CodeAlignment-VSCode/releases), or build it (see [Build](#build)).
2. Open VS Code.
3. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
4. Click the **…** menu at the top of the Extensions view.
5. Choose **Install from VSIX…**.
6. Select the `.vsix` file.

To confirm it loaded: Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Code alignment: Align by key**.

To update, install the newer VSIX the same way. To remove it: Extensions → **Code Alignment** → Uninstall.

## Shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| **Align by key** | `Ctrl+=` | `Cmd+=` (also `Ctrl+=`) |
| **Align by…** (any phrase) | `Ctrl+Shift+=` | `Cmd+Shift+=` (also `Ctrl+Shift+=`) |
| Align from caret | Command Palette → Code alignment: Align from caret | same |

**Align by key:** press the shortcut, then a delimiter key:

- `=` aligns on `=` (same regex as Visual Studio / Rider, with a leading space)
- Shift+`=` types `+` in VS Code; that still aligns on `=` **from the caret**
- An uppercase letter (Shift+letter) aligns from the caret
- `"` `.` Space `m` use the Visual Studio defaults (`m_`, period from caret, and so on)
- After a key, you stay in align mode to **chain**; press **Esc** to finish
- **Backspace** opens Align from caret

**Align by…** opens a popup: type a delimiter/phrase (for example `{ get;` or `.Should`), then toggle **Align from caret** and **Use regex** on the same popup (icons on the right of the field). **Use regex** starts off; leave it off unless the delimiter is a pattern. Recent phrases are remembered.

On macOS, `Cmd+=` is often **Zoom In**. Rebind under **Keyboard Shortcuts**, or use `Ctrl+=`.

Presets (`==`, quote, period, space, `m_`) are in the Command Palette under **Code alignment**.

Inlay hints are not in the file. Alignment uses document columns, so hints can make `=` look shifted.

## Build

Requires [Node.js 20+](https://nodejs.org/).

```bash
npm install
npm test
npx @vscode/vsce package --no-dependencies
```

Output: `codealignment-vscode-1.0.0.vsix`.

Press **F5** in this folder (Run Extension) to try it in an Extension Development Host.

## Releasing

GitHub Actions publishes a [GitHub Release](https://github.com/Hasan-75/CodeAlignment-VSCode/releases) when you push a `v*` tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Bump `version` in `package.json` first so the VSIX name matches.

## Related

- Visual Studio / Notepad++: [cpmcgrath/codealignment](https://github.com/cpmcgrath/codealignment)
- Rider: [Hasan-75/CodeAlignment-Rider](https://github.com/Hasan-75/CodeAlignment-Rider)
