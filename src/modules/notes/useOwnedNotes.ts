import { computed, ref, watch, type Ref } from "vue";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { noteEditor } from "../../services/noteEditor";
import type { Note } from "../../domain/notes";
import { ownedNotes } from "../../services/ownedNotes";
import { useSession } from "../account/session";
/** 本人正式笔记按账号隔离缓存，退出或换号同步取消并移除私有数据。 */
export function useOwnedNotes(
  keyword: Ref<string>,
  enabled: Ref<boolean>,
  recordNo: Ref<string>,
  drafts: Ref<boolean> = ref(false),
) {
  const session = useSession(),
    client = useQueryClient();
  const viewer = computed(() => session.user?.id ?? "guest");
  watch(
    viewer,
    (_next, old) => {
      void client.cancelQueries({ queryKey: ["owned-notes", old] });
      client.removeQueries({ queryKey: ["owned-notes", old] });
    },
    { flush: "sync" },
  );
  const list = useInfiniteQuery({
    queryKey: computed(() => [
      "owned-notes",
      viewer.value,
      "list",
      keyword.value,
      drafts.value,
    ]),
    queryFn: async ({ pageParam, signal }) => {
      if (!drafts.value)
        return ownedNotes.list(keyword.value, pageParam, signal);
      const page = await noteEditor.drafts(keyword.value, pageParam, signal);
      return {
        ...page,
        items: page.items.map(
          (item) =>
            ({
              id: item.recordNo,
              title: item.title || item.summary.slice(0, 40) || "未命名草稿",
              titleIsExcerpt: !item.title,
              summary: item.summary,
              content: item.summary,
              category: "life",
              tags: [],
              author: "",
              date: new Date(item.updatedAt).toLocaleDateString("zh-CN"),
              own: true,
              remote: true,
              cloudDraft: true,
              statusLabel: item.editCopy
                ? "编辑草稿 · 正式内容未变"
                : "云端草稿",
            }) as Note,
        ),
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) =>
      page.hasMore ? (page.nextCursor ?? undefined) : undefined,
    enabled: computed(() => enabled.value && !!session.user),
    staleTime: 0,
    retry: false,
    refetchInterval: (query) =>
      enabled.value &&
      !drafts.value &&
      !query.state.error &&
      query.state.data?.pages.some((page) =>
        page.items.some((note) => note.statusLabel === "审核中"),
      )
        ? 3000
        : false,
  });
  const detail = useQuery({
    queryKey: computed(() => [
      "owned-notes",
      viewer.value,
      "detail",
      recordNo.value,
    ]),
    queryFn: ({ signal }) => ownedNotes.detail(recordNo.value, signal),
    enabled: computed(() => !!recordNo.value && !!session.user),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  return {
    list,
    detail,
    items: computed(
      () => list.data.value?.pages.flatMap((page) => page.items) ?? [],
    ),
    total: computed(() => list.data.value?.pages[0]?.total),
  };
}
