import { AlignmentDocument, DelimiterFinder, Line, replaceTabs } from "./models";
import { NormalDelimiterFinder } from "./finders";
import { ScopeSelector } from "./models";

export class LineDetails {
  readonly line: Line;
  readonly index: number;
  readonly position: number;

  constructor(line: Line, finder: DelimiterFinder, delimiter: string, minIndex: number, tabSize: number) {
    this.line = line;
    this.index = finder.getIndex(line.text, delimiter, minIndex, tabSize).insertIndex;
    this.position = finder.getIndex(replaceTabs(line.text, tabSize), delimiter, minIndex, tabSize).compareIndex;
  }

  getPositionToAlignTo(addSpace: boolean, tabSize: number): number {
    const withoutTabs = replaceTabs(this.line.text, tabSize);
    if (addSpace && this.position > 0 && withoutTabs[this.position - 1] !== " ") {
      return this.position + 1;
    }
    return this.position;
  }
}

export class Alignment {
  finder: DelimiterFinder = new NormalDelimiterFinder();

  constructor(
    public view: AlignmentDocument,
    public selector: ScopeSelector,
    public useIdeTabSettings = false
  ) {}

  async performAlignment(delimiter: string, minIndex = 0, addSpace = false): Promise<number> {
    const data = this.selector
      .getLinesToAlign(this.view)
      .map((line) => new LineDetails(line, this.finder, delimiter, minIndex, this.view.tabSize))
      .filter((item) => item.index >= 0);

    if (data.length === 0) {
      return -1;
    }

    const maxPosition = Math.max(...data.map((item) => item.position));
    const targetPosition = Math.max(
      ...data.filter((item) => item.position === maxPosition).map((item) => item.getPositionToAlignTo(addSpace, this.view.tabSize))
    );

    await this.commitChanges(data, targetPosition);
    return targetPosition;
  }

  private async commitChanges(data: LineDetails[], targetPosition: number): Promise<void> {
    const edit = this.view.startEdit();
    for (const change of data) {
      if (!edit.insert(change.line, change.index, this.spacesToInsert(change.position, targetPosition))) {
        return;
      }
    }
    await Promise.resolve(edit.commit());
  }

  private spacesToInsert(startIndex: number, endIndex: number): string {
    const useSpaces = this.view.convertTabsToSpaces;
    if (useSpaces || !this.useIdeTabSettings) {
      return " ".repeat(Math.max(0, endIndex - startIndex));
    }

    const spaces = endIndex % this.view.tabSize;
    const tabs = Math.ceil((endIndex - spaces - startIndex) / this.view.tabSize);
    if (tabs === 0) {
      return " ".repeat(Math.max(0, endIndex - startIndex));
    }
    return "\t".repeat(tabs) + " ".repeat(spaces);
  }
}
