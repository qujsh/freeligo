<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import UnionLogo from "../../../shared/ui/UnionLogo.vue";
defineProps<{ growth: boolean }>();
defineEmits<{ mine: []; compose: [] }>();
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
      <router-link to="/" :class="{ active: !growth }">发现</router-link
      ><router-link to="/?view=growth" :class="{ active: growth }"
        >
成果与成长
</router-link
      >
    </nav>
    <div class="notes-actions">
      <el-dropdown @command="$emit('mine')"
        >
<button class="notes-account">
          我的笔记<ChevronDown :size="14" />
</button
        ><template #dropdown
          >
<el-dropdown-menu
            >
<el-dropdown-item command="mine"
              >
本机笔记
</el-dropdown-item
            >
</el-dropdown-menu
          >
</template
        >
</el-dropdown
      ><button class="notes-primary" @click="$emit('compose')">写笔记</button>
    </div>
  </header>
</template>
