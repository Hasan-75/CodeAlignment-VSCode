import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AlignFunctions, AlignmentViewModel } from "../alignment/alignFunctions";
import { LineDetails } from "../alignment/alignment";
import { NormalDelimiterFinder, RegexDelimiterFinder } from "../alignment/finders";
import { AlignmentDocument, AlignmentEdit, AlignmentKey, Line } from "../alignment/models";
import { getShortcut, scopeSelectorRegex } from "../alignment/defaultShortcuts";
import { GeneralScopeSelector } from "../alignment/selectors";

class MutableLine implements Line {
  constructor(
    public position: number,
    public text: string
  ) {}
}

class InMemoryEdit implements AlignmentEdit {
  insert(line: Line, position: number, text: string): boolean {
    const target = line as MutableLine;
    target.text = target.text.slice(0, position) + text + target.text.slice(position);
    return true;
  }

  commit(): void {}
}

class InMemoryDocument implements AlignmentDocument {
  private readonly lines: MutableLine[];

  constructor(
    texts: string[],
    public startSelectionLineNumber = 0,
    public endSelectionLineNumber = 0,
    public caretColumn = 0,
    public convertTabsToSpaces = true,
    public tabSize = 4,
    public fileType = ".cs"
  ) {
    this.lines = texts.map((text, index) => new MutableLine(index * 100, text));
  }

  get lineCount(): number {
    return this.lines.length;
  }

  getLineFromLineNumber(lineNo: number): Line {
    return this.lines[lineNo];
  }

  startEdit(): AlignmentEdit {
    return new InMemoryEdit();
  }

  refresh(): void {}

  texts(): string[] {
    return this.lines.map((line) => line.text);
  }
}

async function align(
  lines: string[],
  delimiter: string,
  options: { fromCaret?: boolean; useRegex?: boolean; addSpace?: boolean; start?: number; end?: number } = {}
): Promise<string[]> {
  const document = new InMemoryDocument(lines, options.start ?? 0, options.end ?? 0);
  await new AlignFunctions(document, () => undefined, () => undefined).alignBy(
    delimiter,
    options.fromCaret ?? false,
    options.useRegex ?? false,
    options.addSpace ?? false
  );
  return document.texts();
}

describe("NormalDelimiterFinder", () => {
  const finder = new NormalDelimiterFinder();

  it("getIndex", () => {
    assert.equal(finder.getIndex("a", "a", 0, 4).compareIndex, 0);
    assert.equal(finder.getIndex("\ta", "a", 4, 4).compareIndex, 1);
    assert.equal(finder.getIndex(" \ta", "a", 4, 4).compareIndex, 2);
    assert.equal(finder.getIndex("\t   a", "a", 3, 4).compareIndex, 4);
  });

  it("tabbifyIndex", () => {
    assert.equal(finder.tabbifyIndex("\ta", 5, 4), 2);
    assert.equal(finder.tabbifyIndex("\ta", 2, 4), 2);
    assert.equal(finder.tabbifyIndex("\ta", 3, 4), 0);
    assert.equal(finder.tabbifyIndex("  a", 3, 1), 3);
  });
});

describe("RegexDelimiterFinder", () => {
  const finder = new RegexDelimiterFinder();

  it("named group x", () => {
    const result = finder.getIndex("var x=1", "(^|[\\w\\s])(?<x>=)", 0, 4);
    assert.equal(result.compareIndex, 5);
    assert.equal(result.insertIndex, 5);
  });

  it("space shortcut", () => {
    const result = finder.getIndex("foo   bar", "\\s+(?<x>[^\\s])", 0, 4);
    assert.equal(result.compareIndex, 6);
    assert.equal(result.insertIndex, 6);
  });

  it("missing match", () => {
    assert.equal(finder.getIndex("abc", "=", 0, 4).compareIndex, -1);
  });
});

describe("Alignment", () => {
  it("aligns equals with addSpace", async () => {
    assert.deepEqual(
      await align(["var x=1", "var longer=2"], "(^|[\\w\\s])(?<x>=)", { useRegex: true, addSpace: true }),
      ["var x      =1", "var longer =2"]
    );
  });

  it("aligns literal delimiter", async () => {
    assert.deepEqual(await align(["a = 1", "longer = 2"], "="), ["a      = 1", "longer = 2"]);
  });

  it("expands scope to braces when no selection", async () => {
    const document = new InMemoryDocument(["{", "a = 1", "bb = 2", "}", "c = 3"], 1, 1);
    await new AlignFunctions(document, () => undefined, () => undefined).alignBy("=");
    assert.deepEqual(document.texts(), ["{", "a  = 1", "bb = 2", "}", "c = 3"]);
  });

  it("uses selection when multiple lines selected", async () => {
    const document = new InMemoryDocument(["a = 1", "bb = 2", "ccc = 3"], 0, 1);
    await new AlignFunctions(document, () => undefined, () => undefined).alignBy("=");
    assert.deepEqual(document.texts(), ["a  = 1", "bb = 2", "ccc = 3"]);
  });

  it("chained align starts after previous column", async () => {
    const document = new InMemoryDocument(["a = 1 = 2", "bb = 10 = 3"], 0, 1);
    const functions = new AlignFunctions(document, () => undefined, () => undefined);
    const viewModel = new AlignmentViewModel(functions, functions.createAlignment());
    await viewModel.performAlign(AlignmentKey.EqualsPlus, false);
    await viewModel.performAlign(AlignmentKey.EqualsPlus, false);
    assert.deepEqual(document.texts(), ["a  = 1  = 2", "bb = 10 = 3"]);
  });
});

describe("LineDetails", () => {
  it("addSpace when no space before delimiter", () => {
    const details = new LineDetails(new MutableLine(0, "x=1"), new NormalDelimiterFinder(), "=", 0, 4);
    assert.equal(details.getPositionToAlignTo(true, 4), 2);
  });

  it("no extra space when already spaced", () => {
    const details = new LineDetails(new MutableLine(0, "x =1"), new NormalDelimiterFinder(), "=", 0, 4);
    assert.equal(details.getPositionToAlignTo(true, 4), 2);
  });
});

describe("GeneralScopeSelector", () => {
  it("stops at braces", () => {
    const document = new InMemoryDocument(["before", "{", "  a", "  b", "}", "after"], 2, 2);
    const lines = new GeneralScopeSelector(scopeSelectorRegex).getLinesToAlign(document).map((line) => line.text);
    assert.deepEqual(lines, ["  a", "  b"]);
  });
});

describe("getShortcut", () => {
  it("maps equals", () => {
    const shortcut = getShortcut(AlignmentKey.EqualsPlus);
    assert.ok(shortcut?.useRegex);
    assert.ok(shortcut?.addSpace);
  });
});
