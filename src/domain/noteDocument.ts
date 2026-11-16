import { z } from "zod";
export interface NoteDocumentNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: NoteDocumentNode[];
}
export const documentSchema: z.ZodType<NoteDocumentNode> = z.lazy(() =>
  z.object({
    type: z.enum([
      "doc",
      "paragraph",
      "text",
      "bulletList",
      "orderedList",
      "listItem",
      "hardBreak",
    ]),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(["bold", "italic", "link", "highlight"]),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    content: z.array(documentSchema).optional(),
  }),
);
export const emptyDocument = (): NoteDocumentNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
/** 旧本机正文按段落转换成结构化文档，不将文本当HTML执行。 */
export function textDocument(text: string): NoteDocumentNode {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) => ({
        type: "paragraph",
        ...(line ? { content: [{ type: "text", text: line }] } : {}),
      })),
  };
}
/** 序列化仅保留后端支持的节点及属性，避免编辑器默认属性污染持久化契约。 */
export function cleanDocument(node: NoteDocumentNode): NoteDocumentNode {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.type === "orderedList" && node.attrs?.start
      ? { attrs: { start: node.attrs.start } }
      : {}),
    ...(node.marks?.length
      ? {
          marks: node.marks.map((mark) => ({
            type: mark.type,
            ...(mark.type === "link"
              ? { attrs: { href: mark.attrs?.href } }
              : mark.type === "highlight"
                ? { attrs: { color: mark.attrs?.color || "orange" } }
                : {}),
          })),
        }
      : {}),
    ...(node.content ? { content: node.content.map(cleanDocument) } : {}),
  };
}
export function documentText(node: NoteDocumentNode): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  return (
    (node.content || []).map(documentText).join("") +
    (node.type === "paragraph" ? "\n" : "")
  );
}
