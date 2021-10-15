export function normalizeIndent(strings: TemplateStringsArray) {
  const codeLines = strings[0].split('\n');
  const match = codeLines[1].match(/\s+/);
  const leftPadding = match ? match[0].length : 0;
  return codeLines.map(line => line.substr(leftPadding)).join('\n');
}
