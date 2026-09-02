import { DelimiterFinder, DelimiterResult, delimiterResult } from "./models";

export class NormalDelimiterFinder implements DelimiterFinder {
  getIndex(source: string, delimiter: string, minIndex: number, tabSize: number): DelimiterResult {
    const adjustedMin = this.tabbifyIndex(source, minIndex, tabSize);
    const result = source.length >= adjustedMin ? source.indexOf(delimiter, adjustedMin) : -1;
    return delimiterResult(result);
  }

  tabbifyIndex(source: string, minIndex: number, tabSize: number): number {
    let adjustment = 0;
    let working = source;
    let index = working.indexOf("\t");

    while (index >= 0 && index < minIndex) {
      const padding = tabSize - (index % tabSize);
      if (index + padding - 1 <= minIndex) {
        adjustment += padding - 1;
      }
      working = working.slice(0, index) + " ".repeat(padding) + working.slice(index + 1);
      index = working.indexOf("\t");
    }

    return minIndex - adjustment;
  }
}

export class RegexDelimiterFinder extends NormalDelimiterFinder {
  override getIndex(source: string, delimiter: string, minIndex: number, tabSize: number): DelimiterResult {
    const adjustedMin = this.tabbifyIndex(source, minIndex, tabSize);
    if (source.length < adjustedMin) {
      return delimiterResult(-1);
    }

    const match = new RegExp(delimiter, "d").exec(source.substring(adjustedMin));
    if (!match) {
      return delimiterResult(-1);
    }

    return {
      compareIndex: adjustedMin + this.groupIndex(match, ["compare", "x"]),
      insertIndex: adjustedMin + this.groupIndex(match, ["insert", "compare", "x"]),
    };
  }

  private groupIndex(match: RegExpExecArray, keys: string[]): number {
    const indices = (match as RegExpExecArray & { indices?: { groups?: Record<string, [number, number] | undefined> } }).indices;
    for (const key of keys) {
      const range = indices?.groups?.[key];
      if (range) {
        return range[0];
      }
    }
    return match.index;
  }
}
