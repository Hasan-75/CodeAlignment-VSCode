import * as vscode from "vscode";
import { AlignFunctions } from "./alignment/alignFunctions";
import { AlignmentKey } from "./alignment/models";
import { promptForAlignment } from "./alignByDialog";
import { KeyGrabSession } from "./keyGrab";
import { VsCodeDocument } from "./vscodeDocument";

function functions(context: vscode.ExtensionContext, grab: KeyGrabSession): AlignFunctions | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  return new AlignFunctions(
    new VsCodeDocument(editor),
    (fromCaret) => promptForAlignment(context, fromCaret),
    (viewModel) => {
      void grab.start(viewModel, async () => {
        const next = functions(context, grab);
        await next?.alignByDialog(true);
      });
    }
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const grab = new KeyGrabSession();

  context.subscriptions.push(
    vscode.commands.registerCommand("codealignment.alignByKey", () => {
      functions(context, grab)?.alignByKey();
    }),
    vscode.commands.registerCommand("codealignment.alignByDialog", async () => {
      await functions(context, grab)?.alignByDialog();
    }),
    vscode.commands.registerCommand("codealignment.alignFromCaret", async () => {
      await functions(context, grab)?.alignByDialog(true);
    }),
    vscode.commands.registerCommand("codealignment.alignByEquals", () => {
      void functions(context, grab)?.alignByKeyShortcut(AlignmentKey.EqualsPlus);
    }),
    vscode.commands.registerCommand("codealignment.alignByEqualsEquals", () => {
      void functions(context, grab)?.alignBy("==");
    }),
    vscode.commands.registerCommand("codealignment.alignByMUnderscore", () => {
      void functions(context, grab)?.alignByKeyShortcut(AlignmentKey.M);
    }),
    vscode.commands.registerCommand("codealignment.alignByQuote", () => {
      void functions(context, grab)?.alignByKeyShortcut(AlignmentKey.Quotes);
    }),
    vscode.commands.registerCommand("codealignment.alignByPeriod", () => {
      void functions(context, grab)?.alignByKeyShortcut(AlignmentKey.Period);
    }),
    vscode.commands.registerCommand("codealignment.alignBySpace", () => {
      void functions(context, grab)?.alignByKeyShortcut(AlignmentKey.Space);
    }),
    vscode.commands.registerCommand("codealignment.cancelKeyGrab", () => {
      grab.cancel();
    }),
    vscode.commands.registerCommand("codealignment.keyGrabBackspace", async () => {
      await grab.backspace();
    })
  );
}

export function deactivate(): void {}
