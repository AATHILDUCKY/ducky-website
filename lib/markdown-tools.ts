/** Accept the author's triple-apostrophe fences without touching apostrophes inside real code fences. */
export function normalizeMarkdownFences(content: string) {
  let normalFence: string | null = null;
  let apostropheFence = false;
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const standard = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
      if (!apostropheFence && standard) {
        if (!normalFence) normalFence = standard[1];
        else if (
          standard[1][0] === normalFence[0] &&
          standard[1].length >= normalFence.length &&
          !standard[2].trim()
        )
          normalFence = null;
        return line;
      }
      if (normalFence) return line;
      const match = line.match(/^(\s{0,3})'''([\w+#.-]*)\s*$/);
      if (!match) return line;
      if (apostropheFence && match[2]) return line;
      apostropheFence = !apostropheFence;
      return match[1] + '```' + match[2];
    })
    .join('\n');
}
export function looksLikeMarkdown(content: string) {
  return /(^|\n)\s{0,3}(#{1,6} |[-*+] |\d+\. |>|```|~~~|''')|\*\*[^*]+\*\*|!?\[[^\]]+\]\([^)]+\)|(^|\n)\s*\|.+\|/m.test(
    content,
  );
}
