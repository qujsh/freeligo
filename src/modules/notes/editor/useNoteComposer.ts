import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useSession } from "../../account/session";
import { AccountError } from "../../../services/accountProfile";
import {
  noteEditor,
  type NotePayload,
  type NoteSaved,
  type NoteSubmission,
} from "../../../services/noteEditor";
import {
  emptyDocument,
  textDocument,
  documentText,
} from "../../../domain/noteDocument";
import { readBrowserDraft, draftPrefix } from "./browserDrafts";
import type { Note } from "../../../domain/notes";

/** 创作草稿与查询缓存分离；失败重试保留原幂等编号，换号中止请求且不回写新账号。 */
export function useNoteComposer(
  recordNo: string | undefined,
  resume: string | undefined,
  seed: Note | undefined,
  onSaved: (value: NoteSaved) => void,
  onClose: () => void,
) {
  const session = useSession(),
    client = useQueryClient(),
    owner = session.user!.id;
  const controller = new AbortController();
  let active = true;
  onBeforeUnmount(() => {
    active = false;
    controller.abort();
  });
  watch(
    () => session.user?.id,
    (user) => {
      if (user !== owner) {
        active = false;
        controller.abort();
        onClose();
      }
    },
    { flush: "sync" },
  );
  const record = ref<NotePayload>({
    title: seed?.title || "",
    document: seed ? textDocument(seed.content) : emptyDocument(),
    documentSchemaVersion: 1,
    occurredAt: new Date().toISOString(),
    occurredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    visibility: "PRIVATE",
    mediaNos: [],
    referenceNos: [],
  });
  const version = ref<number>(),
    draftVersion = ref<number | null>(),
    clientRequestNo = ref<string>(crypto.randomUUID());
  const attempt = ref<NoteSubmission>(),
    uncertain = ref(false),
    conflict = ref(false),
    error = ref(""),
    storageError = ref(false),
    uploading = ref(false),
    ready = ref(!recordNo);
  const suffix = resume || recordNo || (seed ? `legacy-${seed.id}` : "new");
  const key = draftPrefix(owner) + suffix;
  let cached: ReturnType<typeof readBrowserDraft>;
  try {
    cached = readBrowserDraft(owner, suffix);
  } catch {
    storageError.value = true;
  }
  const source = useQuery({
    queryKey: ["owned-notes", owner, "editor", recordNo],
    queryFn: ({ signal }) => noteEditor.load(recordNo!, signal),
    enabled: !!recordNo,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  /** 远端仅初始化一次；已有本机恢复点沿用旧版本，以409保护其他设备的新内容。 */
  function restore() {
    if (cached) {
      record.value = cached.record;
      version.value = cached.version;
      draftVersion.value = cached.draftVersion;
      clientRequestNo.value = cached.clientRequestNo;
      attempt.value = cached.attempt;
      uncertain.value = !!cached.attempt;
    }
    ready.value = true;
  }
  if (!recordNo) restore();
  watch(
    source.data,
    (value) => {
      if (!value || ready.value) return;
      record.value = JSON.parse(JSON.stringify(value.record));
      version.value = value.version;
      draftVersion.value = value.draftVersion;
      restore();
    },
    { immediate: true },
  );
  /** 本机备份包含待确认提交的原请求，不保存密码、Cookie或上传凭证。 */
  function persist() {
    if (!ready.value || !active) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          record: record.value,
          recordNo,
          version: version.value,
          draftVersion: draftVersion.value,
          clientRequestNo: clientRequestNo.value,
          attempt: attempt.value,
          updatedAt: new Date().toISOString(),
        }),
      );
      window.dispatchEvent(new Event("note-drafts-changed"));
    } catch {
      storageError.value = true;
    }
  }
  watch([record, version, draftVersion, attempt], persist, { deep: true });
  const mutation = useMutation({
    mutationFn: (input: NoteSubmission) =>
      noteEditor.save(input, controller.signal),
    onSuccess: (value) => {
      if (!active || session.user?.id !== owner) return;
      active = false; // 成功即结束本次编辑，阻止弹窗离场及编辑器状态回调重建旧备份。
      try {
        localStorage.removeItem(key);
        window.dispatchEvent(new Event("note-drafts-changed"));
      } catch {
        storageError.value = true;
      }
      void client.invalidateQueries({ queryKey: ["owned-notes", owner] });
      void client.invalidateQueries({ queryKey: ["public-notes"] });
      onSaved(value);
    },
    onError: (failure: Error) => {
      if (!active) return;
      // 无响应或5xx结果可能未知；锁定原请求重试，避免修改后另起编号重复创建。
      uncertain.value =
        !(failure instanceof AccountError) ||
        failure.status >= 500 ||
        failure.code === "INVALID_API_RESPONSE";
      if (!uncertain.value) attempt.value = undefined;
      conflict.value =
        failure instanceof AccountError && failure.status === 409;
      error.value =
        failure instanceof AccountError && failure.status === 409
          ? "云端版本或草稿已变化。你的内容已保留。可将当前内容另存为本机草稿，再载入云端最新版本核对。"
          : failure.message;
      persist();
    },
  });
  const disabled = computed(
    () =>
      !ready.value ||
      mutation.isPending.value ||
      uploading.value ||
      uncertain.value,
  );
  const textLength = computed(
    () => documentText(record.value.document).trimEnd().length,
  );
  /** 必须明确选私密/申请公开；保存草稿不会改变正式公开内容。 */
  function submit(action: "SAVE" | "DRAFT", visibility: "PRIVATE" | "PUBLIC") {
    if (disabled.value) return;
    error.value = "";
    if (textLength.value > 20000) {
      error.value = "正文最多20000字";
      return;
    }
    if (
      action === "SAVE" &&
      !documentText(record.value.document).trim() &&
      !record.value.mediaNos.length &&
      !record.value.referenceNos.length
    ) {
      error.value = "请填写正文、添加图片或关联笔记";
      return;
    }
    const payload = JSON.parse(
      JSON.stringify({
        ...record.value,
        title: record.value.title?.trim() || null,
        visibility,
      }),
    ) as NotePayload;
    const input: NoteSubmission = {
      recordNo,
      clientRequestNo: clientRequestNo.value,
      expectedVersion: version.value,
      expectedDraftVersion: draftVersion.value,
      action,
      record: payload,
    };
    attempt.value = input;
    persist();
    mutation.mutate(input);
  }
  /** 上传与确认串行，全部完成才可保存；失败保留已经确认的图片，离开编辑器后忽略迟到结果。 */
  async function upload(files: File[]) {
    if (disabled.value) return;
    if (record.value.mediaNos.length + files.length > 9) {
      error.value = "每篇笔记最多9张图片";
      return;
    }
    uploading.value = true;
    error.value = "";
    try {
      for (const file of files) {
        const no = await noteEditor.upload(file, controller.signal);
        if (!active) return;
        record.value.mediaNos.push(no);
      }
    } catch (failure) {
      if (active) error.value = (failure as Error).message;
    } finally {
      uploading.value = false;
    }
  }
  /** 仅按原始快照重试未知结果；编号和版本均不重建。 */
  function retry() {
    if (attempt.value && !mutation.isPending.value) {
      error.value = "";
      mutation.mutate(JSON.parse(JSON.stringify(attempt.value)));
    }
  }
  /** 冲突由用户明确处理：先另存独立本机副本，再取云端版本，不静默覆盖任一端。 */
  async function reloadCloud() {
    if (!recordNo || mutation.isPending.value) return;
    try {
      localStorage.setItem(
        draftPrefix(owner) + crypto.randomUUID(),
        JSON.stringify({
          record: record.value,
          clientRequestNo: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        }),
      );
      const latest = await noteEditor.load(recordNo, controller.signal);
      if (!active) return;
      record.value = JSON.parse(JSON.stringify(latest.record));
      version.value = latest.version;
      draftVersion.value = latest.draftVersion;
      attempt.value = undefined;
      uncertain.value = false;
      conflict.value = false;
      error.value = "";
      clientRequestNo.value = crypto.randomUUID();
      persist();
    } catch (failure) {
      if (active) error.value = (failure as Error).message;
    }
  }
  return {
    conflict,
    reloadCloud,
    record,
    source,
    ready,
    error,
    storageError,
    uploading,
    disabled,
    textLength,
    submit,
    upload,
    retry,
    uncertain,
    busy: mutation.isPending,
  };
}
