import * as vscode from "vscode";
import { AlignmentKey } from "./alignment/models";
import { AlignmentViewModel } from "./alignment/alignFunctions";

export function keyFromTypedText(text: string): { key: AlignmentKey; forceFromCaret: boolean } | undefined {
  if (text === "\b" || text === "") {
    return undefined;
  }
  if (text === " ") {
    return { key: AlignmentKey.Space, forceFromCaret: false };
  }
  if (text === "=") {
    return { key: AlignmentKey.EqualsPlus, forceFromCaret: false };
  }
  if (text === "+") {
    return { key: AlignmentKey.EqualsPlus, forceFromCaret: true };
  }
  if (text === '"') {
    return { key: AlignmentKey.Quotes, forceFromCaret: false };
  }
  if (text === ".") {
    return { key: AlignmentKey.Period, forceFromCaret: false };
  }
  if (text === ",") {
    return { key: AlignmentKey.Comma, forceFromCaret: false };
  }
  if (text === "-") {
    return { key: AlignmentKey.Minus, forceFromCaret: false };
  }
  if (text === ";") {
    return { key: AlignmentKey.Semicolon, forceFromCaret: false };
  }
  if (text === "'" || text === "`") {
    return { key: AlignmentKey.Quotes, forceFromCaret: false };
  }
  if (text.length === 1) {
    const ch = text;
    const upper = ch.toUpperCase();
    const forceFromCaret = ch !== ch.toLowerCase() && ch === upper;
    if (upper >= "A" && upper <= "Z") {
      return { key: AlignmentKey[upper as keyof typeof AlignmentKey] as AlignmentKey, forceFromCaret };
    }
    if (ch >= "0" && ch <= "9") {
      return { key: AlignmentKey[`D${ch}` as keyof typeof AlignmentKey] as AlignmentKey, forceFromCaret: false };
    }
  }
  return undefined;
}

export class KeyGrabSession {
  private active = false;
  private viewModel: AlignmentViewModel | undefined;
  private status: vscode.StatusBarItem | undefined;
  private typeDisposable: vscode.Disposable | undefined;
  private onBackspace: (() => Promise<void>) | undefined;

  get isActive(): boolean {
    return this.active;
  }

  async start(viewModel: AlignmentViewModel, onBackspace: () => Promise<void>): Promise<void> {
    if (this.active) {
      this.cancel();
      return;
    }
    this.viewModel = viewModel;
    this.onBackspace = onBackspace;
    this.active = true;
    await vscode.commands.executeCommand("setContext", "codealignment.keyGrab", true);
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.status.text = "$(symbol-key) Code alignment: press a key (Esc to finish)";
    this.status.show();

    this.typeDisposable = vscode.commands.registerCommand("type", async (args: { text: string }) => {
      if (!this.active) {
        await vscode.commands.executeCommand("default:type", args);
        return;
      }
      const mapped = keyFromTypedText(args.text ?? "");
      if (!mapped || !this.viewModel) {
        this.cancel();
        return;
      }
      await this.viewModel.performAlign(mapped.key, mapped.forceFromCaret);
      if (this.status) {
        this.status.text = "$(symbol-key) Code alignment: another key to chain, Esc to finish";
      }
    });
  }

  async backspace(): Promise<void> {
    const cb = this.onBackspace;
    this.cancel();
    if (cb) {
      await cb();
    }
  }

  cancel(): void {
    this.active = false;
    this.viewModel = undefined;
    this.onBackspace = undefined;
    this.typeDisposable?.dispose();
    this.typeDisposable = undefined;
    this.status?.dispose();
    this.status = undefined;
    void vscode.commands.executeCommand("setContext", "codealignment.keyGrab", false);
  }
}
