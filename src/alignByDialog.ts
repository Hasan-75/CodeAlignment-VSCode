import * as vscode from "vscode";
import { AlignmentPrompt } from "./alignment/alignFunctions";

const RECENT_KEY = "codealignment.recentDelimiters";

export async function promptForAlignment(
  context: vscode.ExtensionContext,
  fromCaret: boolean
): Promise<AlignmentPrompt | undefined> {
  const recent = context.workspaceState.get<string[]>(RECENT_KEY, []);
  const editor = vscode.window.activeTextEditor;

  const box = vscode.window.createInputBox();
  box.title = "Align by";
  box.placeholder = "Delimiter or phrase (example: { get;)";
  box.value = recent[0] ?? "";
  box.ignoreFocusOut = true;

  const fromCaretToggle = { checked: fromCaret };
  const regexToggle = { checked: false };
  const fromCaretButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("fold"),
    tooltip: "Align from caret",
    location: vscode.QuickInputButtonLocation.Input,
    toggle: fromCaretToggle,
  };
  const regexButton: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon("regex"),
    tooltip: "Use regex",
    location: vscode.QuickInputButtonLocation.Input,
    toggle: regexToggle,
  };
  box.buttons = [fromCaretButton, regexButton];

  const refreshPrompt = () => {
    box.prompt = `${mark(fromCaretToggle.checked)} Align from caret    ${mark(regexToggle.checked)} Use regex`;
  };
  refreshPrompt();

  // Match highlighting decoration (works for both regex and plain string)
  let matchDecoration: vscode.TextEditorDecorationType | undefined;
  if (editor) {
    matchDecoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: "rgba(255, 200, 0, 0.35)",
      border: "1px solid rgba(255, 165, 0, 0.8)",
      borderRadius: "2px",
      rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen,
    });
  }

  const updateHighlights = () => {
    if (!editor || !matchDecoration) {
      return;
    }

    const pattern = box.value;
    if (!pattern) {
      editor.setDecorations(matchDecoration, []);
      box.validationMessage = undefined;
      return;
    }

    const docText = editor.document.getText();
    const ranges: vscode.Range[] = [];

    if (regexToggle.checked) {
      // Regex mode
      try {
        const regex = new RegExp(pattern, "g");
        let match: RegExpExecArray | null;
        while ((match = regex.exec(docText)) !== null) {
          const start = editor.document.positionAt(match.index);
          const end = editor.document.positionAt(match.index + match[0].length);
          ranges.push(new vscode.Range(start, end));
          // Prevent infinite loop on zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
        box.validationMessage = undefined;
      } catch (err) {
        editor.setDecorations(matchDecoration, []);
        box.validationMessage = `Invalid regex: ${(err as Error).message}`;
        return;
      }
    } else {
      // Plain string mode — highlight every occurrence
      let searchFrom = 0;
      while (true) {
        const idx = docText.indexOf(pattern, searchFrom);
        if (idx === -1) {
          break;
        }
        const start = editor.document.positionAt(idx);
        const end = editor.document.positionAt(idx + pattern.length);
        ranges.push(new vscode.Range(start, end));
        searchFrom = idx + 1;
      }
      box.validationMessage = undefined;
    }

    editor.setDecorations(matchDecoration, ranges);
  };

  // Initial highlight
  updateHighlights();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: AlignmentPrompt | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      if (editor && matchDecoration) {
        editor.setDecorations(matchDecoration, []);
        matchDecoration.dispose();
      }
      box.hide();
      box.dispose();
      resolve(value);
    };

    box.onDidTriggerButton(() => {
      refreshPrompt();
      updateHighlights();
    });

    box.onDidChangeValue(() => {
      box.validationMessage = undefined;
      updateHighlights();
    });

    box.onDidAccept(() => {
      const delimiter = box.value;
      if (!delimiter) {
        box.validationMessage = "Enter a delimiter";
        return;
      }
      if (regexToggle.checked) {
        try {
          new RegExp(delimiter);
        } catch (err) {
          box.validationMessage = `Invalid regex: ${(err as Error).message}`;
          return;
        }
      }
      const nextRecent = [delimiter, ...recent.filter((item) => item !== delimiter)].slice(0, 20);
      void context.workspaceState.update(RECENT_KEY, nextRecent);
      finish({
        delimiter,
        alignFromCaret: fromCaretToggle.checked,
        useRegex: regexToggle.checked,
      });
    });

    box.onDidHide(() => finish(undefined));
    box.show();
  });
}

function mark(on: boolean): string {
  return on ? "[x]" : "[ ]";
}
