import { computed, onMounted, onUnmounted, ref } from "vue";
import { useSession } from "../../account/session";
import { browserDraftNotes } from "./browserDrafts";
/** 仅监听本机备份变动；退出后不保留当前账号草稿列表。 */
export function useBrowserDrafts() {
  const session = useSession(),
    revision = ref(0),
    error = ref(false);
  const update = () => revision.value++;
  onMounted(() => {
    window.addEventListener("note-drafts-changed", update);
    window.addEventListener("storage", update);
  });
  onUnmounted(() => {
    window.removeEventListener("note-drafts-changed", update);
    window.removeEventListener("storage", update);
  });
  const notes = computed(() => {
    void revision.value;
    if (!session.user) return [];
    try {
      return browserDraftNotes(session.user.id);
    } catch {
      error.value = true;
      return [];
    }
  });
  return { notes, error };
}
