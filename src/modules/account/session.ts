import { isLive } from "../../services/publicTasks";
import { account } from "../../services/taskInteractions";
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
    if (user.value) action();
    else {
      continuation = action;
      loginOpen.value = true;
    }
  }
  function login(publisher = false) {
    if (isLive) return;
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
  async function logout() {
    if (isLive) await account.logout();
    user.value = null;
    sessionStorage.removeItem("freeligo.demo-user");
  }
  async function restore() {
    if (!isLive) return;
    try {
      const v = await account.me();
      user.value = { id: v.userNo, name: v.nickname };
    } catch {
      user.value = null;
    }
  }
  async function signIn(phone: string, code: string) {
    const v = await account.login(phone, code);
    user.value = { id: v.userNo, name: v.nickname };
    loginOpen.value = false;
    const action = continuation;
    continuation = null;
    action?.();
  }
  return {
    user,
    loginOpen,
    requireLogin,
    login,
    cancel,
    logout,
    restore,
    signIn,
  };
});
