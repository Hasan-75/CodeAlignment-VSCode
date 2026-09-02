export type DelimiterResult = { compareIndex: number; insertIndex: number };

export function delimiterResult(index: number): DelimiterResult {
  return { compareIndex: index, insertIndex: index };
}

export interface Line {
  readonly position: number;
  readonly text: string;
}

export interface AlignmentEdit {
  insert(line: Line, position: number, text: string): boolean;
  commit(): void | Promise<void>;
}

export interface AlignmentDocument {
  readonly lineCount: number;
  readonly startSelectionLineNumber: number;
  readonly endSelectionLineNumber: number;
  readonly caretColumn: number;
  readonly convertTabsToSpaces: boolean;
  readonly tabSize: number;
  readonly fileType: string;
  getLineFromLineNumber(lineNo: number): Line;
  startEdit(): AlignmentEdit;
  refresh(): void;
}

export type DelimiterFinder = {
  getIndex(source: string, delimiter: string, minIndex: number, tabSize: number): DelimiterResult;
};

export type ScopeSelector = {
  getLinesToAlign(view: AlignmentDocument): Line[];
};

export enum AlignmentKey {
  D0 = "D0",
  D1 = "D1",
  D2 = "D2",
  D3 = "D3",
  D4 = "D4",
  D5 = "D5",
  D6 = "D6",
  D7 = "D7",
  D8 = "D8",
  D9 = "D9",
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  G = "G",
  H = "H",
  I = "I",
  J = "J",
  K = "K",
  L = "L",
  M = "M",
  N = "N",
  O = "O",
  P = "P",
  Q = "Q",
  R = "R",
  S = "S",
  T = "T",
  U = "U",
  V = "V",
  W = "W",
  X = "X",
  Y = "Y",
  Z = "Z",
  Space = "Space",
  EqualsPlus = "EqualsPlus",
  Minus = "Minus",
  Period = "Period",
  Quotes = "Quotes",
  Comma = "Comma",
  Semicolon = "Semicolon",
  Question = "Question",
  Tilde = "Tilde",
  OpenBrackets = "OpenBrackets",
  CloseBrackets = "CloseBrackets",
  Pipe = "Pipe",
}

export type KeyShortcut = {
  key: AlignmentKey;
  alignment: string;
  language?: string;
  alignFromCaret?: boolean;
  useRegex?: boolean;
  addSpace?: boolean;
};

export function replaceTabs(value: string, tabSize: number): string {
  let result = value;
  let index = result.indexOf("\t");
  while (index >= 0) {
    const padding = tabSize - (index % tabSize);
    result = result.slice(0, index) + " ".repeat(padding) + result.slice(index + 1);
    index = result.indexOf("\t");
  }
  return result;
}
