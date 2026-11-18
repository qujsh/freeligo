<script setup lang="ts">
import { ref } from "vue";
import { X, Send } from "lucide-vue-next";
defineProps<{ modelValue: string; replyName?: string; busy: boolean; loggedIn: boolean; error?: string }>();
defineEmits<{ 'update:modelValue': [value: string]; submit: []; cancelReply: [] }>();
const input = ref<HTMLTextAreaElement | null>(null);
defineExpose({ focus: () => input.value?.focus({ preventScroll: true }) });
</script>
<template>
  <form class="comment-composer" @submit.prevent="$emit('submit')">
    <div v-if="replyName" class="comment-composer__reply">回复 {{ replyName }}<button type="button" aria-label="取消回复" :disabled="busy" @click="$emit('cancelReply')"><X :size="13" /></button></div>
    <div class="comment-composer__field">
      <textarea ref="input" :value="modelValue" :disabled="busy" maxlength="1000" rows="1" aria-label="评论内容" :placeholder="loggedIn ? '说点什么，让想法相遇…' : '说点什么，登录后参与讨论…'" @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" @keydown.ctrl.enter.prevent="$emit('submit')" @keydown.meta.enter.prevent="$emit('submit')" />
      <button class="comment-composer__send" type="submit" :disabled="busy || !modelValue.trim()" aria-label="发送评论"><Send :size="16" /><span>{{ busy ? '发送中' : '发送' }}</span></button>
    </div>
    <div v-if="modelValue.length || error" class="comment-composer__status"><span v-if="error" role="alert">{{ error }}</span><span>{{ modelValue.length }}/1000</span></div>
  </form>
</template>
<style scoped>
.comment-composer { margin:0 0 6px; }
.comment-composer__field { display:flex; gap:10px; align-items:center; }
.comment-composer textarea { flex:1; min-width:0; min-height:38px; max-height:110px; resize:none; border:1px solid transparent; border-radius:18px; background:#f6f6f6; padding:9px 13px; font-family:inherit; font-size:13px; line-height:1.5; color:#353a43; box-sizing:border-box; }
.comment-composer textarea:focus { outline:none; border-color:#e9c4b5; background:#fffaf7; }
.comment-composer textarea::placeholder { color:#9a9ea6; }
.comment-composer button { display:inline-flex; align-items:center; gap:4px; border:0; background:transparent; padding:6px 0; color:var(--notes-accent,#e95520); font:inherit; font-size:12px; cursor:pointer; }
.comment-composer button:disabled { color:#babdc3; cursor:default; }
.comment-composer button:focus-visible { outline:2px solid var(--notes-accent,#e95520); outline-offset:3px; }
.comment-composer__reply { display:flex; align-items:center; justify-content:space-between; color:#969ba4; font-size:12px; margin-bottom:5px; }
.comment-composer__status { display:flex; justify-content:space-between; gap:12px; color:#a0a4ab; font-size:11px; margin:5px 0; }
.comment-composer__status [role=alert] { color:#c76445; }
.comment-composer__status span:last-child { margin-left:auto; }
</style>
