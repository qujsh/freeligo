import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { defineComponent } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useSession } from "../../account/session";
import { useNoteComposer } from "./useNoteComposer";
import { noteEditor } from "../../../services/noteEditor";
import { AccountError } from "../../../services/accountProfile";
import { textDocument } from "../../../domain/noteDocument";
import { browserDraftNotes } from "./browserDrafts";
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
function harness(no?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  let form!: ReturnType<typeof useNoteComposer>,
    session!: ReturnType<typeof useSession>;
  const saved = vi.fn(),
    close = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        session = useSession();
        session.user = { id: "USER-a", name: "甲" };
        form = useNoteComposer(no, undefined, undefined, saved, close);
        return () => null;
      },
    }),
    {
      global: {
        plugins: [createPinia(), [VueQueryPlugin, { queryClient: client }]],
      },
    },
  );
  return {
    get form() {
      return form;
    },
    get session() {
      return session;
    },
    saved,
    close,
    dispose: () => {
      wrapper.unmount();
      client.clear();
    },
  };
}
it("创建结果未知时锁定编辑，按原幂等编号和内容重试，成功才清除备份", async () => {
  const save = vi
    .spyOn(noteEditor, "save")
    .mockRejectedValueOnce(new TypeError("网络中断"))
    .mockResolvedValueOnce({
      recordNo: "SHARE-a",
      status: "SAVED",
      version: 1,
      draftVersion: null,
      visibility: "PRIVATE",
      reviewStatus: null,
    });
  const h = harness();
  try {
    h.form.record.value.document = textDocument("原始正文");
    h.form.submit("SAVE", "PRIVATE");
    await flushPromises();
    expect(h.form.uncertain.value).toBe(true);
    expect(h.form.disabled.value).toBe(true);
    expect(browserDraftNotes("USER-b")).toEqual([]);
    expect(browserDraftNotes("USER-a")).toHaveLength(1);
    h.form.retry();
    await flushPromises();
    expect(save.mock.calls[1]![0]).toEqual(save.mock.calls[0]![0]);
    expect(h.saved).toHaveBeenCalledOnce();
    expect(browserDraftNotes("USER-a")).toEqual([]);
  } finally {
    h.dispose();
  }
});
it("换号中止提交，迟到响应不清除原账号草稿或回写新账号", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof noteEditor.save>>) => void;
  const save = vi.spyOn(noteEditor, "save").mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const h = harness();
  try {
    h.form.record.value.document = textDocument("甲的正文");
    h.form.submit("SAVE", "PRIVATE");
    await flushPromises();
    h.session.user = { id: "USER-b", name: "乙" };
    await flushPromises();
    expect(save.mock.calls[0]![1]!.aborted).toBe(true);
    expect(h.close).toHaveBeenCalled();
    resolve({
      recordNo: "SHARE-a",
      status: "SAVED",
      version: 1,
      draftVersion: null,
      visibility: "PRIVATE",
      reviewStatus: null,
    });
    await flushPromises();
    expect(h.saved).not.toHaveBeenCalled();
    expect(browserDraftNotes("USER-a")).toHaveLength(1);
  } finally {
    h.dispose();
  }
});
it("编辑冲突先保留独立本机副本，明确载入最新主版本及副本版本", async () => {
  const record = {
    title: "云端旧文",
    document: textDocument("正文"),
    documentSchemaVersion: 1 as const,
    occurredAt: new Date().toISOString(),
    occurredTimezone: "Asia/Shanghai",
    visibility: "PRIVATE" as const,
    mediaNos: [],
    referenceNos: [],
  };
  vi.spyOn(noteEditor, "load")
    .mockResolvedValueOnce({
      recordNo: "SHARE-a",
      status: "SAVED",
      version: 1,
      draftVersion: null,
      record,
    })
    .mockResolvedValueOnce({
      recordNo: "SHARE-a",
      status: "SAVED",
      version: 3,
      draftVersion: 2,
      record: { ...record, title: "云端新文" },
    });
  const save = vi
    .spyOn(noteEditor, "save")
    .mockRejectedValueOnce(new AccountError("冲突", 409, "VERSION_CONFLICT"))
    .mockResolvedValue({
      recordNo: "SHARE-a",
      status: "SAVED",
      version: 4,
      draftVersion: null,
      visibility: "PRIVATE",
      reviewStatus: null,
    });
  const h = harness("SHARE-a");
  try {
    await flushPromises();
    h.form.record.value.title = "自己的改动";
    h.form.submit("SAVE", "PRIVATE");
    await flushPromises();
    expect(h.form.conflict.value).toBe(true);
    await h.form.reloadCloud();
    expect(h.form.record.value.title).toBe("云端新文");
    expect(
      browserDraftNotes("USER-a").some(
        (n) => n.title === "自己的改动" && !n.editRecordNo,
      ),
    ).toBe(true);
    h.form.submit("SAVE", "PRIVATE");
    await flushPromises();
    expect(save.mock.calls[1]![0]).toMatchObject({
      expectedVersion: 3,
      expectedDraftVersion: 2,
    });
  } finally {
    h.dispose();
  }
});
