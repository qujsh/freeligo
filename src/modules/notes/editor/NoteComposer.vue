<script setup lang="ts">
import { computed, watch } from "vue";
import NoteRichEditor from "./NoteRichEditor.vue";
import NoteImages from "./NoteImages.vue";
import NoteReferences from "./NoteReferences.vue";
import { useNoteComposer } from "./useNoteComposer";
import type { Note } from "../../../domain/notes";
import type { NoteSaved } from "../../../services/noteEditor";
const props = defineProps<{
  recordNo?: string;
  resume?: string;
  seed?: Note;
}>();
const emit = defineEmits<{
  saved: [value: NoteSaved];
  close: [];
  busy: [value: boolean];
}>();
const form = useNoteComposer(
  props.recordNo,
  props.resume,
  props.seed,
  (value) => emit("saved", value),
  () => emit("close"),
);
const {
  record,
  ready,
  disabled,
  error,
  storageError,
  textLength,
  uncertain,
  uploading,
  busy,
} = form;
watch(busy, (value) => emit("busy", value), { immediate: true });
const date = computed({
  get: () => {
    const value = new Date(record.value.occurredAt);
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  },
  set: (value) => {
    if (value && !Number.isNaN(new Date(value).getTime()))
      record.value.occurredAt = new Date(value).toISOString();
  },
});
</script>
<template>
  <div class="note-composer">
    <p class="note-composer__intro">
      记录一个想法，或笔记一段经历。私密保存仅自己可见，申请公开需要审核。
    </p>
    <div
      v-if="form.source.isError.value && !ready"
      class="note-composer__error"
      role="alert"
    >
      {{ form.source.error.value?.message
      }}<button type="button" @click="form.source.refetch()">重新读取</button>
    </div>
    <el-skeleton v-else-if="!ready" :rows="8" animated />
    <form v-else @submit.prevent="form.submit('SAVE', 'PRIVATE')">
      <label class="note-composer__label" for="composer-title"
        >标题 <small>可选</small></label
      >
      <el-input
        id="composer-title"
        v-model="record.title"
        placeholder="给这篇笔记起个名字"
        :maxlength="80"
        show-word-limit
        :disabled="disabled"
      />
      <div class="note-composer__section-heading">
        <label class="note-composer__label">正文</label
        ><span>{{ textLength }}/20000</span>
      </div>
      <NoteRichEditor v-model="record.document" :disabled="disabled" />
      <p class="note-composer__hint">
        在正文中输入 #标签，可随笔记保存；最多10个标签。
      </p>
      <NoteImages
        v-model="record.mediaNos"
        :disabled="disabled"
        :uploading="uploading"
        @upload="form.upload"
      />
      <NoteReferences
        v-model="record.referenceNos"
        :record-no="recordNo"
        :disabled="disabled"
      />
      <label class="note-composer__time"
        >记录时间<input
          v-model="date"
          aria-label="记录时间"
          type="datetime-local"
          :disabled="disabled"
      /></label>
      <p v-if="storageError" role="alert" class="note-composer__error">
        浏览器备份不可用，请复制保留正文；云端保存仍需确认成功。
      </p>
      <p v-if="error" role="alert" class="note-composer__error">{{ error }}</p>
      <button
        v-if="form.conflict.value && recordNo"
        type="button"
        class="note-composer__secondary"
        :disabled="busy"
        @click="form.reloadCloud"
      >
        保留本机副本并载入云端
      </button>
      <div v-if="uncertain" class="note-composer__uncertain">
        <p>
          上次提交结果尚未确认，已保留原始内容和请求编号。请先重试确认，避免重复创建笔记。
        </p>
        <button type="button" :disabled="busy" @click="form.retry">
          按原内容重试
        </button>
      </div>
      <footer class="note-composer__footer">
        <span>{{
          busy
            ? "正在保存…"
            : uploading
              ? "图片上传中…"
              : "编辑内容自动备份到本机，关闭后可继续"
        }}</span>
        <div>
          <button
            type="button"
            class="note-composer__secondary"
            :disabled="disabled"
            @click="form.submit('DRAFT', record.visibility)"
          >
            保存云端草稿
          </button>
          <button
            type="submit"
            class="note-composer__secondary"
            :disabled="disabled"
          >
            私密保存
          </button>
          <button
            type="button"
            class="notes-primary"
            :disabled="disabled"
            @click="form.submit('SAVE', 'PUBLIC')"
          >
            申请公开
          </button>
        </div>
      </footer>
    </form>
  </div>
</template>
<style scoped>
.note-composer {
  color: #34373c;
}
.note-composer__intro {
  color: #81868e;
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.7;
}
.note-composer form {
  display: grid;
  gap: 16px;
}
.note-composer__label {
  font-size: 14px;
  color: #535860;
  margin: 0;
  font-weight: 500;
}
.note-composer__label small {
  color: #9a9da3;
  font-weight: 400;
  margin-left: 6px;
}
.note-composer__section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: -8px;
}
.note-composer__section-heading span {
  font-size: 12px;
  color: #95999f;
}
.note-composer__hint {
  font-size: 12px;
  color: #95999f;
  margin: -8px 0 0;
}
.note-composer__time {
  display: flex;
  gap: 15px;
  align-items: center;
  margin: 0;
  font-size: 13px;
  color: #777c85;
}
.note-composer__time input {
  border: 1px solid #e5e2de;
  border-radius: 8px;
  padding: 7px 10px;
  background: #fff;
  color: #535860;
  max-width: 210px;
}
.note-composer__error {
  color: #b74430;
  font-size: 13px;
  margin: 0;
  line-height: 1.6;
}
.note-composer__uncertain {
  padding: 12px;
  background: #fff4e5;
  font-size: 13px;
  border-radius: 8px;
}
.note-composer__uncertain p {
  margin: 0 0 8px;
}
.note-composer__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid #eeece9;
  padding-top: 18px;
}
.note-composer__footer > span {
  font-size: 12px;
  color: #999da4;
}
.note-composer__footer > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.note-composer__secondary {
  border: 1px solid #e5e2de;
  border-radius: 9px;
  background: #fff;
  padding: 9px 13px;
  color: #62676f;
  font-size: 13px;
}
.note-composer button:disabled {
  opacity: 0.5;
  cursor: default;
}
@media (max-width: 600px) {
  .note-composer__footer > div {
    width: 100%;
  }
  .note-composer__footer button {
    flex: 1;
    padding: 8px;
    font-size: 12px;
  }
}
</style>
