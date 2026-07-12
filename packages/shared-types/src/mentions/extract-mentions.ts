export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w{1,30})/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
