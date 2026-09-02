import * as vscode from "vscode";
import { AlignmentDocument, AlignmentEdit, Line } from "./alignment/models";
import { replaceTabs } from "./alignment/models";

class VsCodeLine implements Line {
  constructor(
    readonly position: number,
    readonly text: string
  ) {}
}

class VsCodeEdit implements AlignmentEdit {
  private readonly inserts: { offset: number; text: string }[] = [];

  constructor(private readonly document: vscode.TextDocument) {}

  insert(line: Line, position: number, text: string): boolean {
    this.inserts.push({ offset: line.position + position, text });
    return true;
  }

  async commit(): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const sorted = [...this.inserts].sort((a, b) => b.offset - a.offset);
    for (const item of sorted) {
      if (item.text.length === 0) {
        continue;
      }
      const pos = this.document.positionAt(item.offset);
      edit.insert(this.document.uri, pos, item.text);
    }
    await vscode.workspace.applyEdit(edit);
  }
}

export class VsCodeDocument implements AlignmentDocument {
  constructor(private readonly editor: vscode.TextEditor) {}

  get lineCount(): number {
    return this.editor.document.lineCount;
  }

  get startSelectionLineNumber(): number {
    const start = this.editor.selection.start;
    const end = this.editor.selection.end;
    return Math.min(start.line, end.line);
  }

  get endSelectionLineNumber(): number {
    const start = this.editor.selection.start;
    const end = this.editor.selection.end;
    let line = Math.max(start.line, end.line);
    const endPos = start.line <= end.line ? end : start;
    if (endPos.character === 0 && line > this.startSelectionLineNumber) {
      line -= 1;
    }
    return line;
  }

  get caretColumn(): number {
    const pos = this.editor.selection.active;
    const text = this.editor.document.lineAt(pos.line).text.slice(0, pos.character);
    return replaceTabs(text, this.tabSize).length;
  }

  get convertTabsToSpaces(): boolean {
    return this.editor.options.insertSpaces !== false;
  }

  get tabSize(): number {
    const size = this.editor.options.tabSize;
    return typeof size === "number" ? size : 4;
  }

  get fileType(): string {
    const name = this.editor.document.fileName;
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot).toLowerCase() : "";
  }

  getLineFromLineNumber(lineNo: number): Line {
    const line = this.editor.document.lineAt(lineNo);
    return new VsCodeLine(this.editor.document.offsetAt(line.range.start), line.text);
  }

  startEdit(): AlignmentEdit {
    return new VsCodeEdit(this.editor.document);
  }

  refresh(): void {}
}
