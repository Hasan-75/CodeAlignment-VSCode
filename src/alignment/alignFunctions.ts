import { Alignment } from "./alignment";
import { NormalDelimiterFinder, RegexDelimiterFinder } from "./finders";
import { AlignmentDocument } from "./models";
import { AlignmentKey } from "./models";
import { getShortcut, scopeSelectorRegex, xmlTypes } from "./defaultShortcuts";
import { GeneralScopeSelector, XmlScopeSelector } from "./selectors";
import { ScopeSelector } from "./models";

export type AlignmentPrompt = {
  delimiter: string;
  alignFromCaret: boolean;
  useRegex: boolean;
};

export class AlignFunctions {
  constructor(
    public document: AlignmentDocument,
    private readonly promptForAlignment: (fromCaret: boolean) => Promise<AlignmentPrompt | undefined> | AlignmentPrompt | undefined,
    private readonly showKeyGrabber: (viewModel: AlignmentViewModel) => void
  ) {}

  async alignBy(delimiter: string, alignFromCaret = false, useRegex = false, addSpace = false): Promise<void> {
    if (!delimiter) {
      return;
    }
    await this.createAlignment(useRegex).performAlignment(
      delimiter,
      alignFromCaret ? this.document.caretColumn : 0,
      addSpace
    );
  }

  async alignByKeyShortcut(key: AlignmentKey, forceFromCaret = false): Promise<void> {
    const shortcut = getShortcut(key, this.document.fileType);
    if (!shortcut) {
      return;
    }
    await this.alignBy(
      shortcut.alignment,
      forceFromCaret || !!shortcut.alignFromCaret,
      !!shortcut.useRegex,
      !!shortcut.addSpace
    );
  }

  async alignByDialog(alignFromCaret = false): Promise<void> {
    const result = await this.promptForAlignment(alignFromCaret);
    if (!result) {
      return;
    }
    await this.alignBy(result.delimiter, result.alignFromCaret, result.useRegex);
  }

  alignByKey(): void {
    this.showKeyGrabber(new AlignmentViewModel(this, this.createAlignment()));
  }

  createAlignment(useRegex = false): Alignment {
    const alignment = new Alignment(this.document, this.createSelector(), false);
    if (useRegex) {
      alignment.finder = new RegexDelimiterFinder();
    }
    return alignment;
  }

  private createSelector(): ScopeSelector {
    const start = this.document.startSelectionLineNumber;
    const end = this.document.endSelectionLineNumber;
    if (xmlTypes.has(this.document.fileType)) {
      return new XmlScopeSelector(start, end);
    }
    return new GeneralScopeSelector(scopeSelectorRegex, start, end);
  }
}

export class AlignmentViewModel {
  private lastAlignment = -1;

  constructor(
    private readonly functions: AlignFunctions,
    private readonly alignment: Alignment
  ) {}

  async alignFromPosition(): Promise<void> {
    await this.functions.alignByDialog(true);
  }

  async performAlign(key: AlignmentKey, forceFromCaret: boolean): Promise<number> {
    this.alignment.view.refresh();
    const shortcut = getShortcut(key, this.functions.document.fileType);
    if (!shortcut || !shortcut.alignment) {
      return -1;
    }

    this.alignment.finder = shortcut.useRegex ? new RegexDelimiterFinder() : new NormalDelimiterFinder();
    let minIndex = 0;
    if (this.lastAlignment !== -1) {
      minIndex = this.lastAlignment + 1;
    } else if (forceFromCaret || shortcut.alignFromCaret) {
      minIndex = this.functions.document.caretColumn;
    }
    this.lastAlignment = await this.alignment.performAlignment(shortcut.alignment, minIndex, !!shortcut.addSpace);
    return this.lastAlignment;
  }
}
