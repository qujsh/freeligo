import { z } from "zod";
import { AccountError } from "./accountProfile";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const documentSchema = z.object({ id: z.number().int().positive(), kind: z.enum(["TERMS", "PRIVACY"]), version: z.number().int().positive(), html: z.string(), contentHash: z.string() });
export type LegalDocument = z.infer<typeof documentSchema>;
export interface LegalAcceptance { accepted: true; termsId: number; privacyId: number }
/** 协议读写边界校验；稳定错误码用于要求重新获取版本，不按中文文案判断。 */
async function request<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal, body?: unknown): Promise<T> {
  const response = await fetch(`${base}/api/v1/c/legal/${path}`, { credentials: "include", signal, ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const envelope = z.object({ success: z.boolean(), msg: z.unknown(), errorCode: z.string().nullish(), errorMsg: z.string().nullish() }).safeParse(await response.json().catch(() => null));
  if (!response.ok || (envelope.success && !envelope.data.success)) throw new AccountError(envelope.success ? envelope.data.errorMsg || "协议服务暂不可用" : "协议服务暂不可用", response.status, envelope.success ? envelope.data.errorCode || "HTTP_ERROR" : "HTTP_ERROR");
  const result = envelope.success ? schema.safeParse(envelope.data.msg) : null;
  if (!result?.success) throw new AccountError("协议接口数据格式不匹配", response.status, "INVALID_API_RESPONSE");
  return result.data;
}
export const legal = {
  current: (signal?: AbortSignal) => request("current", z.array(documentSchema).length(2).refine(items => new Set(items.map(i => i.kind)).size === 2), signal),
  document: (kind: string, version: number, signal?: AbortSignal) => request(`document?${new URLSearchParams({ kind, version: String(version) })}`, documentSchema, signal),
  login: (phone: string, credential: string, method: "sms" | "password", acceptance: LegalAcceptance) => request("login", z.object({ userNo: z.string(), nickname: z.string() }), undefined, { phone, credential, method, ...acceptance }),
};
