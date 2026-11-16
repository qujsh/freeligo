import { computed, watch, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { ElMessage } from "element-plus";
import { useSession } from "../account/session";
import {
  publicNotes,
  PublicNoteError,
  type EngagementKind,
  type NoteEngagement,
} from "../../services/publicNotes";

/** 互动归远端查询，按身份隔离；写入成功才更新统计，退出后取消并清除旧身份私有缓存。 */
export function useNoteEngagements(ids: Ref<string[]>) {
  const session = useSession(),
    client = useQueryClient();
  const viewer = computed(() => session.user?.id ?? "guest");
  const state = useQuery({
    queryKey: computed(() => ["note-engagements", viewer.value, ids.value]),
    queryFn: ({ signal }) => publicNotes.engagements(ids.value, signal),
    enabled: computed(() => ids.value.length > 0),
    staleTime: 0,
    retry: false,
  });
  watch(
    viewer,
    (_next, previous) => {
      // 先取消旧请求，再移除其缓存；不能让前一个账号的响应回写到新会话。
      void client.cancelQueries({ queryKey: ["note-engagements", previous] });
      client.removeQueries({ queryKey: ["note-engagements", previous] });
      if (previous !== "guest") {
        void client.cancelQueries({ queryKey: ["public-notes", previous] });
        client.removeQueries({ queryKey: ["public-notes", previous] });
      }
    },
    { flush: "sync" },
  );
  const mutation = useMutation({
    mutationFn: async (input: {
      id: string;
      kind: EngagementKind;
      value: boolean;
      viewer: string;
    }) => {
      await client.cancelQueries({
        queryKey: ["note-engagements", input.viewer],
      });
      return publicNotes.setEngagement(input.id, input.kind, input.value);
    },
    onSuccess: (result, input) => {
      if (viewer.value !== input.viewer) return;
      client.setQueriesData<Record<string, NoteEngagement>>(
        { queryKey: ["note-engagements", input.viewer] },
        (old) => ({ ...old, [input.id]: result }),
      );
      void client.invalidateQueries({
        queryKey: ["note-engagements", input.viewer],
      });
      if (input.kind === "favorite")
        void client.invalidateQueries({
          queryKey: ["public-notes", input.viewer],
        });
    },
    onError: (error) => {
      if (error instanceof PublicNoteError && error.status === 401) {
        void session.restore(true);
        ElMessage.warning("登录已过期，请重新登录");
      } else ElMessage.error(error.message || "操作失败，请重试");
      void client.invalidateQueries({ queryKey: ["note-engagements"] });
    },
  });
  /** 未登录先登录并续做明确的设置动作，避免登录后把已有点赞意外翻转取消。 */
  function change(id: string, kind: EngagementKind) {
    if (mutation.isPending.value) return;
    const current = state.data.value?.[id];
    if (!current) return;
    const value = !(kind === "like" ? current.liked : current.favorited);
    session.requireLogin(() =>
      mutation.mutate({ id, kind, value, viewer: viewer.value }),
    );
  }
  return { state, change, busy: mutation.isPending };
}
