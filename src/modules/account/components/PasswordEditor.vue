<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { accountProfile } from "../../../services/accountProfile";
defineProps<{ phone: string; existing: boolean }>();
const emit = defineEmits<{ saved: []; cancel: []; busy: [value: boolean] }>();
const code = ref(""),
  password = ref(""),
  confirm = ref(""),
  error = ref(""),
  remaining = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
onUnmounted(() => clearInterval(timer));
const send = useMutation({
  mutationFn: ({ phone, existing }: { phone: string; existing: boolean }) =>
    accountProfile.sendCode(
      phone,
      existing ? "reset_password" : "set_password",
    ),
  onSuccess: (value) => {
    remaining.value = value.retryAfterSeconds;
    clearInterval(timer);
    timer = setInterval(() => {
      remaining.value = Math.max(0, remaining.value - 1);
      if (!remaining.value) clearInterval(timer);
    }, 1000);
  },
});
const save = useMutation({
  mutationFn: ({ phone, existing }: { phone: string; existing: boolean }) =>
    accountProfile.password(phone, code.value, password.value, existing),
  onSuccess: () => emit("saved"),
});
watch(save.isPending, (value) => emit("busy", value), { flush: "sync" });
/** 验证码用途由后端区分；密码仅保留于当前表单，成功后重新登录，不写浏览器存储。 */
function submit(phone: string, existing: boolean) {
  error.value = "";
  if (!/^\d{6}$/.test(code.value)) {
    error.value = "请输入6位验证码";
    return;
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7e]{8,64}$/.test(password.value)) {
    error.value = "密码需为8–64位，包含字母和数字，不含空格";
    return;
  }
  if (password.value !== confirm.value) {
    error.value = "两次输入的密码不一致";
    return;
  }
  save.mutate({ phone, existing });
}
</script>
<template>
  <form class="password-editor" @submit.prevent="submit(phone, existing)">
    <p>
      验证码将发送至
      {{
        phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2")
      }}。保存密码后，所有设备会退出登录。
    </p>
    <label
      >手机验证码
      <div class="password-editor__code">
        <el-input
          v-model="code"
          aria-label="安全验证码"
          maxlength="6"
          autocomplete="one-time-code"
          :disabled="save.isPending.value"
        /><button
          type="button"
          class="member-outline"
          :disabled="
            !!remaining || send.isPending.value || save.isPending.value
          "
          @click="send.mutate({ phone, existing })"
        >
          {{
            remaining
              ? `${remaining}秒后重发`
              : send.isPending.value
                ? "发送中…"
                : "获取验证码"
          }}
        </button>
      </div></label
    >
    <label
      >新密码<el-input
        v-model="password"
        aria-label="新密码"
        type="password"
        show-password
        maxlength="64"
        autocomplete="new-password"
        :disabled="save.isPending.value"
    /></label>
    <label
      >确认新密码<el-input
        v-model="confirm"
        aria-label="确认新密码"
        type="password"
        show-password
        maxlength="64"
        autocomplete="new-password"
        :disabled="save.isPending.value"
    /></label>
    <p
      v-if="error || save.error.value || send.error.value"
      class="password-editor__error"
      role="alert"
    >
      {{ error || save.error.value?.message || send.error.value?.message }}
    </p>
    <p
      v-else-if="send.isSuccess.value"
      class="password-editor__sent"
      role="status"
    >
      验证码已发送，请查收。
    </p>
    <div class="password-editor__footer">
      <button
        type="button"
        class="member-outline"
        :disabled="save.isPending.value"
        @click="emit('cancel')"
      >
        取消
</button
      ><button
        class="notes-primary"
        :disabled="save.isPending.value"
        type="submit"
      >
        {{ save.isPending.value ? "保存中…" : "确认保存" }}
      </button>
    </div>
  </form>
</template>
<style scoped>
.password-editor {
  display: grid;
  gap: 20px;
  padding: 6px;
}
.password-editor > p {
  font-size: 14px;
  line-height: 1.7;
  color: #83878e;
  margin: 0;
}
.password-editor label {
  display: grid;
  gap: 9px;
  font-size: 14px;
  color: #34363b;
}
.password-editor__code {
  display: flex;
  gap: 10px;
}
.password-editor__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.password-editor > .password-editor__error {
  color: #c43d2f;
}
.password-editor > .password-editor__sent {
  color: #44805b;
}
</style>
