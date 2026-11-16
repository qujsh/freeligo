import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { defineComponent, ref } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useSession } from "../account/session";
import { useNoteEngagements } from "./useNoteEngagements";
import { account } from "../../services/taskInteractions";
import { legal } from "../../services/legal";
import { publicNotes } from "../../services/publicNotes";
vi.mock("../../services/taskInteractions", () => ({
  account: {
    me: vi.fn().mockRejectedValue(new Error("未登录")),
    login: vi.fn().mockResolvedValue({ userNo: "USER-a", nickname: "甲" }),
    logout: vi.fn().mockResolvedValue("logged_out"),
  },
}));
vi.mock("element-plus", () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn() },
}));
afterEach(() => vi.restoreAllMocks());
function mountHost(client: QueryClient, setup: () => void) {
  return mount(defineComponent({ setup() {
    setup();
    return () => null;
  } }), { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: client }]] } });
}
it("登录续做点赞并持久化，退出清除私人收藏与状态，匿名不继承选中态", async () => {
  vi.mocked(account.login).mockResolvedValue({
    userNo: "USER-a",
    nickname: "甲",
  });
  vi.mocked(account.me).mockRejectedValue(new Error("未登录"));
  vi.mocked(account.logout).mockResolvedValue("logged_out");
  const initial = {
    likeCount: 0,
    favoriteCount: 0,
    liked: false,
    favorited: false,
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  let session!: ReturnType<typeof useSession>;
  let actions!: ReturnType<typeof useNoteEngagements>;
  vi.spyOn(publicNotes, "engagements").mockImplementation(async () => ({
    "SHARE-1": {
      ...initial,
      likeCount: session.user ? 1 : 0,
      liked: !!session.user,
    },
  }));
  const write = vi
    .spyOn(publicNotes, "setEngagement")
    .mockResolvedValue({ ...initial, likeCount: 1, liked: true });
  const wrapper = mountHost(client, () => {
    session = useSession();
    actions = useNoteEngagements(ref(["SHARE-1"]));
  });
  try {
    await session.restore();
    await flushPromises();
    actions.change("SHARE-1", "like");
    expect(session.loginOpen).toBe(true);
    expect(write).not.toHaveBeenCalled();
    vi.spyOn(legal, "login").mockResolvedValue({ userNo: "USER-a", nickname: "甲" });
    await session.signIn("13800000000", "123456", "sms", { accepted: true, termsId: 1, privacyId: 2 });
    await flushPromises();
    expect(write).toHaveBeenCalledWith("SHARE-1", "like", true);
    expect(actions.state.data.value?.["SHARE-1"]?.liked).toBe(true);
    client.setQueryData(["public-notes", "USER-a", true, ""], {
      secret: "private favorites",
    });
    await session.logout();
    await flushPromises();
    expect(
      client.getQueryData(["public-notes", "USER-a", true, ""]),
    ).toBeUndefined();
    expect(
      client.getQueriesData({ queryKey: ["note-engagements", "USER-a"] }),
    ).toHaveLength(0);
    expect(actions.state.data.value?.["SHARE-1"]?.liked).toBe(false);
  } finally {
    wrapper.unmount();
    client.clear();
  }
});

it("切换账号后迟到的写入响应不能污染新账号，提交中不重复发起动作", async () => {
  vi.mocked(account.me).mockRejectedValue(new Error("未登录"));
  const initial = {
    likeCount: 0,
    favoriteCount: 0,
    liked: false,
    favorited: false,
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let session!: ReturnType<typeof useSession>;
  let actions!: ReturnType<typeof useNoteEngagements>;
  let complete!: (state: typeof initial) => void;
  vi.spyOn(publicNotes, "engagements").mockResolvedValue({
    "SHARE-1": initial,
  });
  const write = vi.spyOn(publicNotes, "setEngagement").mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const wrapper = mountHost(client, () => {
    session = useSession();
    actions = useNoteEngagements(ref(["SHARE-1"]));
  });
  try {
    await session.restore();
    session.user = { id: "USER-a", name: "甲" };
    await flushPromises();
    actions.change("SHARE-1", "like");
    await flushPromises();
    actions.change("SHARE-1", "like");
    expect(write).toHaveBeenCalledTimes(1);
    session.user = { id: "USER-b", name: "乙" };
    await flushPromises();
    complete({ ...initial, likeCount: 1, liked: true });
    await flushPromises();
    expect(actions.state.data.value?.["SHARE-1"]?.liked).toBe(false);
    expect(
      client.getQueriesData({ queryKey: ["note-engagements", "USER-a"] }),
    ).toHaveLength(0);
  } finally {
    wrapper.unmount();
    client.clear();
  }
});
