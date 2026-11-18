<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import {
  ChevronRight,
  NotebookText,
  Star,
  Settings,
  LogOut,
} from "lucide-vue-next";
import MemberAvatar from "./MemberAvatar.vue";
const props = defineProps<{
  name?: string;
  bio?: string;
  avatar?: string;
  noteCount?: number;
  live: boolean;
  personal: boolean;
}>();
const emit = defineEmits<{
  (
    event: "mine" | "favorites" | "profile" | "settings" | "login" | "logout",
  ): void;
}>();
const expanded = ref(false),
  root = ref<HTMLElement | null>(null),
  trigger = ref<HTMLButtonElement | null>(null);
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) expanded.value = false;
}
onMounted(() => document.addEventListener("pointerdown", outside));
onUnmounted(() => { document.removeEventListener("pointerdown", outside); clearTimeout(closeTimer); });
let closeTimer: ReturnType<typeof setTimeout> | undefined;
/** 延迟收起让指针能穿过按钮与面板间隙；触屏继续使用点击和键盘。 */
function enter(event: PointerEvent) { if (event.pointerType !== "mouse") return; clearTimeout(closeTimer); expanded.value = true; }
function leave(event: PointerEvent) { if (event.pointerType !== "mouse") return; closeTimer = setTimeout(() => { expanded.value = false; }, 160); }
function activate() { clearTimeout(closeTimer); if (!props.name) select("login"); else expanded.value = !expanded.value; }
function select(
  action: "mine" | "favorites" | "profile" | "settings" | "login" | "logout",
) {
  expanded.value = false;
  emit(action);
}
/** 菜单支持方向键选择和Escape关闭，离开菜单的Tab焦点不会被困住。 */
async function keyboard(event: KeyboardEvent) {
  if (event.key === "Escape") {
    expanded.value = false;
    trigger.value?.focus();
    event.preventDefault();
    return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  expanded.value = true;
  await nextTick();
  const items = [
    ...root.value!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  ];
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (index + 1) % items.length
          : index <= 0
            ? items.length - 1
            : index - 1;
  items[next]?.focus();
}
function focusLeft(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node))
    expanded.value = false;
}
</script>
<template>
  <div
    ref="root"
    class="account-menu"
    @keydown="keyboard"
    @focusout="focusLeft"
    @pointerenter="enter"
    @pointerleave="leave"
  >
    <button
      ref="trigger"
      class="account-menu__trigger"
      :class="{ 'account-menu__trigger--guest': !name }"
      :aria-label="name ? '我的账号' : '登录账号菜单'"
      aria-haspopup="menu"
      :aria-expanded="expanded"
      @click="activate"
    >
      <MemberAvatar v-if="name" :src="avatar" :name="name" :size="38" />
      <template v-else>
        <span class="account-menu__guest-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></svg>
        </span><span>登录</span>
      </template>
    </button>
    <Transition name="account-menu">
      <div
        v-if="expanded"
        class="account-menu__panel"
        role="menu"
        aria-label="我的账号菜单"
      >
        <button type="button" role="menuitem" class="account-menu__identity" @click="select(name ? 'profile' : 'login')">
          <MemberAvatar :src="avatar" :name="name" :size="62" />
          <div>
            <strong>{{ name || "未登录" }}</strong>
            <p>
              {{
                bio ||
                (name ? "还没有填写个人简介" : "登录后查看笔记、收藏与进展")
              }}
            </p>
        </div>
</button>
        <button
          role="menuitem"
          class="account-menu__item"
          @click="select('mine')"
        >
          <NotebookText :size="22" /><span>我的笔记</span
          ><span class="account-menu__count">{{ noteCount }}</span
          ><ChevronRight :size="16" />
        </button>
        <button
          v-if="live"
          role="menuitem"
          class="account-menu__item"
          @click="select('favorites')"
        >
          <Star :size="23" /><span>我的收藏</span><ChevronRight :size="16" />
        </button>
        <div v-if="live" class="account-menu__divider"></div>
        <button
          v-if="live"
          role="menuitem"
          class="account-menu__item account-menu__item--settings"
          @click="select('settings')"
        >
          <Settings :size="22" /><span>账号设置</span
          ><ChevronRight :size="16" />
        </button>
        <button
          v-if="name && live"
          role="menuitem"
          class="account-menu__signout"
          @click="select('logout')"
        >
          <LogOut :size="14" />退出账号
        </button>
      </div>
    </Transition>
  </div>
</template>
<style scoped>
.account-menu {
  position: relative;
}
.account-menu__trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: none;
  padding: 0;
  color: #262a30;
  font: 500 16px/1.5 sans-serif;
  cursor: pointer;
}
.account-menu__trigger {
  border-radius: 50%;
  outline: none;
}
.account-menu__trigger:focus-visible {
  box-shadow: 0 0 0 3px #f14b1233;
}
.account-menu__trigger:hover {
  box-shadow: 0 0 0 3px #f5eee8;
}
.account-menu__panel {
  position: absolute;
  z-index: 25;
  width: 316px;
  right: 0;
  top: calc(100% + 15px);
  padding: 22px 16px 12px;
  border: 1px solid #e9d8c9;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 22px #38210d24;
  color: #22262d;
}
.account-menu__panel::before {
  content: "";
  position: absolute;
  right: 12px;
  top: -7px;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  border-top: 1px solid #e9d8c9;
  border-left: 1px solid #e9d8c9;
  background: white;
}
.account-menu__identity {
  border: 0; background: none; padding: 0; width: 100%; text-align: left; color: inherit; font-family: inherit; cursor: pointer;
  display: flex;
  gap: 14px;
  align-items: center;
  margin: 0 2px 20px;
}
.account-menu__identity > div {
  min-width: 0;
  flex: 1;
}
.account-menu__identity strong {
  font-size: 21px;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.account-menu__identity p {
  margin: 5px 0 7px;
  color: #737782;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-menu__profile {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  background: none;
  color: #f14b12;
  font-size: 14px;
  cursor: pointer;
}
.account-menu__item {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
  margin-top: 8px;
  padding: 13px 14px;
  background: #f7f5f2;
  border: 0;
  border-radius: 12px;
  color: #282c33;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}
.account-menu__item > span:first-of-type {
  flex: 1;
}
.account-menu__item small {
  font-size: 11px;
  color: #90949b;
  margin-left: 7px;
}
.account-menu__count {
  color: #7c8088;
  font-size: 13px;
}
.account-menu__item--settings {
  background: white;
}
.account-menu__item:hover,
.account-menu__item:focus-visible {
  background: #fff0e7;
}
.account-menu__divider {
  height: 1px;
  background: #eeeff0;
  margin: 17px 0 7px;
}
.account-menu__signout {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 12px 14px 4px auto;
  border: 0;
  padding: 0;
  color: #92969c;
  background: none;
  cursor: pointer;
  font-size: 12px;
}
.account-menu-enter-active,
.account-menu-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.account-menu-enter-from,
.account-menu-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
@media (max-width: 600px) {
  .account-menu__trigger {
    gap: 7px;
    font-size: 14px;
  }
  .account-menu__trigger {
    --member-avatar-size: 30px;
  }
  .account-menu__panel {
    width: min(316px, calc(100vw - 24px));
    right: 0;
  }
  .account-menu__panel::before {
    right: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .account-menu-enter-active,
  .account-menu-leave-active {
    transition: none;
  }
}
</style>

<style scoped>
.account-menu__trigger--guest { padding: 5px 14px 5px 7px; gap: 8px; border-radius: 12px; color: #fff; background: var(--notes-accent, #e95520); font-weight: 600; --member-avatar-size: 28px; }
.account-menu__trigger--guest:hover { background: #e34810; box-shadow: none; }
.account-menu__trigger--guest:focus-visible { box-shadow: 0 0 0 3px #f14b1233; }
</style>

<style scoped>
/* 登录按钮使用白色实心人物，避免继承通用头像的灰米色占位样式。 */
.account-menu button:focus { outline:none; }
.account-menu button:focus-visible { box-shadow:inset 0 0 0 2px #34373c38; }
.account-menu__guest-icon { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; flex-shrink:0; border-radius:50%; background:#ffffff30; color:#fff; overflow:hidden; }
.account-menu__guest-icon svg { width:20px; height:20px; fill:currentColor; }
</style>
