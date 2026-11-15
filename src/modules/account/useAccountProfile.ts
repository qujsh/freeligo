import { computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  accountProfile,
  ownAvatarUrl,
  type ProfileInput,
} from "../../services/accountProfile";
import { useSession } from "./session";
import { isLive } from "../../services/publicTasks";
/** 个人资料属于当前账号的远端状态，退出清理缓存；编辑副本由弹窗独立管理。 */
export function useAccountProfile() {
  const session = useSession(),
    client = useQueryClient();
  const viewer = computed(() => session.user?.id ?? "guest");
  const profile = useQuery({
    queryKey: computed(() => ["account-profile", viewer.value]),
    queryFn: ({ signal }) => accountProfile.me(signal),
    enabled: computed(() => isLive && !!session.user),
    retry: false,
  });
  watch(
    viewer,
    (_next, previous) => {
      for (const name of [
        "account-profile",
        "account-sessions",
        "account-password",
      ]) {
        void client.cancelQueries({ queryKey: [name, previous] });
        client.removeQueries({ queryKey: [name, previous] });
      }
    },
    { flush: "sync" },
  );
  const save = useMutation({
    mutationFn: async (input: { value: ProfileInput; viewer: string }) => ({
      data: await accountProfile.save(input.value),
      viewer: input.viewer,
    }),
    onSuccess: ({ data, viewer: owner }) => {
      if (owner !== viewer.value) return;
      client.setQueryData(["account-profile", owner], data);
      if (session.user) session.user = { ...session.user, name: data.nickname };
      void client.invalidateQueries({ queryKey: ["public-shares"] });
      void client.invalidateQueries({ queryKey: ["public-share"] });
    },
  });
  return {
    profile,
    save,
    viewer,
    avatar: computed(() => ownAvatarUrl(profile.data.value?.avatarMediaNo)),
  };
}
