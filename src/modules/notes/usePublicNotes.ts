import { computed, type Ref } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useSession } from "../account/session";
import { publicShares } from "../../services/publicShares";
/** 公开列表不混入本机笔记；切换关键词取消旧请求，回到页面重新校验公开状态。 */
export function usePublicNotes(
  keyword: Ref<string>,
  enabled: Ref<boolean>,
  recordNo: Ref<string>,
  favorites: Ref<boolean>,
) {
  const session = useSession();
  const list = useInfiniteQuery({
    queryKey: computed(() => [
      "public-shares",
      favorites.value ? (session.user?.id ?? "guest") : "public",
      favorites.value,
      keyword.value,
    ]),
    queryFn: ({ pageParam, signal }) =>
      (favorites.value ? publicShares.favorites : publicShares.list)(
        keyword.value,
        pageParam,
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) =>
      page.hasMore ? (page.nextCursor ?? undefined) : undefined,
    enabled: computed(
      () => enabled.value && (!favorites.value || !!session.user),
    ),
    staleTime: 0,
    retry: false,
  });
  const detail = useQuery({
    queryKey: computed(() => ["public-share", recordNo.value]),
    queryFn: ({ signal }) => publicShares.detail(recordNo.value, signal),
    enabled: computed(() => !!recordNo.value),
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
  };
}
