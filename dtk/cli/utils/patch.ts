export function injectAtSentinel(content: string, sentinel: string, line: string): string {
  const marker = `// dtk:${sentinel}`;
  if (!content.includes(marker)) throw new Error(`Sentinel not found: ${marker}`);
  if (content.includes(line.trim())) return content;
  return content.replace(marker, `${line}\n${marker}`);
}
