import { z } from "zod";
import { documentSchema } from "../domain/noteDocument";
import type { Note } from "../domain/notes";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const authorSchema = z
  .object({ nickname: z.string().nullable(), avatarUrl: z.string().nullable() })
  .nullable();
const cardSchema = z.object({
  recordNo: z.string(),
  title: z.string().nullable(),
  summary: z.string(),
  coverUrl: z.string().nullable(),
  publishedAt: z.string().datetime({ offset: true }),
  author: authorSchema,
});
const pageSchema = z.object({
  items: z.array(cardSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
const detailSchema = z.object({
  recordNo: z.string(),
  title: z.string().nullable(),
  bodyText: z.string(),
  document: documentSchema.nullish(),
  publishedAt: z.string().datetime({ offset: true }),
  author: authorSchema,
  images: z.array(z.object({ mediaNo: z.string(), contentUrl: z.string() })),
  references: z.array(
    z.object({
      recordNo: z.string(),
      title: z.string().nullable(),
      occurredAt: z.string(),
    }),
  ),
});
export class PublicNoteError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
/** 仅接受后端公开媒体入口，不把协议内容转换成任意外站图片请求。 */
export function publicMediaUrl(path: string | null): string | undefined {
  if (
    !path ||
    ![
      "/api/v1/notes/media/public-content?",
      "/api/v1/shares/media/public-content?",
      "/api/v1/c/discovery/avatar?",
    ].some((prefix) => path.startsWith(prefix))
  )
    return undefined;
  return `${base}${path}`;
}
/** 在网络边界校验响应，区分HTTP、业务与协议异常，不回退为演示数据。 */
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  body?: { value: boolean },
): Promise<T> {
  const response = await fetch(`${base}/api/v1/c/discovery/${path}`, {
    signal,
    credentials: "include",
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw: unknown = await response.json().catch(() => null);
  const envelope = z
    .object({
      success: z.boolean(),
      msg: z.unknown(),
      errorCode: z.string().nullable().optional(),
      errorMsg: z.string().nullable().optional(),
    })
    .safeParse(raw);
  if (!response.ok)
    throw new PublicNoteError(
      envelope.success
        ? envelope.data.errorMsg || "公开内容暂时无法读取"
        : "公开内容暂时无法读取",
      envelope.success ? envelope.data.errorCode || "HTTP_ERROR" : "HTTP_ERROR",
      response.status,
    );
  if (!envelope.success)
    throw new PublicNoteError(
      "接口数据格式不匹配，请稍后重试",
      "INVALID_API_RESPONSE",
      response.status,
    );
  if (!envelope.data.success)
    throw new PublicNoteError(
      envelope.data.errorMsg || "读取失败",
      envelope.data.errorCode || "BUSINESS_ERROR",
      response.status,
    );
  const parsed = schema.safeParse(envelope.data.msg);
  if (!parsed.success)
    throw new PublicNoteError(
      "接口数据格式不匹配，请稍后重试",
      "INVALID_API_RESPONSE",
      response.status,
    );
  return parsed.data;
}
function toNote(card: z.infer<typeof cardSchema>): Note {
  return {
    id: card.recordNo,
    title: card.title?.trim() || card.summary.slice(0, 40) || "图片笔记",
    titleIsExcerpt: !card.title?.trim(),
    summary: card.summary,
    content: card.summary,
    category: "life",
    tags: [],
    author: card.author?.nickname ?? "",
    date: new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      timeZone: "Asia/Shanghai",
    }).format(new Date(card.publishedAt)),
    imageUrl: publicMediaUrl(card.coverUrl),
    avatarUrl: publicMediaUrl(card.author?.avatarUrl ?? null),
    remote: true,
  };
}
const engagementSchema = z.object({
  likeCount: z.number().int().nonnegative(),
  favoriteCount: z.number().int().nonnegative(),
  liked: z.boolean(),
  favorited: z.boolean(),
});
export type NoteEngagement = z.infer<typeof engagementSchema>;
export type EngagementKind = "like" | "favorite";
export const publicNotes = {
  /** 私有收藏与公开列表共用安全卡片模型，查询由后端按当前账号限定。 */
  async favorites(keyword: string, cursor?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ keyword, pageSize: "20" });
    if (cursor) params.set("cursor", cursor);
    const page = await request(`favorites?${params}`, pageSchema, signal);
    return { ...page, items: page.items.map(toNote) };
  },
  /** 列表按最多50条分批查询，不把未知统计补成零。 */
  async engagements(ids: string[], signal?: AbortSignal) {
    const batches = Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) =>
      ids.slice(i * 50, i * 50 + 50),
    );
    const states = await Promise.all(
      batches.map((batch) =>
        request(
          `engagements?${new URLSearchParams({ recordNos: batch.join(",") })}`,
          z.record(z.string(), engagementSchema),
          signal,
        ),
      ),
    );
    return Object.assign({}, ...states) as Record<string, NoteEngagement>;
  },
  /** 显式设置而非翻转，重复请求不会重复计数。 */
  setEngagement(id: string, kind: EngagementKind, value: boolean) {
    return request(
      `${kind}?${new URLSearchParams({ recordNo: id })}`,
      engagementSchema,
      undefined,
      { value },
    );
  },
  /** 关键词变化由查询键隔离，翻页只传递当前查询的服务器游标。 */
  async list(keyword: string, cursor?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ keyword, pageSize: "20" });
    if (cursor) params.set("cursor", cursor);
    const page = await request(`records?${params}`, pageSchema, signal);
    return { ...page, items: page.items.map(toNote) };
  },
  /** 详情始终独立查询，不将列表摘要当作完整正文；撤回公开的404由页面明确呈现。 */
  async detail(id: string, signal?: AbortSignal): Promise<Note> {
    const data = await request(
      `record?${new URLSearchParams({ recordNo: id })}`,
      detailSchema,
      signal,
    );
    const note = toNote({
      ...data,
      summary: data.bodyText.slice(0, 160),
      coverUrl: data.images[0]?.contentUrl ?? null,
    });
    return {
      ...note,
      content: data.bodyText,
      document: data.document ?? undefined,
      imageUrls: data.images
        .map((image) => publicMediaUrl(image.contentUrl))
        .filter((url): url is string => !!url),
      references: data.references,
    };
  },
};
