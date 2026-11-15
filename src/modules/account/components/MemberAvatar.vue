<script setup lang="ts">
import { ref, watch } from "vue";
import { UserRound } from "lucide-vue-next";
const props = defineProps<{ src?: string; name?: string; size?: number }>();
const failed = ref(false);
watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>
<template>
  <span
    class="member-avatar"
    :style="{ '--member-avatar-base-size': `${size || 40}px` }"
  >
    <img v-if="src && !failed" :src="src" alt="头像" @error="failed = true" />
    <span v-else-if="name">{{ name.slice(0, 1) }}</span
    ><UserRound v-else :size="(size || 40) * 0.48" />
  </span>
</template>
<style scoped>
.member-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f4eee8;
  color: #92634c;
  width: var(--member-avatar-size, var(--member-avatar-base-size));
  height: var(--member-avatar-size, var(--member-avatar-base-size));
  font: 500
    calc(var(--member-avatar-size, var(--member-avatar-base-size)) * 0.35)/1
    sans-serif;
  overflow: hidden;
}
.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
