import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { defineComponent, ref } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useSession } from "../account/session";
import { useNoteComments } from "./useNoteComments";
import { noteComments, PublicNoteError, type NoteComment } from "../../services/publicNotes";
import { legal } from "../../services/legal";
vi.mock("../../services/taskInteractions", () => ({ account: { me: vi.fn().mockRejectedValue(new Error("未登录")) } }));
vi.mock("element-plus", () => ({ ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }, ElMessageBox: { confirm: vi.fn().mockResolvedValue(true) } }));
afterEach(() => vi.restoreAllMocks());
const comment: NoteComment = { commentNo: "COMMENT-a", content: "正文", createdAt: "2026-11-16T00:00:00Z", author: { nickname: "甲", avatarUrl: null }, replyTo: null, own: true };
function host() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const id = ref("NOTE-a");
  let session!: ReturnType<typeof useSession>, discussion!: ReturnType<typeof useNoteComments>;
  vi.spyOn(noteComments, "list").mockResolvedValue({ items: [], total: 0, nextCursor: null, hasMore: false });
  const wrapper = mount(defineComponent({ setup() { session = useSession(); discussion = useNoteComments(id); return () => null; } }), { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: client }]] } });
  return { client, id, get session() { return session; }, get discussion() { return discussion; }, close() { wrapper.unmount(); client.clear(); } };
}
it("匿名评论登录后续发，失败保留正文和请求编号，重试成功后清空并重查", async () => {
  const h = host();
  const create = vi.spyOn(noteComments, "create").mockRejectedValueOnce(new Error("网络中断")).mockResolvedValue(comment);
  vi.spyOn(legal, "login").mockResolvedValue({ userNo: "USER-a", nickname: "甲" });
  try {
    await h.session.restore(); await flushPromises();
    h.discussion.content.value = "  一段想法  ";
    h.discussion.submit();
    expect(h.session.loginOpen).toBe(true);
    expect(create).not.toHaveBeenCalled();
    await h.session.signIn("13800000000", "123456", "sms", { accepted: true, termsId: 1, privacyId: 2 });
    await flushPromises();
    expect(h.discussion.content.value).toBe("  一段想法  ");
    const request = create.mock.calls[0]![2];
    h.discussion.submit(); await flushPromises();
    expect(create.mock.calls[1]).toEqual(["NOTE-a", "一段想法", request, undefined]);
    expect(h.discussion.content.value).toBe("");
    expect(noteComments.list).toHaveBeenCalledTimes(3);
  } finally { h.close(); }
});
it("登录期间切换笔记不误发；账号切换清除旧评论状态，迟到响应不清空新账号输入", async () => {
  const h = host();
  let complete!: (value: NoteComment) => void;
  const create = vi.spyOn(noteComments, "create").mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  vi.spyOn(legal, "login").mockResolvedValue({ userNo: "USER-a", nickname: "甲" });
  try {
    await h.session.restore(); await flushPromises();
    h.discussion.content.value = "给甲笔记"; h.discussion.submit();
    h.id.value = "NOTE-b"; await flushPromises();
    await h.session.signIn("13800000000", "123456", "sms", { accepted: true, termsId: 1, privacyId: 2 });
    await flushPromises(); expect(create).not.toHaveBeenCalled();
    h.client.setQueryData(["note-comments", "USER-a", "NOTE-b"], { pages: [{ items: [comment], total: 1, nextCursor: null, hasMore: false }], pageParams: [undefined] });
    h.discussion.content.value = "甲的评论"; h.discussion.submit(); await flushPromises();
    h.discussion.submit(); expect(create).toHaveBeenCalledTimes(1);
    h.session.user = { id: "USER-b", name: "乙" }; await flushPromises();
    expect(h.discussion.content.value).toBe("");
    expect(h.client.getQueriesData({ queryKey: ["note-comments", "USER-a"] })).toHaveLength(0);
    h.discussion.content.value = "乙正在输入";
    complete(comment); await flushPromises();
    expect(h.discussion.content.value).toBe("乙正在输入");
    expect(h.discussion.items.value).toEqual([]);
  } finally { h.close(); }
});
it("会话过期保留待发正文，刷新身份后不会继续冒充旧作者", async () => {
  const h = host();
  vi.spyOn(noteComments, "create").mockRejectedValue(new PublicNoteError("请登录", "AUTH", 401));
  try {
    await h.session.restore(); h.session.user = { id: "USER-a", name: "甲" }; await flushPromises();
    h.discussion.content.value = "尚未发送"; h.discussion.submit(); await flushPromises();
    expect(h.session.user).toBeNull();
    expect(h.discussion.content.value).toBe("尚未发送");
    h.discussion.submit(); expect(h.session.loginOpen).toBe(true);
    expect(noteComments.create).toHaveBeenCalledTimes(1);
  } finally { h.close(); }
});
