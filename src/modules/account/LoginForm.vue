<script setup lang="ts">
import { ref, onUnmounted, watch, computed } from "vue";
import { useSession } from "./session";
import UnionLogo from "../../shared/ui/UnionLogo.vue";
import { useQuery } from "@tanstack/vue-query";
import { legal } from "../../services/legal";
import { AccountError } from "../../services/accountProfile";
import { account } from "../../services/taskInteractions";
const session = useSession(),
  phone = ref(""),
  code = ref(""),
  busy = ref(false),
  sending = ref(false),
  error = ref(""),
  notice = ref("");
const mode = ref<"password" | "sms">("password"), password = ref("");
watch(mode, () => { error.value = ""; notice.value = ""; password.value = ""; code.value = ""; });
const agreed = ref(false);
const protocols = useQuery({ queryKey: ["legal", "login-current"], queryFn: ({ signal }) => legal.current(signal), staleTime: 0, retry: false });
const terms = computed(() => protocols.data.value?.find(item => item.kind === "TERMS"));
const privacy = computed(() => protocols.data.value?.find(item => item.kind === "PRIVACY"));
// 后台发布新版本后，窗口重新取到不同编号时必须取消旧勾选。
watch(() => protocols.data.value?.map(item => item.id).join(","), () => { agreed.value = false; });
function acceptedVersions() {
  if (!terms.value || !privacy.value) { error.value = "协议尚未加载，请重试"; return; }
  if (!agreed.value) { error.value = "请先阅读并同意用户协议和隐私政策"; return; }
  return { accepted: true as const, termsId: terms.value.id, privacyId: privacy.value.id };
}
const remaining = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
onUnmounted(() => clearInterval(timer));
const emit = defineEmits<{ loggedIn: [] }>();
/** 短信发送成功后冷却60秒限制重发，不预填或显示开发验证码。 */
async function send() {
  if (sending.value || busy.value || remaining.value) return;
  if (!acceptedVersions()) return;
  if (!/^1\d{10}$/.test(phone.value)) {
    error.value = "请输入有效手机号";
    return;
  }
  sending.value = true;
  error.value = "";
  try {
    const r = await account.send(phone.value);
    notice.value = r.message;
    remaining.value = 60;
    clearInterval(timer);
    timer = setInterval(() => { remaining.value = Math.max(0, remaining.value - 1); if (!remaining.value) clearInterval(timer); }, 1000);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    sending.value = false;
  }
}
/** 根据所选方式校验凭据，登录成功后由会话恢复先前待执行的操作。 */
async function login() {
  if (busy.value || sending.value) return;
  const acceptance = acceptedVersions();
  if (!acceptance) return;
  if (!/^1\d{10}$/.test(phone.value)) { error.value = "请输入有效手机号"; return; }
  if (mode.value === "sms" && !/^\d{6}$/.test(code.value)) { error.value = "请输入6位验证码"; return; }
  if (mode.value === "password" && !password.value) { error.value = "请输入密码"; return; }
  busy.value = true;
  error.value = "";
  try {
    await session.signIn(phone.value, mode.value === "password" ? password.value : code.value, mode.value, acceptance);
    emit("loggedIn");
  } catch (e) {
    error.value = (e as Error).message;
    if (e instanceof AccountError && e.code === "LEGAL_CHANGED") {
      agreed.value = false;
      await protocols.refetch();
    }
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form class="account-login" @submit.prevent="login">
    <div class="account-login__intro"><UnionLogo /><h2>登录自由人联合体</h2></div>
    <div class="account-login__tabs" role="tablist" aria-label="登录方式">
      <button type="button" role="tab" :aria-selected="mode === 'password'" :disabled="busy || sending" @click="mode = 'password'">账号密码登录</button>
      <button type="button" role="tab" :aria-selected="mode === 'sms'" :disabled="busy || sending" @click="mode = 'sms'">验证码登录</button>
    </div>
    <label class="account-login__field"><span class="account-login__prefix">+86</span><input v-model="phone" aria-label="登录手机号" placeholder="输入手机号" maxlength="11" inputmode="tel" autocomplete="tel" :disabled="busy || sending" /></label>
    <label v-if="mode === 'password'" class="account-login__field"><el-input v-model="password" class="account-login__password" aria-label="登录密码" placeholder="输入密码" type="password" show-password autocomplete="current-password" size="large" :disabled="busy" :style="{ '--el-input-border-radius': '12px', '--el-input-bg-color': 'transparent', '--el-input-border-color': 'transparent', '--el-input-hover-border-color': 'transparent', '--el-input-focus-border-color': 'transparent', '--el-input-height': '40px' }" /></label>
    <label v-else class="account-login__field"><input v-model="code" aria-label="登录验证码" placeholder="输入验证码" maxlength="6" inputmode="numeric" autocomplete="one-time-code" :disabled="busy" /><button type="button" class="account-login__send" :disabled="sending || busy || remaining > 0" @click="send">{{ remaining ? `${remaining}秒后重发` : sending ? '发送中…' : '获取验证码' }}</button></label>
    <p v-if="notice" class="account-login__notice" role="status">{{ notice }}</p><p v-if="error" class="account-login__error" role="alert">{{ error }}</p>
    <div class="account-login__agreements">
      <p v-if="protocols.isPending.value" role="status">正在加载协议…</p>
      <p v-else-if="protocols.isError.value" role="alert">协议加载失败，<button type="button" @click="protocols.refetch()">重试</button></p>
      <label v-else><input v-model="agreed" type="checkbox" :disabled="busy || sending" aria-label="同意用户协议和隐私政策" /><span>我已阅读并同意 <a :href="`/#/legal/terms/${terms?.version}`" target="_blank" rel="noopener">《用户协议》</a>和<a :href="`/#/legal/privacy/${privacy?.version}`" target="_blank" rel="noopener">《隐私政策》</a></span></label>
    </div>
    <button class="account-login__submit" type="submit" :disabled="busy || sending">{{ busy ? '登录中…' : '登录' }}</button>
    <p class="account-login__hint">{{ mode === 'password' ? '尚未设置密码？可切换验证码登录' : '验证码仅用于本次登录，请勿向他人透露' }}</p>
  </form>
</template>
<style scoped>
.account-login { display:grid; gap:12px; padding:0 16px 4px; }
.account-login__intro { text-align:center; margin-bottom:0; }
.account-login__intro > svg { width:56px; height:30px; stroke:#fa4c12; stroke-width:2; }
.account-login__intro h2 { font-size:22px; line-height:1.5; font-weight:650; color:#202125; margin:10px 0 0; }
.account-login__tabs { display:flex; justify-content:center; gap:28px; margin:4px 0 2px; }
.account-login__tabs button { border:0; background:none; padding:0 0 8px; color:#888c94; cursor:pointer; font-family:inherit; font-size:14px; font-weight:500; line-height:1.5; border-bottom:2px solid transparent; }
.account-login__tabs button[aria-selected=true] { color:#ee4e15; border-bottom-color:#ee4e15; }
.account-login__field { display:flex; align-items:center; margin:0; height:44px; border:1px solid #e4e0dc; border-radius:13px; background:#ffffff70; overflow:hidden; min-width:0; }
.account-login__field > .account-login__password { margin:0; width:100%; --el-input-text-color:#33363d; --el-input-placeholder-color:#a1a2a6; --el-font-size-base:15px; }
.account-login__field:focus-within { border-color:#f5a785; box-shadow:0 0 0 2px #f9611810; }
.account-login__field input { min-width:0; flex:1; width:100%; height:100%; padding:0 18px; border:0; outline:none; background:none; color:#33363d; font-family:inherit; font-size:15px; }
.account-login__field input::placeholder { color:#a1a2a6; }
.account-login__prefix { padding:0 17px 0 19px; border-right:1px solid #e4e0dc; font-size:15px; color:#43464c; }
.account-login__send { flex-shrink:0; border:0; border-left:1px solid #e4e0dc; color:#f04e14; background:none; padding:0 16px; font-size:13px; cursor:pointer; }
.account-login__submit { margin-top:4px; min-height:40px; border:0; border-radius:13px; background:linear-gradient(110deg,#ff5419,#f04408); color:white; font-size:16px; font-weight:600; font-family:inherit; cursor:pointer; }
.account-login button:disabled { opacity:.55; cursor:default; }
.account-login__notice,.account-login__error { margin:0; font-size:13px; line-height:1.5; }
.account-login__notice { color:#547762; }.account-login__error { color:#c63c2b; }
.account-login__agreements { font-size:12px; color:#858991; line-height:1.7; }.account-login__agreements p { margin:0; }.account-login__agreements label { display:flex; gap:7px; align-items:flex-start; margin:0; }.account-login__agreements input { margin:4px 0 0; accent-color:#e95520; }.account-login__agreements button { color:#666c75; border:0; background:none; cursor:pointer; }
.account-login__agreements a { color:var(--el-color-primary,#e95520); text-decoration:underline; text-decoration-thickness:1px; text-underline-offset:3px; cursor:pointer; }
.account-login__agreements a:hover { color:#c74413; text-decoration-thickness:2px; }
.account-login__agreements a:focus-visible { outline:2px solid var(--el-color-primary,#e95520); outline-offset:3px; border-radius:2px; }
.account-login__hint { margin:0; text-align:center; color:#999ca2; font-size:12px; line-height:1.6; }
@media(max-width:600px) { .account-login { padding:0 0 8px; }.account-login__intro h2 { font-size:22px; } }
</style>
