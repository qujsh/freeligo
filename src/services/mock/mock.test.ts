import { beforeEach, describe, it, expect, vi } from "vitest";
import { mockService as service } from "./index";
const visitor = { id: "visitor-demo", name: "小林" },
  owner = { id: "publisher-demo", name: "发布者" };
const input = {
  experience: "做过相似项目",
  portfolio: "",
  startDate: "2026-10-26",
  question: "",
  quote: "",
};
describe("prototype business boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
    service.reset();
  });
  it("requires separate task participation and prevents duplicate interest", async () => {
    await expect(
      service.submit("project-community", visitor, input),
    ).rejects.toThrow("具体任务");
    await service.submit("task-poster", visitor, input);
    await expect(service.submit("task-poster", visitor, input)).rejects.toThrow(
      "重复",
    );
  });
  it("isolates favorites by account and supports removal", async () => {
    await service.favorite("task-poster", visitor);
    expect(service.favorites(owner)).toEqual([]);
    expect(service.favorites(visitor)).toEqual(["task-poster"]);
    await service.favorite("task-poster", visitor);
    expect(service.favorites(visitor)).toEqual([]);
  });
  it("enforces ownership and single-person capacity", async () => {
    await expect(service.applicants("task-poster", visitor)).rejects.toThrow(
      "发布者",
    );
    await expect(service.accept("interest-demo-1", visitor)).rejects.toThrow(
      "权限",
    );
    await service.accept("interest-demo-1", owner);
    await expect(service.accept("interest-demo-2", owner)).rejects.toThrow(
      "名额",
    );
    expect((await service.detail("task-poster")).status).toBe("closed");
  });
  it("creates linked project and task on simulated publishing", async () => {
    const project = await service.publish(
      {
        title: "测试需求",
        summary: "完整的需求说明",
        category: "设计创意",
        mode: "远程",
        city: "不限城市",
        duration: "5天",
        reward: "500",
        unit: "项目",
        skills: [],
        capacity: 2,
        newcomer: false,
        scope: ["完成初稿"],
        deliverables: ["源文件"],
        acceptance: [],
      },
      visitor,
    );
    const owned = await service.owned(visitor);
    expect(owned).toHaveLength(2);
    expect(owned.find((o) => o.kind === "task")?.projectId).toBe(project.id);
  });
  it("combines city, working mode and budget filters", async () => {
    const nearby = await service.list({ city: "杭州", kind: "task" }, null);
    expect(nearby.map((o) => o.id)).toEqual(["task-photo"]);
    expect(
      (
        await service.list(
          { mode: "现场", budget: "under1000", kind: "task" },
          null,
        )
      ).map((o) => o.id),
    ).toEqual(["task-repair"]);
    const mid = await service.list(
      { budget: "1000to3000", kind: "task" },
      null,
    );
    expect(mid.some((o) => o.id === "task-photo")).toBe(true);
    expect(mid.some((o) => o.id === "task-data")).toBe(false);
  });
  it("refreshes seed content without losing local publications or accepted status", async () => {
    const original = await service.detail("task-poster");
    const custom = {
      ...original,
      id: "task-user-owned",
      title: "我自己发布的需求",
      projectId: undefined,
    };
    localStorage.setItem(
      "freeligo.prototype.v1",
      JSON.stringify({
        version: 1,
        opportunities: [
          { ...original, title: "旧版本海报", status: "closed" },
          custom,
        ],
        interests: [],
        favorites: { "visitor-demo": ["task-poster"] },
      }),
    );
    vi.resetModules();
    const fresh = (await import("./index")).mockService;
    expect((await fresh.detail("task-poster")).title).toBe(
      "为科技体验日设计海报",
    );
    expect((await fresh.detail("task-poster")).status).toBe("closed");
    expect((await fresh.detail("task-user-owned")).title).toBe(
      "我自己发布的需求",
    );
    expect(fresh.favorites(visitor)).toEqual(["task-poster"]);
  });
});
