import { z } from "zod";
import { documentSchema } from "../domain/noteDocument";
import { AccountError } from "./accountProfile";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const payloadSchema = z.object({
  title: z.string().nullable(),
  document: documentSchema,
  documentSchemaVersion: z.literal(1),
  occurredAt: z.string().datetime({ offset: true }),
  occurredTimezone: z.string(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  mediaNos: z.array(z.string()).max(9),
  referenceNos: z.array(z.string()).max(50),
});
export type NotePayload = z.infer<typeof payloadSchema>;
export const editorSchema = z.object({
  recordNo: z.string(),
  status: z.enum(["SAVED", "DRAFT"]),
  version: z.number().int().positive(),
  draftVersion: z.number().int().positive().nullable(),
  record: payloadSchema,
});
export const savedSchema = editorSchema
  .omit({ record: true })
  .extend({
    visibility: z.enum(["PRIVATE", "PUBLIC"]),
    reviewStatus: z.string().nullable(),
  });
export type NoteSaved = z.infer<typeof savedSchema>;
export type EditorData = z.infer<typeof editorSchema>;
export interface NoteSubmission {
  recordNo?: string;
  clientRequestNo: string;
  expectedVersion?: number;
  expectedDraftVersion?: number | null;
  action: "SAVE" | "DRAFT";
  record: NotePayload;
}
const draftSchema = z.object({
  recordNo: z.string(),
  title: z.string().nullable(),
  summary: z.string(),
  updatedAt: z.string(),
  editCopy: z.boolean(),
});
/** 笔记网络边界统一处理协议与业务错误，Cookie身份不进入请求正文。 */
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}/api/v1/c/notes/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    signal,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const envelope = z
    .object({
      success: z.boolean(),
      msg: z.unknown(),
      errorCode: z.string().nullable().optional(),
      errorMsg: z.string().nullable().optional(),
    })
    .safeParse(await response.json().catch(() => null));
  if (!response.ok || (envelope.success && !envelope.data.success))
    throw new AccountError(
      envelope.success
        ? envelope.data.errorMsg || "笔记操作失败"
        : "笔记服务暂不可用",
      response.status,
      envelope.success ? envelope.data.errorCode || "HTTP_ERROR" : "HTTP_ERROR",
    );
  const result = envelope.success ? schema.safeParse(envelope.data.msg) : null;
  if (!result?.success)
    throw new AccountError(
      "笔记接口数据格式不匹配",
      response.status,
      "INVALID_API_RESPONSE",
    );
  return result.data;
}
export const noteEditor = {
  load: (recordNo: string, signal?: AbortSignal) =>
    request(
      `editor?${new URLSearchParams({ recordNo })}`,
      editorSchema,
      undefined,
      signal,
    ),
  /** 新建请求编号须跨失败重试保持不变；编辑主/副本版本均由上次读取结果携带。 */
  save: (input: NoteSubmission, signal?: AbortSignal) =>
    request(
      input.recordNo
        ? `save?${new URLSearchParams({ recordNo: input.recordNo })}`
        : "create",
      savedSchema,
      input,
      signal,
    ),
  drafts: (keyword: string, cursor?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ keyword, pageSize: "20" });
    if (cursor) params.set("cursor", cursor);
    return request(
      `drafts?${params}`,
      z.object({
        items: z.array(draftSchema),
        total: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        nextCursor: z.string().nullable(),
      }),
      undefined,
      signal,
    );
  },
  retry: (recordNo: string) =>
    request(
      `review/retry?${new URLSearchParams({ recordNo })}`,
      z.string(),
      {},
    ),
  /** 笔记图片直传不附带本站Cookie；服务器核验成功才返回可绑定媒体编号。 */
  async upload(file: File, signal?: AbortSignal): Promise<string> {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size < 1 ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error("请选择10MB以内的JPG、PNG或WebP图片");
    const ticket = await request(
      "media/upload-token",
      z.object({
        mediaNo: z.string(),
        key: z.string(),
        token: z.string(),
        uploadUrl: z.string().url(),
      }),
      { filename: file.name, mimeType: file.type, size: file.size },
      signal,
    );
    if (new URL(ticket.uploadUrl).protocol !== "https:")
      throw new Error("图片上传地址无效");
    const form = new FormData();
    form.set("key", ticket.key);
    form.set("token", ticket.token);
    form.set("file", file);
    const response = await fetch(ticket.uploadUrl, {
      method: "POST",
      credentials: "omit",
      body: form,
      signal: AbortSignal.any([
        signal || new AbortController().signal,
        AbortSignal.timeout(60000),
      ]),
    });
    if (!response.ok) throw new Error("图片上传失败，请重试");
    await request(
      `media/complete?${new URLSearchParams({ mediaNo: ticket.mediaNo })}`,
      z.object({ mediaNo: z.string(), contentUrl: z.string() }),
      {},
      signal,
    );
    return ticket.mediaNo;
  },
};
export function noteImageUrl(mediaNo: string) {
  return `${base}/api/v1/c/notes/media/preview?${new URLSearchParams({ mediaNo })}`;
}
