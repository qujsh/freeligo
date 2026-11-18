<script setup lang="ts">
import { ref } from "vue";
import { publicMediaUrl, type NoteComment } from "../../../services/publicNotes";
import { MessageCircle } from "lucide-vue-next";
defineProps<{ items: NoteComment[]; total?: number; loading: boolean; error?: string; more: boolean; loadingMore: boolean; moreError?: string; deleting: boolean }>();
defineEmits<{ reply: [comment: NoteComment]; remove: [comment: NoteComment]; retry: []; more: [] }>();
const section = ref<HTMLElement | null>(null);
const failedAvatars = ref(new Set<string>());
defineExpose({ scrollIntoView: () => section.value?.scrollIntoView({ block: "start", behavior: "smooth" }) });
function date(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
</script>
<template>
  <section ref="section" class="note-comments" aria-label="笔记评论">
    <h2>评论<span v-if="total !== undefined">{{ total }}</span></h2>
    <p v-if="loading" class="note-comments__hint" role="status">正在加载评论…</p>
    <div v-else-if="error" class="note-comments__hint" role="alert">
      <p>{{ error }}</p><button type="button" @click="$emit('retry')">重试加载评论</button>
    </div>
    <div v-else-if="!items.length" class="note-comments__empty"><MessageCircle :size="26" :stroke-width="1.3" /><p>还没有评论，来说说你的想法吧</p></div>
    <article v-for="comment in items" :key="comment.commentNo" class="note-comment" :class="{ 'note-comment--reply': comment.replyTo }">
      <img v-if="publicMediaUrl(comment.author.avatarUrl) && !failedAvatars.has(comment.commentNo)" class="note-comment__avatar" :src="publicMediaUrl(comment.author.avatarUrl)" alt="" @error="failedAvatars.add(comment.commentNo)" />
      <span v-else class="note-comment__avatar note-comment__initial">{{ comment.author.nickname.slice(0, 1) || '·' }}</span>
      <div class="note-comment__body">
        <div class="note-comment__author">{{ comment.author.nickname || '用户' }}<span v-if="comment.own">我</span></div>
        <p v-if="comment.replyTo" class="note-comment__reply-to">回复 {{ comment.replyTo.unavailable ? '已删除的评论' : comment.replyTo.nickname || '用户' }}</p>
        <p class="note-comment__text">{{ comment.content }}</p>
        <div class="note-comment__meta"><time :datetime="comment.createdAt">{{ date(comment.createdAt) }}</time><button type="button" @click="$emit('reply', comment)">回复</button><button v-if="comment.own" type="button" :disabled="deleting" :aria-label="`删除评论：${comment.content.slice(0, 20)}`" @click="$emit('remove', comment)">删除</button></div>
      </div>
    </article>
    <div v-if="more || moreError" class="note-comments__hint"><p v-if="moreError" role="alert">{{ moreError }}</p><button type="button" :disabled="loadingMore" @click="$emit('more')">{{ loadingMore ? '加载中…' : moreError ? '重试加载更多' : '展开更多评论' }}</button></div>
  </section>
</template>
<style scoped>
.note-comments { margin-top:32px; border-top:1px solid #f0f0f0; padding-top:24px; scroll-margin-top:16px; }
.note-comments h2 { display:flex; gap:8px; align-items:center; font-size:15px; font-weight:500; margin:0 0 22px; color:#333840; }
.note-comments h2 span { color:#969ba4; font-size:13px; font-weight:400; }
.note-comment { display:flex; gap:10px; margin-bottom:22px; }
.note-comment--reply { margin-left:24px; }
.note-comment__avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; flex-shrink:0; }
.note-comment__initial { display:grid; place-items:center; background:#f6ebe3; color:#9b6445; font-size:13px; }
.note-comment__body { min-width:0; flex:1; }
.note-comment__author { display:flex; gap:6px; align-items:center; font-size:12px; color:#858b96; }
.note-comment__author span { background:#f4f4f4; padding:0 4px; border-radius:3px; font-size:10px; }
.note-comment__text { font-size:14px; line-height:1.75; white-space:pre-wrap; overflow-wrap:anywhere; margin:5px 0 8px; color:#363b43; }
.note-comment__reply-to { font-size:12px; line-height:1.6; color:#969ba4; margin:6px 0 0; }
.note-comment__meta { display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:11px; color:#a1a5ad; }
.note-comments button { border:0; background:transparent; color:#8a8f99; padding:0; font:inherit; cursor:pointer; }
.note-comments button:hover { color:var(--notes-accent, #e95520); }
.note-comments button:disabled { opacity:.5; cursor:wait; }
.note-comments button:focus-visible { outline:2px solid var(--notes-accent, #e95520); outline-offset:3px; }
.note-comments__empty { display:grid; justify-items:center; color:#a1a5ad; padding:14px 0 24px; font-size:12px; text-align:center; }
.note-comments__hint { font-size:12px; line-height:1.7; color:#969ba4; text-align:center; padding:10px 0; }
</style>
