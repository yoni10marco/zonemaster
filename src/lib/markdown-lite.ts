// A deliberately tiny formatter for the coach's replies: paragraphs, bullet and
// numbered lists, and **bold**. Everything else stays plain text, and the result
// is data (not HTML), so it is rendered through React and can never inject markup.

export type Inline = { text: string; bold?: boolean }
export type Block =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }

const BULLET = /^\s*(?:[-*•])\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

export function parseInline(text: string): Inline[] {
  const inlines: Inline[] = []
  const parts = text.split(/\*\*(.+?)\*\*/g) // odd indexes are the bold captures
  parts.forEach((part, i) => {
    // An unmatched "**" (common while a reply is still streaming) is dropped
    // rather than shown as stray asterisks.
    const clean = part.replaceAll("**", "")
    if (clean) inlines.push(i % 2 === 1 ? { text: clean, bold: true } : { text: clean })
  })
  return inlines
}

export function parseMarkdownLite(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", inlines: parseInline(paragraph.join("\n")) })
      paragraph = []
    }
  }

  const addListItem = (ordered: boolean, content: string) => {
    flushParagraph()
    const last = blocks[blocks.length - 1]
    const item = parseInline(content)
    if (last?.type === "list" && last.ordered === ordered) last.items.push(item)
    else blocks.push({ type: "list", ordered, items: [item] })
  }

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim() === "") {
      flushParagraph()
      continue
    }
    const bullet = BULLET.exec(line)
    if (bullet) {
      addListItem(false, bullet[1])
      continue
    }
    const numbered = NUMBERED.exec(line)
    if (numbered) {
      addListItem(true, numbered[1])
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      // Headings are not part of the supported format; show them as bold text.
      flushParagraph()
      blocks.push({ type: "paragraph", inlines: [{ text: heading[1].replaceAll("**", ""), bold: true }] })
      continue
    }
    paragraph.push(line)
  }
  flushParagraph()
  return blocks
}
