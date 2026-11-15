<script setup lang="ts">
import { Heart, Star, RefreshCw } from "lucide-vue-next";
import type { ShareEngagement } from "../../../services/publicShares";
defineProps<{
  state?: ShareEngagement;
  busy?: boolean;
  compact?: boolean;
  failed?: boolean;
}>();
defineEmits<{ like: []; favorite: []; retry: [] }>();
</script>
<template>
  <div class="share-actions" :class="{ 'share-actions--compact': compact }">
    <button
      v-if="failed && !state"
      class="share-actions__retry"
      aria-label="重试加载互动状态"
      @click.stop="$emit('retry')"
    >
      <RefreshCw :size="15" /><span v-if="!compact">重试加载互动</span>
    </button>
    <template v-else>
      <button
        :disabled="busy || !state"
        :aria-pressed="state?.liked ?? false"
        :aria-label="state?.liked ? '取消点赞' : '点赞'"
        :class="{ selected: state?.liked }"
        @click.stop="$emit('like')"
      >
        <Heart
          :size="compact ? 17 : 22"
          :fill="state?.liked ? 'currentColor' : 'none'"
        /><span>{{
          state ? state.likeCount || (compact ? "赞" : "点赞") : "…"
        }}</span>
      </button>
      <button
        v-if="!compact"
        :disabled="busy || !state"
        :aria-pressed="state?.favorited ?? false"
        :aria-label="state?.favorited ? '取消收藏' : '收藏'"
        :class="{ selected: state?.favorited }"
        @click.stop="$emit('favorite')"
      >
        <Star
          :size="22"
          :fill="state?.favorited ? 'currentColor' : 'none'"
        /><span>{{ state ? state.favoriteCount || "收藏" : "…" }}</span>
      </button>
    </template>
  </div>
</template>
<style scoped>
.share-actions {
  display: flex;
  align-items: center;
  gap: 26px;
}
.share-actions button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: #777b80;
  padding: 8px 2px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.share-actions button.selected {
  color: #ee4c38;
}
.share-actions button:disabled {
  cursor: default;
  opacity: 0.5;
}
.share-actions button:focus-visible {
  outline: 2px solid #f24b13;
  outline-offset: 2px;
  border-radius: 4px;
}
.share-actions--compact {
  flex-shrink: 0;
  margin-left: auto;
}
.share-actions--compact button {
  font-size: 12px;
  padding: 2px;
  gap: 4px;
}
@media (hover: hover) {
  .share-actions button:not(:disabled):hover {
    color: #ee4c38;
  }
}
</style>
