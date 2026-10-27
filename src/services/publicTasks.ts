import { z } from "zod";
import type { Opportunity, SearchQuery, ProjectTask } from "../domain/models";
import { mockService } from "./mock";
export const isLive = import.meta.env.VITE_DATA_SOURCE !== "mock";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export const mediaUrl = (path: string) =>
  path.startsWith("/api/") ? `${base}${path}` : path;
const categorySchema = z.object({
  code: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  enabled: z.boolean(),
});
const projectTaskSchema: z.ZodType<ProjectTask> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(["module", "feature", "work", "subtask"]),
    name: z.string(),
    description: z.string().nullable(),
    role: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    children: z.array(projectTaskSchema),
  }),
);
const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tasks: z.array(projectTaskSchema),
});
export const rewardItemSchema = z.object({
  type: z.enum(["cash", "goods", "service"]),
  title: z.string(),
  pricing: z.string().nullable(),
  amountMin: z.number().nullable(),
  amountMax: z.number().nullable(),
  unit: z.string().nullable(),
  quantity: z.number().nullable(),
  condition: z.string().nullable(),
  description: z.string().nullable(),
  handover: z.string().nullable(),
});
const contentSchema = z.object({
  details: z
    .object({
      goal: z.string(),
      collaboration: z.string().nullable(),
      scopeConfirmed: z.boolean(),
      rewards: z.array(rewardItemSchema),
    })
    .nullable()
    .optional(),
  project: projectSchema.nullable().optional(),
  title: z.string(),
  summary: z.string(),
  categoryCode: z.string(),
  skills: z.array(z.string()),
  cityCode: z.string().nullable(),
  cityName: z.string().nullable(),
  workMode: z.enum(["remote", "onsite", "hybrid"]),
  rewardType: z.enum([
    "fixed",
    "range",
    "negotiable",
    "non_cash",
    "cash",
    "goods",
    "service",
    "mixed",
  ]),
  amountMin: z.number().nullable(),
  amountMax: z.number().nullable(),
  currency: z.literal("CNY"),
  unit: z.string(),
  budgetText: z.string().nullable(),
  effort: z.number().nullable(),
  effortUnit: z.string().nullable(),
  newcomer: z.boolean(),
  scope: z.array(z.string()),
  deliverables: z.array(z.string()),
  acceptance: z.array(z.string()),
  startDate: z.string().nullable(),
  deadline: z.string().nullable(),
  mediaNos: z.array(z.string()),
  coverMediaNo: z.string().nullable(),
});
const mediaSchema = z.object({
  mediaNo: z.string(),
  type: z.enum(["image", "video", "file"]),
  originalName: z.string().nullable().optional(),
  available: z.boolean().optional(),
  contentType: z.string(),
  size: z.number(),
  durationSeconds: z.number().nullable(),
  url: z.string(),
});
const taskSchema = z.object({
  version: z.number().optional(),
  recruitmentStatus: z.string().optional(),
  acceptedCount: z.number().optional(),
  taskNo: z.string(),
  projectNo: z.string().optional(),
  experience: z.string().nullable().optional(),
  recruitMode: z.string().nullable().optional(),
  categoryName: z.string(),
  content: contentSchema,
  publishedAt: z.string(),
  publisher: z.object({ userNo: z.string(), nickname: z.string() }),
  recruitCount: z.number(),
  coverUrl: z.string().nullable(),
  media: z.array(mediaSchema),
});
const pageSchema = z.object({
  items: z.array(taskSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export interface TaskPage {
  items: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
}
export interface BrowseQuery extends SearchQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  unit?: string;
}
export type Category = z.infer<typeof categorySchema>;
export async function requestPublic<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success)
    throw new Error(
      payload?.errorMsg ||
        `任务服务暂不可用（${response.status}），请检查后端是否已启动并完成迁移`,
    );
  const result = schema.safeParse(payload.msg);
  if (!result.success) throw new Error("公开任务接口响应格式不匹配");
  return result.data;
}
const mockCategories = [
  ["photography", "摄影影像"],
  ["design", "设计创意"],
  ["life_service", "生活服务"],
  ["education", "教育陪伴"],
  ["events", "活动执行"],
  ["technology_data", "技术与数据"],
  ["content_translation", "内容与翻译"],
];
export const categories = async (signal?: AbortSignal): Promise<Category[]> =>
  isLive
    ? requestPublic(
        "/api/v1/public/task-categories",
        z.array(categorySchema),
        signal,
      )
    : mockCategories.map(([code, name], i) => ({
        code: code!,
        name: name!,
        sortOrder: i,
        enabled: true,
      }));
const unitNames: Record<string, string> = {
  project: "项目",
  hour: "小时",
  day: "天",
  time: "次",
  item: "件",
};
function adapt(
  task: z.infer<typeof taskSchema>,
  kind: "task" | "project" = "task",
): Opportunity {
  const c = task.content;
  const amount = (n: number | null) =>
    n === null ? "" : n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const monetary = c.rewardType === "fixed" || c.rewardType === "range";
  const reward =
    c.rewardType === "fixed"
      ? amount(c.amountMin)
      : c.rewardType === "range"
        ? `${amount(c.amountMin)}–${amount(c.amountMax)}`
        : c.rewardType === "negotiable"
          ? c.budgetText?.trim() || "面议"
          : c.budgetText || "非现金报酬";
  const video = task.media.find((m) => m.type === "video");
  return {
    id:
      kind === "project"
        ? task.projectNo || task.taskNo.replace("TASK-", "PROJECT-")
        : task.taskNo,
    kind,
    projectId:
      kind === "task"
        ? task.projectNo || task.taskNo.replace("TASK-", "PROJECT-")
        : undefined,
    project: c.project || undefined,
    publicationTaskId: task.taskNo,
    experience: task.experience ?? undefined,
    recruitMode: task.recruitMode ?? undefined,
    title: kind === "project" ? c.project?.title || c.title : c.title,
    summary: kind === "project" ? (c.project?.summary ?? c.summary) : c.summary,
    category: task.categoryName,
    mode: ({ remote: "远程", onsite: "现场", hybrid: "混合" } as const)[
      c.workMode
    ],
    city: c.cityName || "",
    duration:
      c.effort === null
        ? ""
        : `${c.effort}${unitNames[c.effortUnit || ""] || ""}`,
    reward: c.details?.rewards.length
      ? c.details.rewards
          .map((r) =>
            r.type === "cash"
              ? `¥${amount(r.amountMin)}${r.pricing === "range" ? `–${amount(r.amountMax)}` : ""}`
              : r.title,
          )
          .join(" + ")
      : reward,
    unit: c.details ? "" : monetary ? unitNames[c.unit] || c.unit : "",
    skills: c.skills,
    tags: c.skills,
    publisher: task.publisher.nickname,
    publisherId: task.publisher.userNo,
    image: task.coverUrl ? mediaUrl(task.coverUrl) : undefined,
    video: video ? mediaUrl(video.url) : undefined,
    videoDuration: video?.durationSeconds ?? undefined,
    newcomer: c.newcomer,
    capacity: task.recruitCount,
    status:
      !task.recruitmentStatus || task.recruitmentStatus === "open"
        ? "open"
        : "closed",
    version: task.version,
    recruitmentStatus: task.recruitmentStatus,
    acceptedCount: task.acceptedCount,
    details: c.details ?? undefined,
    scope: c.scope,
    deliverables: c.deliverables,
    acceptance: c.acceptance,
    createdAt: task.publishedAt,
    source: "api",
    rewardPrefix: c.details ? "" : monetary ? "¥" : "",
    budgetText: c.budgetText || undefined,
    startDate: c.startDate || undefined,
    deadline: c.deadline || undefined,
    media: task.media.map((m) => ({ ...m, url: mediaUrl(m.url) })),
  };
}
export async function browse(
  query: BrowseQuery,
  signal?: AbortSignal,
): Promise<TaskPage> {
  const page = query.page ?? 1,
    pageSize = query.pageSize ?? 20;
  if (!isLive) {
    const categoryName = mockCategories.find(
      ([code]) => code === query.category,
    )?.[1];
    const data = await mockService.list({
      ...query,
      category:
        categoryName === "技术与数据"
          ? "商业支持"
          : categoryName || query.category,
    });
    const tasks = data.filter(
      (o) =>
        o.kind === (query.kind === "project" ? "project" : "task") &&
        o.status === "open",
    );
    if (query.sort === "latest")
      tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: tasks.slice((page - 1) * pageSize, page * pageSize),
      total: tasks.length,
      page,
      pageSize,
    };
  }
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sort: query.sort === "latest" ? "latest" : "recommended",
  });
  for (const [key, value] of Object.entries({
    keyword: query.keyword,
    categoryCode: query.category,
    cityCode: query.city,
    workMode: (
      { 远程: "remote", 现场: "onsite", 混合: "hybrid" } as Record<
        string,
        string
      >
    )[query.mode || ""],
    newcomer: query.newcomer ? "true" : undefined,
  }))
    if (value) params.set(key, value);
  if (query.budget) {
    params.set("unit", query.unit || "project");
    if (query.budget === "under1000") params.set("amountMax", "999.99");
    if (query.budget === "1000to3000") {
      params.set("amountMin", "1000");
      params.set("amountMax", "3000");
    }
    if (query.budget === "over3000") params.set("amountMin", "3000.01");
  }
  const result = await requestPublic(
    `/api/v1/public/${query.kind === "project" ? "projects" : "tasks"}/list?${params}`,
    pageSchema,
    signal,
  );
  return {
    ...result,
    items: result.items.map((task) =>
      adapt(task, query.kind === "project" ? "project" : "task"),
    ),
  };
}
export async function publicDetail(
  no: string,
  signal?: AbortSignal,
  confirmed = false,
) {
  if (!isLive) return mockService.detail(no);
  const project = no.startsWith("PROJECT-");
  return adapt(
    await requestPublic(
      confirmed
        ? `/api/v1/task-interactions/confirmed-detail?taskNo=${encodeURIComponent(no.replace(/^PROJECT-/, "TASK-"))}`
        : project
          ? `/api/v1/public/projects/detail?projectNo=${encodeURIComponent(no)}`
          : `/api/v1/public/tasks/detail?taskNo=${encodeURIComponent(no)}`,
      taskSchema,
      signal,
    ),
    project ? "project" : "task",
  );
}
const citySchema = z.object({ code: z.string(), name: z.string() });
export const cities = (signal?: AbortSignal) =>
  isLive
    ? requestPublic("/api/v1/public/task-cities", z.array(citySchema), signal)
    : Promise.resolve([
        { code: "杭州", name: "杭州" },
        { code: "上海", name: "上海" },
      ]);
