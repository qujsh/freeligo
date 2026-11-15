<script setup lang="ts">
import { PenLine } from "lucide-vue-next";
import UnionLogo from "../../../shared/ui/UnionLogo.vue";
import AccountMenu from "../../account/components/AccountMenu.vue";
defineProps<{
  growth: boolean;
  personal: boolean;
  userName?: string;
  bio?: string;
  avatar?: string;
  live: boolean;
  noteCount: number;
}>();
defineEmits<{
  mine: [];
  compose: [];
  favorites: [];
  login: [];
  logout: [];
  profile: [];
  settings: [];
}>();
</script>
<template>
  <header class="notes-header">
    <router-link class="notes-brand" to="/" aria-label="自由人联合体首页"
      >
<UnionLogo /><span
        >自由人联合体<small>不同的人，向往同一个美好生活</small></span
      >
</router-link
    >
    <nav class="notes-nav" aria-label="主导航">
      <router-link to="/" :class="{ active: !growth && !personal }"
        >
发现
</router-link
      ><router-link to="/?view=growth" :class="{ active: growth }"
        >
成果与成长
</router-link
      >
    </nav>
    <div class="notes-actions notes-actions--member">
      <button class="notes-primary" @click="$emit('compose')">
        <PenLine :size="18" /><span>写笔记<small>本机</small></span>
</button
      ><span class="notes-actions__divider"></span
      ><AccountMenu
        :name="userName"
        :bio="bio"
        :avatar="avatar"
        :live="live"
        :personal="personal"
        :note-count="noteCount"
        @mine="$emit('mine')"
        @favorites="$emit('favorites')"
        @profile="$emit('profile')"
        @settings="$emit('settings')"
        @login="$emit('login')"
        @logout="$emit('logout')"
      />
    </div>
  </header>
</template>

<style scoped>
/* 鼠标操作不留边框；键盘焦点用柔和中性色提示，覆盖全局品牌色轮廓。 */
.notes-actions > .notes-primary:focus { outline:none; }
.notes-actions > .notes-primary:focus-visible { box-shadow:0 0 0 3px #34373c24; background:#f5f4f2; }
</style>
