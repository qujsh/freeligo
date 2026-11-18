<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  ArrowLeft,
  UserRound,
  ShieldCheck,
  ChevronRight,
  Monitor,
  LogOut,
  Smartphone,
} from "lucide-vue-next";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  accountProfile,
  type AccountProfile,
} from "../../../services/accountProfile";
import { useSession } from "../session";
import MemberAvatar from "./MemberAvatar.vue";
import PasswordEditor from "./PasswordEditor.vue";
const props = defineProps<{
  profile?: AccountProfile;
  avatar?: string;
  loading: boolean;
  error?: string;
  live: boolean;
}>();
const emit = defineEmits<{
  back: [];
  edit: [];
  logout: [];
  login: [];
  retry: [];
}>();
const session = useSession(),
  client = useQueryClient();
const tab = ref<"profile" | "security">("profile"),
  passwordOpen = ref(false),
  passwordBusy = ref(false);
watch(() => session.user?.id, () => { passwordOpen.value = false; passwordBusy.value = false; });
const enabled = computed(
  () => props.live && !!session.user && tab.value === "security",
);
const devices = useQuery({
  queryKey: computed(() => ["account-sessions", session.user?.id ?? "guest"]),
  queryFn: ({ signal }) => accountProfile.sessions(signal),
  enabled,
  retry: false,
});
const passwordStatus = useQuery({
  queryKey: computed(() => ["account-password", session.user?.id ?? "guest"]),
  queryFn: ({ signal }) => accountProfile.passwordStatus(signal),
  enabled,
  retry: false,
});
const revoke = useMutation({
  mutationFn: ({ no }: { no: string; owner: string }) =>
    accountProfile.revoke(no),
  onSuccess: (_result, input) => {
    if (session.user?.id !== input.owner) return;
    void client.invalidateQueries({
      queryKey: ["account-sessions", input.owner],
    });
    ElMessage.success("该设备已退出登录");
  },
  onError: (error) => ElMessage.error(error.message),
});
const phone = computed(
  () =>
    props.profile?.phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2") || "—",
);
/** 只允许用户主动撤销其他设备，确认取消不发请求；当前设备通过退出账号处理。 */
async function revokeDevice(no: string) {
  if (revoke.isPending.value || !session.user) return;
  try {
    await ElMessageBox.confirm(
      "该设备需要重新登录才能继续使用。",
      "退出此设备？",
      {
        confirmButtonText: "确认退出",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }
  if (session.user) revoke.mutate({ no, owner: session.user.id });
}
async function passwordSaved() {
  passwordOpen.value = false;
  await session.restore(true);
  ElMessage.success("密码已保存，请重新登录");
  session.requireLogin(() => {});
}
const date = (value: string) => value.replace("T", " ").slice(0, 16);
</script>
<template>
  <section class="member-settings">
    <button class="member-back" @click="emit('back')">
      <ArrowLeft :size="17" />返回个人主页
    </button>
    <h1>账号设置</h1>
    <div v-if="!session.user || !live" class="member-settings__login">
      <UserRound :size="36" />
      <h2>{{ live ? "登录后管理账号" : "当前为本机演示模式" }}</h2>
      <p>
        {{
          live
            ? "资料与安全设置会同步到你的账号。"
            : "账号资料与安全设置需要连接真实后端。"
        }}
      </p>
      <button v-if="live" class="notes-primary" @click="emit('login')">
        登录并继续
      </button>
    </div>
    <div v-else class="member-settings__layout">
      <nav class="member-settings__nav" aria-label="设置分类">
        <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">
          <UserRound :size="19" />个人资料
</button
        ><button
          :class="{ active: tab === 'security' }"
          @click="tab = 'security'"
        >
          <ShieldCheck :size="19" />账号与安全
        </button>
      </nav>
      <div class="member-settings__content">
        <template v-if="tab === 'profile'">
          <h2>个人资料</h2>
          <p class="member-settings__hint">
            介绍一下自己，让每一次笔记都带着你的名字。
          </p>
          <el-skeleton v-if="loading" :rows="4" animated />
          <div v-else-if="error" class="member-settings__error" role="alert">
            {{ error
            }}<button class="member-outline" @click="emit('retry')">
              重试
            </button>
          </div>
          <template v-else-if="profile"
            >
<div class="member-settings__row">
              <span>头像</span
              ><MemberAvatar
                :src="avatar"
                :name="profile.nickname"
                :size="64"
              /><button class="member-link" @click="emit('edit')">
                修改<ChevronRight :size="15" />
              </button>
            </div>
            <div class="member-settings__row">
              <span>昵称</span><strong>{{ profile.nickname }}</strong
              ><button class="member-link" @click="emit('edit')">
                编辑<ChevronRight :size="15" />
              </button>
            </div>
            <div class="member-settings__row">
              <span>个人简介</span>
              <p>{{ profile.bio || "还没有填写个人简介" }}</p>
              <button class="member-link" @click="emit('edit')">
                编辑<ChevronRight :size="15" />
              </button>
</div
          >
</template>
          <p class="member-settings__note">
            昵称、头像和简介用于展示个人资料，请勿填写手机号等私密信息。
          </p>
        </template>
        <template v-else>
          <h2>账号与安全</h2>
          <p class="member-settings__hint">
            管理登录方式和设备，保护你的账号。
          </p>
          <div class="member-settings__row">
            <Smartphone :size="19" /><span>登录手机号</span
            ><strong>{{ phone }}</strong>
          </div>
          <div class="member-settings__row">
            <ShieldCheck :size="19" /><span>登录密码</span
            ><strong>{{
              passwordStatus.isPending.value
                ? "读取中…"
                : passwordStatus.isError.value
                  ? "读取失败"
                  : passwordStatus.data.value?.hasPassword
                    ? "已设置"
                    : "未设置"
            }}</strong
            ><button
              v-if="passwordStatus.isError.value"
              class="member-link"
              @click="passwordStatus.refetch()"
            >
              重试
</button
            ><button
              v-else
              class="member-link"
              :disabled="!profile || passwordStatus.isPending.value"
              @click="passwordOpen = true"
            >
              {{
                passwordStatus.data.value?.hasPassword
                  ? "修改密码"
                  : "设置密码"
              }}<ChevronRight :size="15" />
            </button>
          </div>
          <div class="member-settings__devices-title">
            <h3>登录设备</h3>
            <button
              class="member-link"
              :disabled="devices.isFetching.value"
              @click="devices.refetch()"
            >
              刷新
            </button>
          </div>
          <el-skeleton v-if="devices.isPending.value" :rows="3" animated />
          <div
            v-else-if="devices.isError.value"
            class="member-settings__error"
            role="alert"
          >
            设备加载失败：{{ devices.error.value?.message
            }}<button class="member-outline" @click="devices.refetch()">
              重试
            </button>
          </div>
          <div
            v-for="device in devices.data.value"
            :key="device.sessionNo"
            class="member-settings__device"
          >
            <Monitor :size="23" />
            <div>
              <strong>{{ device.device }}</strong>
              <p>{{ date(device.createdAt) }} 登录</p>
            </div>
            <span v-if="device.current" class="member-settings__current"
              >当前设备</span
            ><button
              v-else
              class="member-link"
              :disabled="revoke.isPending.value"
              @click="revokeDevice(device.sessionNo)"
            >
              退出此设备
            </button>
          </div>
          <div class="member-settings__logout">
            <button class="member-outline" @click="emit('logout')">
              <LogOut :size="17" />退出当前账号
            </button>
          </div>
        </template>
      </div>
    </div>
    <el-dialog
      v-if="passwordOpen && session.user && profile && passwordStatus.data.value"
      :model-value="passwordOpen"
      :title="
        passwordStatus.data.value.hasPassword ? '修改登录密码' : '设置登录密码'
      "
      width="min(480px, 92vw)"
      destroy-on-close
      :close-on-click-modal="!passwordBusy"
      :close-on-press-escape="!passwordBusy"
      :show-close="!passwordBusy"
      @close="passwordOpen = false"
      >
<PasswordEditor
        :phone="profile.phone"
        :existing="passwordStatus.data.value.hasPassword"
        @cancel="passwordOpen = false"
        @saved="passwordSaved"
        @busy="passwordBusy = $event"
    />
</el-dialog>
  </section>
</template>
<style scoped>
.member-settings {
  max-width: 1180px;
  margin: 28px auto 70px;
  padding: 0 16px;
}
.member-settings h1 {
  font-size: 28px;
  margin: 28px 0 35px;
}
.member-settings__layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 54px;
}
.member-settings__nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.member-settings__nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 10px;
  padding: 14px 18px;
  background: none;
  color: #666b73;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
.member-settings__nav button.active {
  background: #fff0e8;
  color: #ef4b15;
}
.member-settings__content {
  min-width: 0;
}
.member-settings__content h2 {
  margin: 10px 0 12px;
  font-size: 21px;
  font-weight: 600;
}
.member-settings__hint {
  color: #83878e;
  font-size: 14px;
  margin: 0 0 28px;
}
.member-settings__row {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 84px;
  padding: 18px 0;
  border-bottom: 1px solid #eeefef;
  font-size: 14px;
}
.member-settings__row > span:first-child {
  min-width: 90px;
  color: #70747c;
}
.member-settings__row strong {
  font-weight: 500;
}
.member-settings__row p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  color: #656970;
}
.member-settings__row .member-link {
  margin-left: auto;
  flex-shrink: 0;
}
.member-settings__note {
  font-size: 12px;
  color: #96999e;
  margin: 24px 0;
  line-height: 1.8;
}
.member-settings__devices-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 38px;
}
.member-settings__devices-title h3 {
  font-size: 16px;
  font-weight: 600;
}
.member-settings__device {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 0;
  border-bottom: 1px solid #eeefef;
  font-size: 14px;
}
.member-settings__device strong {
  font-weight: 500;
}
.member-settings__device p {
  font-size: 12px;
  color: #96999e;
  margin: 7px 0 0;
}
.member-settings__current {
  margin-left: auto;
  color: #6b8a72;
  font-size: 12px;
}
.member-settings__device .member-link {
  margin-left: auto;
}
.member-settings__logout {
  margin-top: 38px;
}
.member-settings__error {
  color: #bd4b37;
  display: grid;
  justify-items: start;
  gap: 15px;
  font-size: 14px;
}
.member-settings__login {
  padding: 70px 0 100px;
  text-align: center;
  color: #898d94;
}
.member-settings__login h2 {
  font-size: 20px;
  color: #34363b;
}
.member-settings__login p {
  margin: 18px 0 26px;
  font-size: 14px;
}
@media (max-width: 700px) {
  .member-settings {
    margin-top: 20px;
    padding: 0 4px;
  }
  .member-settings__layout {
    display: block;
  }
  .member-settings__nav {
    flex-direction: row;
    border-bottom: 1px solid #eee;
    margin-bottom: 22px;
    padding-bottom: 12px;
  }
  .member-settings__nav button {
    padding: 11px 15px;
  }
  .member-settings h1 {
    margin: 24px 0;
    font-size: 25px;
  }
  .member-settings__row {
    gap: 12px;
  }
  .member-settings__row > span:first-child {
    min-width: 65px;
  }
}
</style>
