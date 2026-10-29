import { afterEach, describe, expect, it, vi } from "vitest";
import { browse, publicDetail, cities } from "./publicTasks";
const content = {
  title: "真实公开任务",
  summary: "任务简介",
  categoryCode: "design",
  skills: ["视觉设计"],
  cityCode: "330100",
  cityName: "杭州",
  workMode: "onsite",
  rewardType: "non_cash",
  amountMin: null,
  amountMax: null,
  currency: "CNY",
  unit: "project",
  budgetText: "交换摄影服务",
  effort: null,
  effortUnit: null,
  newcomer: true,
  scope: ["设计"],
  deliverables: ["源文件"],
  acceptance: ["确认稿"],
  startDate: null,
  deadline: "2026-11-03",
  mediaNos: [],
  coverMediaNo: null,
};
const task = {
  taskNo: "TASK-1",
  categoryName: "设计创意",
  content,
  publishedAt: "2026-10-25T12:00:00",
  publisher: { userNo: "USER-1", nickname: "发布者" },
  recruitCount: 1,
  coverUrl: null,
  media: [],
};
afterEach(() => vi.unstubAllGlobals());
describe("public task HTTP contract", () => {
  it("preserves server totals and sends budget unit and all filters", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            msg: { items: [task], total: 26, page: 2, pageSize: 6 },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const page = await browse({
      category: "design",
      city: "330100",
      mode: "现场",
      budget: "1000to3000",
      unit: "project",
      page: 2,
      pageSize: 6,
      sort: "latest",
      newcomer: true,
    });
    const url = new URL(fetch.mock.calls[0]![0], "http://localhost");
    expect(url.searchParams.get("categoryCode")).toBe("design");
    expect(url.searchParams.get("amountMin")).toBe("1000");
    expect(url.searchParams.get("unit")).toBe("project");
    expect(url.searchParams.get("workMode")).toBe("onsite");
    expect(url.searchParams.get("page")).toBe("2");
    expect(page.total).toBe(26);
    expect(page.items[0]?.rewardPrefix).toBe("");
    expect(page.items[0]?.reward).toBe("交换摄影服务");
    expect(page.items[0]?.duration).toBe("");
  });
  it("rejects invalid payloads and server failures without falling back to fixtures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, msg: { items: [], total: "bad" } }),
          ),
        ),
    );
    await expect(browse({})).rejects.toThrow("响应格式");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: false, errorMsg: "任务未公开" }),
            { status: 404 },
          ),
        ),
    );
    await expect(publicDetail("PRIVATE")).rejects.toThrow("任务未公开");
  });
  it("keeps video duration absent when backend has not extracted it", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              msg: {
                ...task,
                coverUrl: "/api/v1/public/task-media/content?mediaNo=IMAGE",
                media: [
                  {
                    mediaNo: "VIDEO",
                    type: "video",
                    contentType: "video/mp4",
                    size: 1024,
                    durationSeconds: null,
                    url: "/api/v1/public/task-media/content?mediaNo=VIDEO",
                  },
                ],
              },
            }),
          ),
        ),
    );
    const item = await publicDetail("TASK-1");
    expect(item.video).toContain("mediaNo=VIDEO");
    expect(item.videoDuration).toBeUndefined();
    expect(item.image).toContain("mediaNo=IMAGE");
  });
  it("displays legacy budget text without inventing a monetary quote", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              msg: {
                ...task,
                content: {
                  ...content,
                  rewardType: "negotiable",
                  budgetText: "人民币1200元，含交通补贴",
                },
              },
            }),
          ),
        ),
    );
    const item = await publicDetail("TASK-1");
    expect(item.reward).toBe("人民币1200元，含交通补贴");
    expect(item.rewardPrefix).toBe("");
    expect(item.unit).toBe("");
  });
  it("reads project snapshots and real city options through their public endpoints", async () => {
    const project = {
      tasks: [
        {
          id: "public-1",
          type: "module",
          name: "公开模块",
          description: null,
          role: null,
          startDate: null,
          endDate: null,
          children: [],
        },
      ],
    };
    const fetch = vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              msg: path.includes("task-cities")
                ? [{ code: "110100", name: "北京" }]
                : path.includes("/list")
                  ? {
                      items: [
                        {
                          ...task,
                          projectNo: "PROJECT-1",
                          content: { ...content, project },
                        },
                      ],
                      total: 1,
                      page: 1,
                      pageSize: 20,
                    }
                  : {
                      ...task,
                      projectNo: "PROJECT-1",
                      content: { ...content, project },
                    },
            }),
          ),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const page = await browse({ kind: "project" });
    expect(fetch.mock.calls[0]![0]).toContain("/public/projects/list");
    expect(page.items[0]?.kind).toBe("project");
    expect(page.items[0]?.id).toBe("PROJECT-1");
    expect(page.items[0]?.title).toBe(content.title);
    expect(page.items[0]?.summary).toBe(content.summary);
    const detail = await publicDetail("PROJECT-1");
    expect(detail.project?.tasks[0]?.name).toBe("公开模块");
    expect(detail.publicationTaskId).toBe("TASK-1");
    expect(fetch.mock.calls[1]![0]).toContain(
      "/public/projects/detail?projectNo=PROJECT-1",
    );
    expect(await cities()).toEqual([{ code: "110100", name: "北京" }]);
  });
});

describe("complete task detail contract", () => {
  it("preserves frozen scope, structured noncash rewards and closed recruitment", async () => {
    const details = {
      goal: "完成社区交付",
      collaboration: "远程同步",
      rewards: [
        {
          type: "goods",
          title: "显示器",
          pricing: null,
          amountMin: null,
          amountMax: null,
          unit: "台",
          quantity: 1,
          condition: "九成新",
          description: "含配件",
          handover: "自行约定交接",
        },
        {
          type: "service",
          title: "咨询",
          pricing: null,
          amountMin: null,
          amountMax: null,
          unit: null,
          quantity: null,
          condition: null,
          description: "两次咨询",
          handover: null,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              msg: {
                ...task,
                version: 3,
                recruitmentStatus: "paused",
                acceptedCount: 0,
                content: { ...content, rewardType: "mixed", details },
              },
            }),
          ),
        ),
    );
    const result = await publicDetail("TASK-1");
    expect(result.status).toBe("closed");
    expect(result.recruitmentStatus).toBe("paused");
    expect(result.version).toBe(3);
    expect(result.details).toEqual(details);
    expect(result.rewardPrefix).toBe("");
    expect(result.reward).toBe("显示器 + 咨询");
    expect(result.unit).toBe("");
  });
  it("reads confirmed conditions through the authenticated endpoint", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            msg: { ...task, version: 1, recruitmentStatus: "historical" },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    await publicDetail("PROJECT-1", undefined, true);
    expect(fetch.mock.calls[0]![0]).toContain(
      "/task-interactions/confirmed-detail?taskNo=TASK-1",
    );
  });
});
