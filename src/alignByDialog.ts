import * as vscode from "vscode";
import { AlignmentPrompt } from "./alignment/alignFunctions";

const RECENT_KEY = "codealignment.recentDelimiters";

export async function promptForAlignment(
  context: vscode.ExtensionContext,
  fromCaret: boolean
): Promise<AlignmentPrompt | undefined> {
  const recent = context.workspaceState.get<string[]>(RECENT_KEY, []);

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

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: AlignmentPrompt | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      box.hide();
      box.dispose();
      resolve(value);
    };

    box.onDidTriggerButton(() => {
      refreshPrompt();
    });

    box.onDidChangeValue(() => {
      box.validationMessage = undefined;
    });

    box.onDidAccept(() => {
      const delimiter = box.value;
      if (!delimiter) {
        box.validationMessage = "Enter a delimiter";
        return;
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
