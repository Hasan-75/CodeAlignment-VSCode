import { AlignmentKey, KeyShortcut } from "./models";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const xmlTypes = new Set([".xaml", ".xml", ".html", ".xhtml", ".aspx", ".master", ".cshtml"]);

const scopeSelectorLineValues = " { } }; ( )";

export const scopeSelectorRegex: string = (() => {
  const items = scopeSelectorLineValues
    .split(" ")
    .filter((item) => item.length > 0)
    .map(escapeRegex)
    .join("|");
  return `^\\s*(${items}|)\\s*$`;
})();

export const defaultShortcuts: KeyShortcut[] = [
  {
    key: AlignmentKey.EqualsPlus,
    alignment: "(^|[\\w\\s])(?<x>=)",
    useRegex: true,
    addSpace: true,
  },
  { key: AlignmentKey.M, alignment: "m_" },
  { key: AlignmentKey.Quotes, alignment: '"' },
  { key: AlignmentKey.Period, alignment: ".", alignFromCaret: true },
  {
    key: AlignmentKey.Space,
    alignment: "\\s+(?<x>[^\\s])",
    alignFromCaret: true,
    useRegex: true,
  },
];

export function getShortcut(key: AlignmentKey, language?: string): KeyShortcut | undefined {
  return defaultShortcuts
    .filter((item) => item.key === key && (item.language === undefined || item.language === language))
    .sort((a, b) => {
      const aMatch = a.language === language ? 0 : 1;
      const bMatch = b.language === language ? 0 : 1;
      return aMatch - bMatch;
    })[0];
}
