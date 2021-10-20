import { TSESTree } from "@typescript-eslint/types";

export function normalizeIndent(strings: TemplateStringsArray) {
  const codeLines = strings[0].split('\n');
  const match = codeLines[1].match(/\s+/);
  const leftPadding = match ? match[0].length : 0;
  return codeLines.map(line => line.substr(leftPadding)).join('\n');
}

export function isArrowFn(fn: string) { return /^[^{]+?=>/.test(fn.toString()); };

export const hookNames: string[] = [
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useImperativeHandle',
  'useLayoutEffect',
  'useDebugValue',
]

export function isHook(node: TSESTree.Node) {
  if (node.type === "Identifier") {
    return Boolean(hookNames.find(a => a.includes(node.name)));
  } else if (
    node.type === "MemberExpression" &&
    !node.computed &&
    isHook(node.property)
  ) {
    const obj = node.object;
    return obj.type === "Identifier" && obj.name === "React";
  } else {
    return false;
  }
}
