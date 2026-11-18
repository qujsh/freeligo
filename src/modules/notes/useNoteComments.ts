import { computed, ref, watch, type Ref } from "vue";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { ElMessage, ElMessageBox } from "element-plus";
import { useSession } from "../account/session";
import { noteComments, PublicNoteError, type NoteComment } from "../../services/publicNotes";

/** 评论查询按账号和笔记隔离；输入只存于当前弹窗，不复用浏览器备份。 */
export function useNoteComments(recordNo: Ref<string>) {
  const session = useSession(), client = useQueryClient();
  const viewer = computed(() => session.user?.id ?? "guest");
  const content = ref("");
  const replyTo = ref<NoteComment | null>(null);
  let requestNo = crypto.randomUUID();
  let recoveringSession = false;
  watch([content, replyTo], () => { requestNo = crypto.randomUUID(); }, { flush: "sync" });
  const list = useInfiniteQuery({
    queryKey: computed(() => ["note-comments", viewer.value, recordNo.value]),
    queryFn: ({ queryKey, pageParam, signal }) => noteComments.list(String(queryKey[2]), pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.hasMore ? page.nextCursor ?? undefined : undefined,
    enabled: computed(() => !!recordNo.value), staleTime: 0, retry: false,
  });
  function failed(error: Error) {
    if (error instanceof PublicNoteError && error.status === 401) {
      recoveringSession = true;
      void session.restore(true).finally(() => { recoveringSession = false; });
      ElMessage.warning("登录已过期，请重新登录，评论内容已保留");
    }
  }
  const post = useMutation({
    mutationFn: (input: { id: string; text: string; request: string; reply?: string; viewer: string }) =>
      noteComments.create(input.id, input.text, input.request, input.reply),
    onSuccess: (_result, input) => {
      if (viewer.value !== input.viewer) return;
      void client.invalidateQueries({ queryKey: ["note-comments", input.viewer, input.id] });
      if (recordNo.value === input.id && requestNo === input.request) { content.value = ""; replyTo.value = null; }
      ElMessage.success("评论已发布");
    },
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: (input: { id: string; comment: string; viewer: string }) => noteComments.remove(input.id, input.comment),
    onSuccess: (_result, input) => {
      if (viewer.value !== input.viewer) return;
      void client.invalidateQueries({ queryKey: ["note-comments", input.viewer, input.id] });
      if (replyTo.value?.commentNo === input.comment) replyTo.value = null;
      ElMessage.success("评论已删除");
    },
    onError: error => { failed(error); ElMessage.error(error.message || "删除失败，请重试"); },
  });
  watch(recordNo, () => { content.value = ""; replyTo.value = null; requestNo = crypto.randomUUID(); post.reset(); });
  watch(viewer, (_next, previous) => {
    void client.cancelQueries({ queryKey: ["note-comments", previous] });
    client.removeQueries({ queryKey: ["note-comments", previous] });
    if (previous !== "guest" && !recoveringSession) { content.value = ""; replyTo.value = null; }
    post.reset();
  }, { flush: "sync" });
  /** 登录后只续做原笔记和原正文的提交，切换详情后不向其他笔记误发。 */
  function submit() {
    if (post.isPending.value || !recordNo.value || !content.value.trim() || content.value.length > 1000) return;
    const id = recordNo.value, text = content.value.trim(), request = requestNo, reply = replyTo.value?.commentNo;
    session.requireLogin(() => {
      if (recordNo.value === id && !post.isPending.value)
        post.mutate({ id, text, request, reply, viewer: viewer.value });
    });
  }
  async function deleteComment(comment: NoteComment) {
    if (!comment.own || remove.isPending.value) return;
    const id = recordNo.value, owner = viewer.value;
    try { await ElMessageBox.confirm("删除这条评论？其他人的回复会保留。", "删除评论", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }); }
    catch { return; }
    if (id === recordNo.value && owner === viewer.value)
      remove.mutate({ id, comment: comment.commentNo, viewer: owner });
  }
  return { list, post, remove, content, replyTo, submit, deleteComment,
    items: computed(() => list.data.value?.pages.flatMap(page => page.items) ?? []),
    total: computed(() => list.data.value?.pages[0]?.total),
  };
}
