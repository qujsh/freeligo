import { z } from "zod";
import { documentSchema } from "../domain/noteDocument";
import type { Note } from "../domain/notes";
import { AccountError } from "./accountProfile";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const noteSchema = z.object({ recordNo: z.string(), title: z.string().nullable(), bodyText: z.string(), document: documentSchema.nullish(), references:z.array(z.object({recordNo:z.string(),title:z.string().nullable(),occurredAt:z.string()})).optional(), occurredAt: z.string().datetime({ offset: true }), visibility: z.enum(["PUBLIC", "PRIVATE"]), reviewStatus: z.string().nullable(), images: z.array(z.string()) });
const pageSchema = z.object({ items: z.array(noteSchema), total: z.number().int().nonnegative(), nextCursor: z.string().nullable(), hasMore: z.boolean() });
/** 私有接口只接受当前会话，所有响应在服务边界校验；不回退为本机数据。 */
async function request<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}/api/v1/c/notes/${path}`, { credentials: "include", signal });
  const envelope = z.object({ success: z.boolean(), msg: z.unknown(), errorCode: z.string().nullable().optional(), errorMsg: z.string().nullable().optional() }).safeParse(await response.json().catch(() => null));
  if (!response.ok || (envelope.success && !envelope.data.success)) throw new AccountError(envelope.success ? envelope.data.errorMsg || "本人笔记读取失败" : "本人笔记读取失败", response.status, envelope.success ? envelope.data.errorCode || "HTTP_ERROR" : "HTTP_ERROR");
  if (!envelope.success) throw new AccountError("接口数据格式不匹配", response.status, "INVALID_API_RESPONSE");
  const data = schema.safeParse(envelope.data.msg);
  if (!data.success) throw new AccountError("接口数据格式不匹配", response.status, "INVALID_API_RESPONSE");
  return data.data;
}
/** 私有图片只允许本端鉴权入口，不能信任正文中的外站URL。 */
function media(path: string) { return path.startsWith("/api/v1/c/notes/media?") ? `${base}${path}` : undefined; }
function toNote(value: z.infer<typeof noteSchema>): Note {
  const images = value.images.map(media).filter((url): url is string => !!url);
  return { id: value.recordNo, title: value.title?.trim() || value.bodyText.slice(0, 40) || "图片笔记", titleIsExcerpt: !value.title?.trim(), summary: value.bodyText.slice(0, 160), content: value.bodyText, document: value.document ?? undefined, references:value.references, category: "life", tags: [], author: "", date: new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(value.occurredAt)), own: true, remote: true, imageUrl: images[0], imageUrls: images,
    statusLabel: value.visibility === "PUBLIC" ? "已公开" : ["queued", "running"].includes(value.reviewStatus ?? "") ? "审核中" : value.reviewStatus === "failed" ? "审核失败 · 仅自己可见" : value.reviewStatus === "rejected" ? "未通过 · 仅自己可见" : "仅自己可见" };
}
export const ownedNotes = {
  /** 服务端按本人范围搜索与分页，正式记录不混入编辑副本和回收站。 */
  async list(keyword: string, cursor?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ keyword, pageSize: "20" }); if (cursor) params.set("cursor", cursor);
    const page = await request(`records?${params}`, pageSchema, signal);
    return { ...page, items: page.items.map(toNote) };
  },
  /** 独立读取本人完整正文，不用列表摘要替代详情。 */
  async detail(id: string, signal?: AbortSignal) { return toNote(await request(`record?${new URLSearchParams({ recordNo: id })}`, noteSchema, signal)); },
};
