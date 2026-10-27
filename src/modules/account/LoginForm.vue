<script setup lang="ts">
import { ref } from "vue";
import { useSession } from "./session";
import { account } from "../../services/taskInteractions";
const session = useSession(),
  phone = ref(""),
  code = ref(""),
  busy = ref(false),
  sending = ref(false),
  error = ref(""),
  notice = ref("");
const emit = defineEmits<{ loggedIn: [] }>();
async function send() {
  if (!/^1\d{10}$/.test(phone.value)) {
    error.value = "请输入有效手机号";
    return;
  }
  sending.value = true;
  error.value = "";
  try {
    const r = await account.send(phone.value);
    notice.value = r.developmentCode
      ? `当前为开发验证码服务，验证码：${r.developmentCode}`
      : r.message;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    sending.value = false;
  }
}
async function login() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await session.signIn(phone.value, code.value);
    emit("loggedIn");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form class="account-login" @submit.prevent="login">
    <p>登录后可以收藏任务、表达承接意向并查看处理进度。</p>
    <label
      >手机号<el-input
        v-model="phone"
        aria-label="登录手机号"
        maxlength="11" /></label
    ><label
      >验证码<el-input
        v-model="code"
        aria-label="登录验证码"
        maxlength="6" /></label
    ><el-button :loading="sending" @click="send">获取验证码</el-button
    ><el-alert
      v-if="notice"
      :title="notice"
      type="info"
      :closable="false"
    /><el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    /><el-button type="primary" native-type="submit" :loading="busy"
      >
登录并继续
</el-button
    >
  </form>
</template>
<style scoped>
.account-login {
  display: grid;
  gap: 16px;
}
.account-login label {
  display: grid;
  gap: 8px;
}
.account-login p {
  color: #747a86;
  line-height: 1.7;
}
</style>
