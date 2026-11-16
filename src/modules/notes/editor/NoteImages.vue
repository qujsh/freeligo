<script setup lang="ts">
import { noteImageUrl } from "../../../services/noteEditor";
const props = defineProps<{
  modelValue: string[];
  disabled: boolean;
  uploading: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string[]];
  upload: [files: File[]];
}>();
function move(index: number, direction: number) {
  const list = [...props.modelValue];
  [list[index], list[index + direction]] = [
    list[index + direction]!,
    list[index]!,
  ];
  emit("update:modelValue", list);
}
function select(event: Event) {
  const input = event.target as HTMLInputElement;
  emit("upload", [...(input.files || [])]);
  input.value = "";
}
</script>
<template>
  <section class="composer-images" aria-label="笔记配图">
    <div class="composer-images__heading">
      <strong
        >配图 <small>{{ modelValue.length }}/9</small></strong
      ><label class="composer-images__upload"
        >{{ uploading ? "正在上传…" : "添加图片"
        }}<input
          aria-label="添加笔记图片"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          :disabled="disabled || modelValue.length >= 9"
          @change="select"
      /></label>
    </div>
    <p>支持JPG、PNG、WebP，单张不超过10MB。第一张用作封面。</p>
    <div class="composer-images__list">
      <figure v-for="(no, index) in modelValue" :key="no">
        <img :src="noteImageUrl(no)" :alt="`笔记配图${index + 1}`" />
        <figcaption>
          <button
            type="button"
            :disabled="disabled || index === 0"
            :aria-label="`前移图片${index + 1}`"
            @click="move(index, -1)"
          >
            ←</button
          ><button
            type="button"
            :disabled="disabled || index === modelValue.length - 1"
            :aria-label="`后移图片${index + 1}`"
            @click="move(index, 1)"
          >
            →</button
          ><button
            type="button"
            :disabled="disabled"
            :aria-label="`移除图片${index + 1}`"
            @click="
              emit(
                'update:modelValue',
                modelValue.filter((item) => item !== no),
              )
            "
          >
            移除
          </button>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.composer-images__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.composer-images__heading strong {
  font-size: 14px;
}
.composer-images small {
  color: #95999f;
  font-weight: 400;
}
.composer-images__upload {
  margin: 0;
  border: 1px solid #e5e2de;
  border-radius: 8px;
  padding: 6px 10px;
  color: #d94e20;
  cursor: pointer;
}
.composer-images__upload {
  position: relative;
  overflow: hidden;
}
.composer-images__upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  cursor: pointer;
}
.composer-images__upload:focus-within {
  outline: 2px solid #aaa;
  outline-offset: 3px;
}
.composer-images p {
  font-size: 12px;
  color: #92969c;
  margin: 8px 0;
}
.composer-images__list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.composer-images figure {
  margin: 0;
  width: 120px;
  border: 1px solid #eeece9;
  border-radius: 9px;
  overflow: hidden;
}
.composer-images img {
  display: block;
  width: 120px;
  height: 100px;
  object-fit: cover;
}
.composer-images figcaption {
  display: flex;
  justify-content: space-between;
  padding: 4px;
}
.composer-images button {
  font-size: 11px;
  border: 0;
  background: transparent;
  color: #6a6f76;
  padding: 4px;
}
.composer-images button:disabled {
  opacity: 0.35;
}
</style>
