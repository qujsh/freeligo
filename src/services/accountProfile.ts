import { z } from "zod";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const profileSchema = z.object({
  userNo: z.string(),
  nickname: z.string(),
  phone: z.string(),
  bio: z.string().nullable(),
  avatarMediaNo: z.string().nullable(),
});
export type AccountProfile = z.infer<typeof profileSchema>;
export interface ProfileInput {
  nickname: string;
  bio: string;
  avatarMediaNo: string;
}
const sessionSchema = z.object({
  sessionNo: z.string(),
  device: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
});
export class AccountError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
/** 个人账号接口仅使用当前Cookie身份；在边界校验协议，不把管理DTO或用户编号作为请求范围。 */
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}/api/v1/${path}`, {
    credentials: "include",
    signal,
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const envelope = z
    .object({
      success: z.boolean(),
      msg: z.unknown(),
      errorMsg: z.string().nullable().optional(),
      errorCode: z.string().nullable().optional(),
    })
    .safeParse(await response.json().catch(() => null));
  if (!response.ok || (envelope.success && !envelope.data.success))
    throw new AccountError(
      envelope.success
        ? envelope.data.errorMsg || "账号操作失败，请重试"
        : "账号服务暂不可用",
      response.status,
      envelope.success ? envelope.data.errorCode || "HTTP_ERROR" : "HTTP_ERROR",
    );
  const result = envelope.success ? schema.safeParse(envelope.data.msg) : null;
  if (!result?.success)
    throw new AccountError(
      "账号接口数据格式不匹配",
      response.status,
      "INVALID_API_RESPONSE",
    );
  return result.data;
}
export function ownAvatarUrl(mediaNo: string | null | undefined) {
  return mediaNo
    ? `${base}/api/v1/users/avatar/content?${new URLSearchParams({ mediaNo })}`
    : undefined;
}
export const accountProfile = {
  me: (signal?: AbortSignal) =>
    request("users/me", profileSchema, undefined, signal),
  save: (input: ProfileInput) =>
    request("users/profile/save", profileSchema, input),
  sessions: (signal?: AbortSignal) =>
    request("users/sessions", z.array(sessionSchema), undefined, signal),
  revoke: (sessionNo: string) =>
    request(
      `users/sessions/revoke?${new URLSearchParams({ sessionNo })}`,
      z.string(),
      {},
    ),
  passwordStatus: (signal?: AbortSignal) =>
    request(
      "users/password/status",
      z.object({ hasPassword: z.boolean() }),
      undefined,
      signal,
    ),
  sendCode: (phone: string, purpose: "set_password" | "reset_password") =>
    request(
      "auth/sms/send",
      z.object({ message: z.string(), retryAfterSeconds: z.number() }),
      { phone, purpose },
    ),
  password: (
    phone: string,
    code: string,
    password: string,
    existing: boolean,
  ) =>
    request(`auth/password/${existing ? "reset" : "set"}`, z.string(), {
      phone,
      code,
      password,
    }),
  /** 头像先向本人接口登记再直传云端，不向云存储携带本站Cookie；确认后才允许绑定资料。 */
  async uploadAvatar(file: File): Promise<string> {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size < 1 ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error("请选择5MB以内的JPG、PNG或WebP图片");
    const ticket = await request(
      "users/avatar/upload-token",
      z.object({
        mediaNo: z.string(),
        key: z.string(),
        token: z.string(),
        uploadUrl: z.string().url(),
      }),
      { filename: file.name, mimeType: file.type, size: file.size },
    );
    if (new URL(ticket.uploadUrl).protocol !== "https:")
      throw new Error("头像上传地址无效");
    const form = new FormData();
    form.set("token", ticket.token);
    form.set("key", ticket.key);
    form.set("file", file);
    const response = await fetch(ticket.uploadUrl, {
      method: "POST",
      body: form,
      credentials: "omit",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error("头像上传失败，请重试");
    await request(
      `users/avatar/complete?${new URLSearchParams({ mediaNo: ticket.mediaNo })}`,
      z.object({ mediaNo: z.string(), contentUrl: z.string() }),
      {},
    );
    return ticket.mediaNo;
  },
};
