import { isLive } from "../../services/publicTasks";
import { legal, type LegalAcceptance } from "../../services/legal";
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
  let restored = !isLive;
  let restoring: Promise<void> | undefined;
  /** 先等待Cookie会话恢复，再决定是否弹窗；取消登录时不执行此前的业务动作。 */
  function requireLogin(action: () => void) {
    if (!restored) {
      void restore().then(() => requireLogin(action));
      return;
    }
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
  /** 合并并发恢复请求；互动遇到401时可强制重查，失败清空前端身份而不伪造登录。 */
  function restore(force = false): Promise<void> {
    if (!isLive || (restored && !force)) return Promise.resolve();
    if (restoring) return restoring;
    restoring = restoreUser().finally(() => {
      restored = true;
      restoring = undefined;
    });
    return restoring;
  }
  async function restoreUser() {
    try {
      const v = await account.me();
      user.value = { id: v.userNo, name: v.nickname };
    } catch {
      user.value = null;
    }
  }
  /** 两种登录共享会话落地与待执行操作；密码仅随请求传递，不存储。 */
  async function signIn(phone: string, credential: string, mode: "sms" | "password" = "sms", acceptance?: LegalAcceptance) {
    if (!acceptance) throw new Error("请先阅读并同意用户协议和隐私政策");
    const v = await legal.login(phone, credential, mode, acceptance);
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
