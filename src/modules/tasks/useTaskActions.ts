import { computed, type Ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ElMessage } from "element-plus";
import { useSession } from "../account/session";
import { interactions } from "../../services/taskInteractions";
import { isLive } from "../../services/publicTasks";
import { service } from "../../services";
export function useTaskActions(id: Ref<string>) {
  const session = useSession(),
    client = useQueryClient();
  const state = useQuery({
    queryKey: computed(() => ["task-state", session.user?.id, id.value]),
    enabled: computed(() => isLive && !!session.user && !!id.value),
    queryFn: () => interactions.state(id.value),
  });
  const favorited = computed(() =>
    isLive
      ? (state.data.value?.favorite ?? false)
      : !!session.user && service.favorites(session.user).includes(id.value),
  );
  const submitted = computed(() =>
    isLive
      ? ["pending", "accepted", "rejected"].includes(
          state.data.value?.interest?.status ?? "",
        )
      : !!session.user && service.hasInterest(id.value, session.user),
  );
  function favorite() {
    session.requireLogin(async () => {
      try {
        if (isLive) {
          await interactions.favorite(id.value, !favorited.value);
        } else await service.favorite(id.value, session.user!);
        await client.invalidateQueries({ queryKey: ["task-state"] });
        await client.invalidateQueries({ queryKey: ["favorite-ids"] });
      } catch (e) {
        ElMessage.error((e as Error).message);
      }
    });
  }
  return { state, favorited, submitted, favorite };
}
