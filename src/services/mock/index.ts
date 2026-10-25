import { opportunities, initialInterests } from "../../mocks/fixtures";
import type { PrototypeService } from "../contracts";
import type { Opportunity, Interest } from "../../domain/models";
interface Data {
  version: 1;
  fixtureRevision?: number;
  opportunities: Opportunity[];
  interests: Interest[];
  favorites: Record<string, string[]>;
}
const key = "freeligo.prototype.v1";
let memory: Data | undefined;
function initial(): Data {
  return {
    version: 1,
    fixtureRevision: 2,
    opportunities: structuredClone(opportunities),
    interests: structuredClone(initialInterests),
    favorites: {},
  };
}
function data(): Data {
  if (memory) return memory;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null") as Data | null;
    if (
      raw?.version === 1 &&
      Array.isArray(raw.opportunities) &&
      Array.isArray(raw.interests) &&
      raw.favorites
    ) {
      if (raw.fixtureRevision !== 2) {
        const updated = opportunities.map((seed) => {
          const old = raw.opportunities.find((o) => o.id === seed.id);
          return old
            ? { ...seed, status: old.status, capacity: old.capacity }
            : structuredClone(seed);
        });
        raw.opportunities = [
          ...raw.opportunities.filter(
            (o) => !opportunities.some((seed) => seed.id === o.id),
          ),
          ...updated,
        ];
        raw.fixtureRevision = 2;
      }
      return (memory = raw);
    }
  } catch {
    /* Corrupt demo storage resets safely. */
  }
  return (memory = initial());
}
function persist() {
  localStorage.setItem(key, JSON.stringify(data()));
}
async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 180));
}
function matchesBudget(reward: string, budget: string) {
  const min = Number(reward.replaceAll(",", "").match(/\d+/)?.[0]);
  if (!Number.isFinite(min)) return false;
  return budget === "under1000"
    ? min < 1000
    : budget === "1000to3000"
      ? min >= 1000 && min <= 3000
      : budget === "over3000"
        ? min > 3000
        : true;
}
export const mockService: PrototypeService = {
  async list(q, user) {
    await delay();
    return structuredClone(
      data().opportunities.filter(
        (o) =>
          (!q.keyword ||
            `${o.title} ${o.summary} ${o.skills.join(" ")}`
              .toLowerCase()
              .includes(q.keyword.toLowerCase())) &&
          (!q.category || o.category === q.category) &&
          (!q.city || o.city === q.city) &&
          (!q.budget || matchesBudget(o.reward, q.budget)) &&
          (!q.mode || o.mode === q.mode) &&
          (!q.kind || o.kind === q.kind) &&
          (!q.newcomer || o.newcomer) &&
          (!q.favorites || (!!user && this.favorites(user).includes(o.id))),
      ),
    );
  },
  async detail(id) {
    await delay();
    const o = data().opportunities.find((o) => o.id === id);
    if (!o) throw new Error("这个机会不存在或已被移除");
    return structuredClone(o);
  },
  favorites(user) {
    return [...(data().favorites[user.id] ?? [])];
  },
  async favorite(id, user) {
    await delay();
    if (!data().opportunities.some((o) => o.id === id))
      throw new Error("机会不存在");
    const ids = data().favorites[user.id] ?? [];
    const exists = ids.includes(id);
    data().favorites[user.id] = exists
      ? ids.filter((x) => x !== id)
      : [...ids, id];
    persist();
    return !exists;
  },
  hasInterest(id, user) {
    return data().interests.some(
      (i) => i.taskId === id && i.userId === user.id,
    );
  },
  async submit(id, user, input) {
    await delay();
    const o = data().opportunities.find((o) => o.id === id);
    if (!o || o.status === "closed") throw new Error("这个机会已停止招募");
    if (o.kind !== "task") throw new Error("请先选择项目下的具体任务");
    if (o.publisherId === user.id) throw new Error("不能申请自己发布的任务");
    if (this.hasInterest(id, user))
      throw new Error("你已提交过意向，请勿重复提交");
    if (!input.experience.trim() || !input.startDate)
      throw new Error("请填写相关经验与可开始时间");
    const i: Interest = {
      ...input,
      id: crypto.randomUUID(),
      taskId: id,
      userId: user.id,
      name: user.name,
      status: "pending",
    };
    data().interests.push(i);
    persist();
    return structuredClone(i);
  },
  async publish(input, user) {
    await delay();
    if (
      !input.title.trim() ||
      !input.summary.trim() ||
      !input.scope.some((s) => s.trim()) ||
      !input.deliverables.some((s) => s.trim())
    )
      throw new Error("请完整填写标题、说明、工作范围和交付要求");
    if (input.capacity < 1) throw new Error("承接人数至少为 1");
    const project: Opportunity = {
      ...input,
      id: `project-${crypto.randomUUID()}`,
      kind: "project",
      publisher: user.name,
      publisherId: user.id,
      status: "open",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const task: Opportunity = {
      ...project,
      id: `task-${crypto.randomUUID()}`,
      kind: "task",
      projectId: project.id,
    };
    data().opportunities.unshift(project, task);
    persist();
    return structuredClone(project);
  },
  async owned(user) {
    await delay();
    return structuredClone(
      data().opportunities.filter((o) => o.publisherId === user.id),
    );
  },
  async applicants(id, user) {
    await delay();
    const o = data().opportunities.find((o) => o.id === id);
    if (o?.publisherId !== user.id) throw new Error("仅发布者可以查看申请");
    return structuredClone(data().interests.filter((i) => i.taskId === id));
  },
  async accept(id, user) {
    await delay();
    const interest = data().interests.find((i) => i.id === id),
      o = data().opportunities.find((o) => o.id === interest?.taskId);
    if (!interest || !o || o.publisherId !== user.id)
      throw new Error("没有操作权限");
    if (interest.status === "accepted") return;
    if (
      data().interests.filter(
        (i) => i.taskId === o.id && i.status === "accepted",
      ).length >= o.capacity
    )
      throw new Error("承接名额已满");
    interest.status = "accepted";
    if (
      data().interests.filter(
        (i) => i.taskId === o.id && i.status === "accepted",
      ).length >= o.capacity
    )
      o.status = "closed";
    persist();
  },
  reset() {
    memory = initial();
    persist();
  },
};
