import { AlignmentDocument, Line, ScopeSelector, replaceTabs } from "./models";

export class GeneralScopeSelector implements ScopeSelector {
  constructor(
    private readonly scopeSelectorRegex: string,
    private readonly start?: number,
    private readonly end?: number
  ) {}

  getLinesToAlign(view: AlignmentDocument): Line[] {
    let from = this.start ?? view.startSelectionLineNumber;
    let to = this.end ?? view.endSelectionLineNumber;

    if (from === to) {
      let up: number | undefined;
      for (let i = from; i >= 0; i--) {
        if (this.isLineBlank(view, i)) {
          up = i;
          break;
        }
      }
      from = up !== undefined ? up + 1 : 0;

      let down: number | undefined;
      for (let i = to; i < view.lineCount; i++) {
        if (this.isLineBlank(view, i)) {
          down = i;
          break;
        }
      }
      to = down !== undefined ? down - 1 : view.lineCount - 1;
    }

    const lines: Line[] = [];
    for (let i = from; i <= to; i++) {
      lines.push(view.getLineFromLineNumber(i));
    }
    return lines;
  }

  private isLineBlank(view: AlignmentDocument, lineNo: number): boolean {
    return new RegExp(this.scopeSelectorRegex).test(view.getLineFromLineNumber(lineNo).text);
  }
}

export class XmlScopeSelector implements ScopeSelector {
  constructor(
    private readonly start?: number,
    private readonly end?: number
  ) {}

  getLinesToAlign(view: AlignmentDocument): Line[] {
    let from = this.start ?? view.startSelectionLineNumber;
    let to = this.end ?? view.endSelectionLineNumber;

    if (from === to) {
      const line = replaceTabs(view.getLineFromLineNumber(from).text, view.tabSize);
      const isMulti = this.isMultiLineTag(line);

      if (isMulti) {
        let found: number | undefined;
        for (let i = from; i >= 0; i--) {
          if (this.isMultiLineStart(view, i)) {
            found = i;
            break;
          }
        }
        from = found ?? 0;
      } else {
        let found: number | undefined;
        for (let i = from + 1; i >= 1; i--) {
          if (this.isNotSameScope(view, i - 1, line)) {
            found = i;
            break;
          }
        }
        from = found ?? 0;
      }

      if (isMulti) {
        let found: number | undefined;
        for (let i = to; i < view.lineCount; i++) {
          if (this.isMultiLineEnd(view, i)) {
            found = i;
            break;
          }
        }
        to = found ?? view.lineCount - 1;
      } else {
        let found: number | undefined;
        for (let i = to - 1; i < view.lineCount - 1; i++) {
          if (this.isNotSameScope(view, i + 1, line)) {
            found = i;
            break;
          }
        }
        to = found ?? view.lineCount - 1;
      }
    }

    const lines: Line[] = [];
    for (let i = from; i <= to; i++) {
      lines.push(view.getLineFromLineNumber(i));
    }
    return lines;
  }

  private isMultiLineTag(line: string): boolean {
    const trimmed = line.trim();
    return !trimmed.startsWith("<") || !trimmed.includes(">");
  }

  private isMultiLineStart(view: AlignmentDocument, lineNo: number): boolean {
    const line = view.getLineFromLineNumber(lineNo).text.trim();
    return line.length === 0 || line.startsWith("<");
  }

  private isMultiLineEnd(view: AlignmentDocument, lineNo: number): boolean {
    const line = view.getLineFromLineNumber(lineNo).text.trim();
    return line.length === 0 || line.includes(">");
  }

  private isNotSameScope(view: AlignmentDocument, lineNo: number, original: string): boolean {
    const line = replaceTabs(view.getLineFromLineNumber(lineNo).text, view.tabSize);
    const lineIndent = line.length - line.trimStart().length;
    const originalIndent = original.length - original.trimStart().length;
    return line.trim().length === 0 || lineIndent !== originalIndent;
  }
}
