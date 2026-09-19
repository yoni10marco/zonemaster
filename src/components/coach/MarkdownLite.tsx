import { parseMarkdownLite, type Inline } from "@/lib/markdown-lite"

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((inline, i) =>
        inline.bold ? <strong key={i}>{inline.text}</strong> : <span key={i}>{inline.text}</span>
      )}
    </>
  )
}

/** Renders the coach's lightly formatted reply (paragraphs, lists, bold) as safe React nodes. */
export function MarkdownLite({ text }: { text: string }) {
  const blocks = parseMarkdownLite(text)
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className="whitespace-pre-line">
              <Inlines inlines={block.inlines} />
            </p>
          )
        }
        const List = block.ordered ? "ol" : "ul"
        return (
          <List key={i} className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Inlines inlines={item} />
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}
