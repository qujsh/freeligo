import { z } from "zod";
import { payloadSchema } from "../../../services/noteEditor";
import { documentText } from "../../../domain/noteDocument";
import type { Note } from "../../../domain/notes";
export const submissionSchema = z.object({
  recordNo: z.string().optional(),
  clientRequestNo: z.string(),
  expectedVersion: z.number().optional(),
  expectedDraftVersion: z.number().nullable().optional(),
  action: z.enum(["SAVE", "DRAFT"]),
  record: payloadSchema,
});
export const browserDraftSchema = z.object({
  record: payloadSchema,
  recordNo: z.string().optional(),
  version: z.number().optional(),
  draftVersion: z.number().nullable().optional(),
  clientRequestNo: z.string(),
  attempt: submissionSchema.optional(),
  updatedAt: z.string(),
});
export type BrowserDraft = z.infer<typeof browserDraftSchema>;
export const draftPrefix = (user: string) => `freeligo.note-composer.${user}.`;
export function readBrowserDraft(
  user: string,
  suffix: string,
): BrowserDraft | undefined {
  const raw = localStorage.getItem(draftPrefix(user) + suffix);
  if (!raw) return;
  const result = browserDraftSchema.safeParse(JSON.parse(raw));
  return result.success ? result.data : undefined;
}
/** 草稿仅在当前账号下读取，不把别的账号或旧演示身份的内容拼入列表。 */
export function browserDraftNotes(user: string): Note[] {
  const result: Note[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(draftPrefix(user))) continue;
    const suffix = key.slice(draftPrefix(user).length);
    try {
      const value = readBrowserDraft(user, suffix);
      if (!value) continue;
      const body = documentText(value.record.document).trimEnd();
      result.push({
        id: `LOCAL:${suffix}`,
        title: value.record.title || body.slice(0, 40) || "未命名草稿",
        summary: body.slice(0, 160),
        content: body,
        category: "life",
        tags: [],
        author: "",
        date: new Date(value.updatedAt).toLocaleDateString("zh-CN"),
        own: true,
        draftKey: suffix,
        editRecordNo: value.recordNo,
      });
    } catch {
      /* 单条损坏不阻止其他草稿恢复，也不删除原始备份。 */
    }
  }
  return result;
}
