import { isLive } from "../../services/publicTasks";
import { ElMessage } from "element-plus";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { DemoUser } from "../../domain/models";
export const useSession = defineStore("demo-session", () => {
  const user = ref<DemoUser | null>(null),
    loginOpen = ref(false);
  let continuation: (() => void) | null = null;
  try {
    const v = JSON.parse(
      sessionStorage.getItem("freeligo.demo-user") || "null",
    );
    if (!isLive && v && typeof v.id === "string" && typeof v.name === "string")
      user.value = v;
  } catch {
    /* no session */
  }
  function requireLogin(action: () => void) {
    if(isLive) { ElMessage.info("本批已开放任务浏览；登录后的收藏、意向和发布功能将在后续接入"); return; }
    if (user.value) action();
    else {
      continuation = action;
      loginOpen.value = true;
    }
  }
  function login(publisher = false) {
    user.value = publisher
      ? { id: "publisher-demo", name: "林间工作室" }
      : { id: "visitor-demo", name: "小林" };
    sessionStorage.setItem("freeligo.demo-user", JSON.stringify(user.value));
    loginOpen.value = false;
    continuation?.();
    continuation = null;
  }
  function cancel() {
    loginOpen.value = false;
    continuation = null;
  }
  function logout() {
    user.value = null;
    sessionStorage.removeItem("freeligo.demo-user");
  }
  return { user, loginOpen, requireLogin, login, cancel, logout };
});
