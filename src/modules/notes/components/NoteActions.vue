<script setup lang="ts">
import { Heart, Star, RefreshCw, MessageCircle } from "lucide-vue-next";
import type { NoteEngagement } from "../../../services/publicNotes";
defineProps<{
  state?: NoteEngagement;
  busy?: boolean;
  compact?: boolean;
  failed?: boolean;
  showComments?: boolean;
  commentCount?: number;
}>();
defineEmits<{ like: []; favorite: []; retry: []; comment: [] }>();
</script>
<template>
  <div class="note-actions" :class="{ 'note-actions--compact': compact }">
    <button
      v-if="failed && !state"
      class="note-actions__retry"
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
    <button v-if="showComments && !compact" type="button" aria-label="查看评论" @click.stop="$emit('comment')"><MessageCircle :size="22" /><span>{{ commentCount === undefined ? '评论' : commentCount || '评论' }}</span></button>
  </div>
</template>
<style scoped>
.note-actions {
  display: flex;
  align-items: center;
  gap: 26px;
}
.note-actions button {
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
.note-actions button.selected {
  color: #ee4c38;
}
.note-actions button:disabled {
  cursor: default;
  opacity: 0.5;
}
.note-actions button:focus-visible {
  outline: 2px solid #f24b13;
  outline-offset: 2px;
  border-radius: 4px;
}
.note-actions--compact {
  flex-shrink: 0;
  margin-left: auto;
}
.note-actions--compact button {
  font-size: 12px;
  padding: 2px;
  gap: 4px;
}
@media (hover: hover) {
  .note-actions button:not(:disabled):hover {
    color: #ee4c38;
  }
}
</style>
