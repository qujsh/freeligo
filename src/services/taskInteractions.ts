import { z } from "zod";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const interestSchema = z.object({
  id: z.number(),
  taskNo: z.string(),
  applicantId: z.number(),
  applicantName: z.string(),
  status: z.enum(["pending", "accepted", "rejected", "withdrawn"]),
  statement: z.string(),
  extras: z.string().nullable(),
  confirmedVersion: z.number(),
  attemptNo: z.number(),
  title: z.string(),
  currentVersion: z.number(),
  confirmationVersion: z.number(),
  recruitmentStatus: z.string(),
});
export type TaskInterest = z.infer<typeof interestSchema>;
export const stateSchema = z.object({
  favorite: z.boolean(),
  interest: interestSchema.nullable(),
});
export async function taskRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${base}/api/v1/${path}`, {
    credentials: "include",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const payload: unknown = await response.json().catch(() => null);
  const envelope = z
    .object({
      success: z.boolean(),
      msg: z.unknown(),
      errorMsg: z.string().nullable().optional(),
    })
    .safeParse(payload);
  if (!response.ok || !envelope.success || !envelope.data.success)
    throw new Error(
      envelope.success ? envelope.data.errorMsg || "操作失败" : "服务响应无效",
    );
  const result = schema.safeParse(envelope.data.msg);
  if (!result.success) throw new Error("接口数据格式无效");
  return result.data;
}
const taskNo = (id: string) => id.replace(/^PROJECT-/, "TASK-");
export const newRequestNo = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
export const interactions = {
  state: (id: string) =>
    taskRequest(
      `task-interactions/state?taskNo=${encodeURIComponent(taskNo(id))}`,
      stateSchema,
    ),
  favorite: (id: string, value: boolean) =>
    taskRequest("task-interactions/favorite", stateSchema, {
      taskNo: taskNo(id),
      value,
    }),
  favorites: () =>
    taskRequest("task-interactions/favorites", z.array(z.string())),
  submit: (
    id: string,
    version: number,
    statement: string,
    acknowledged: boolean,
    extras: unknown,
    requestNo = newRequestNo(),
  ) =>
    taskRequest("task-interactions/submit", interestSchema, {
      taskNo: taskNo(id),
      version,
      statement,
      acknowledged,
      extras: JSON.stringify(extras),
      requestNo,
    }),
  respond: (id: string, action: "withdraw" | "confirm", version = 0) =>
    taskRequest("task-interactions/respond", interestSchema, {
      taskNo: taskNo(id),
      action,
      version,
    }),
  mine: () => taskRequest("task-interactions/mine", z.array(interestSchema)),
};
const userSchema = z.object({ userNo: z.string(), nickname: z.string() });
export const account = {
  me: () => taskRequest("users/me", userSchema),
  send: (phone: string) =>
    taskRequest(
      "auth/sms/send",
      z.object({
        message: z.string(),
        developmentCode: z.string().nullable().optional(),
      }),
      { phone },
    ),
  login: (phone: string, code: string) =>
    taskRequest("auth/sms/login", userSchema, { phone, code }),
  logout: () => taskRequest("auth/logout", z.string(), {}),
};
