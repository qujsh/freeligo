<script setup lang="ts">
import { publicAssetUrl } from "../../../shared/lib/publicAssetUrl";
import { computed, ref, watch } from "vue";
import ShareActions from "./ShareActions.vue";
import type { ShareEngagement } from "../../../services/publicShares";
import type { Note } from "../noteModels";
const props = defineProps<{
  note: Note;
  engagement?: ShareEngagement;
  busy?: boolean;
  engagementFailed?: boolean;
}>();
const imageFailed = ref(false),
  avatarFailed = ref(false),
  imageRatio = ref(1);
const hasImage = computed(
  () => !!(props.note.image || props.note.imageUrl) && !imageFailed.value,
);
const palette = computed(
  () => [...props.note.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3,
);
const shortText = computed(
  () =>
    props.note.titleIsExcerpt &&
    (props.note.summary || props.note.content).length < 45,
);
watch(
  () => [props.note.id, props.note.imageUrl, props.note.avatarUrl],
  () => {
    imageFailed.value = false;
    avatarFailed.value = false;
    imageRatio.value = 1;
  },
);
/** 限制过长图的封面占高，详情保留完整图片。 */
function loaded(event: Event) {
  const image = event.target as HTMLImageElement;
  imageRatio.value = Math.min(
    1.5,
    Math.max(0.75, image.naturalWidth / image.naturalHeight),
  );
}
defineEmits<{ open: [note: Note]; like: []; retry: [] }>();
</script>
<template>
  <article class="note-card" @click="$emit('open', note)">
    <button
      class="note-card__open"
      :aria-label="note.title"
      @click.stop="$emit('open', note)"
    >
      <span
        v-if="hasImage"
        class="note-card__visual"
        :style="{ aspectRatio: imageRatio }"
      >
        <img
          class="note-card__photo"
          :src="
            note.imageUrl || publicAssetUrl(`/images/notes/${note.image}.webp`)
          "
          :alt="note.title"
          loading="lazy"
          @load="loaded"
          @error="imageFailed = true"
        />
      </span>
      <span
        v-else
        class="note-card__cover"
        :class="[
          `note-card__cover--${palette}`,
          { 'note-card__cover--short': shortText },
        ]"
      >
        <strong v-if="!note.titleIsExcerpt" class="note-card__cover-title">{{
          note.title
        }}</strong>
        <span class="note-card__cover-text">{{
          note.summary || note.content || note.title
        }}</span>
      </span>
      <strong v-if="hasImage" class="note-card__title">{{ note.title }}</strong>
    </button>
    <div class="note-card__body">
      <span class="note-card__author">
        <img
          v-if="(note.avatar || note.avatarUrl) && !avatarFailed"
          :src="
            note.avatarUrl ||
            publicAssetUrl(`/images/notes/avatar-${note.avatar}.webp`)
          "
          alt=""
          @error="avatarFailed = true"
        />
        <span v-else-if="note.author" class="note-card__initial">{{
          note.author.slice(0, 1)
        }}</span>
        <span class="note-card__name">{{ note.author }}</span
        ><span v-if="!note.remote" class="note-card__date">{{ note.date }}</span>
      </span>
      <ShareActions
        v-if="note.remote"
        compact
        :state="engagement"
        :busy="busy"
        :failed="engagementFailed"
        @like="$emit('like')"
        @retry="$emit('retry')"
      />
    </div>
  </article>
</template>
<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  color: var(--notes-text);
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}
.note-card__open {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.note-card__open:focus {
  outline: none;
}
/* 仅键盘聚焦正文入口时强调整卡，鼠标点击和点赞不触发整卡红框。 */
.note-card:has(.note-card__open:focus-visible) {
  outline: 2px solid #f24b13;
  outline-offset: 3px;
}
.note-card__visual {
  display: block;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #f4f3ef;
}
.note-card__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
@media (hover: hover) and (pointer: fine) {
  .note-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 24px rgb(45 35 25 / 10%);
    z-index: 1;
  }
}
.note-card:active {
  transform: translateY(-1px) scale(0.99);
}
.note-card__cover {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  aspect-ratio: 0.86;
  padding: 22px;
  border-radius: 12px;
  background: #f7f0e4;
  color: #39342d;
  gap: 14px;
  overflow: hidden;
}
.note-card__cover--1 {
  background: #edf1e9;
  color: #344337;
}
.note-card__cover--2 {
  background: #f9ece5;
  color: #573e34;
}
.note-card__cover--short {
  aspect-ratio: 1.12;
}
.note-card__cover--short .note-card__cover-text {
  -webkit-line-clamp: 4;
}
.note-card__cover-title {
  font: 600 22px/1.45 var(--notes-serif);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.note-card__cover-text {
  font: 19px/1.8 var(--notes-serif);
  white-space: pre-line;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-card__cover:has(.note-card__cover-title) .note-card__cover-text {
  font-size: 15px;
  line-height: 1.7;
  -webkit-line-clamp: 4;
}
.note-card__body {
  display: flex;
  align-items: center;
  padding: 10px 5px 5px;
  gap: 10px;
  min-width: 0;
}
.note-card__title {
  padding: 10px 5px 0;
  color: #242424;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.note-card__author {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #777b80;
  font: 12px/24px sans-serif;
  min-width: 0;
}
.note-card__author img,
.note-card__initial {
  width: 23px;
  height: 23px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.note-card__initial {
  display: grid;
  place-items: center;
  background: #f5e5db;
  color: #8a4b2d;
}
.note-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-card__date {
  white-space: nowrap;
  color: #96999e;
  font-size: 11px;
}
@media (max-width: 650px) {
  .note-card__cover {
    padding: 18px 15px;
    gap: 12px;
  }
  .note-card__cover-title {
    font-size: 19px;
    -webkit-line-clamp: 3;
  }
  .note-card__cover-text {
    font-size: 16px;
    line-height: 1.7;
    -webkit-line-clamp: 5;
  }
  .note-card__cover:has(.note-card__cover-title) .note-card__cover-text {
    font-size: 13px;
    -webkit-line-clamp: 3;
  }
  .note-card__cover--short .note-card__cover-text {
    -webkit-line-clamp: 3;
  }
  .note-card__title {
    padding: 10px 5px 0;
    font-size: 14px;
  }
  .note-card__author {
    font-size: 11px;
    gap: 4px;
  }
  .note-card__author img,
  .note-card__initial {
    width: 20px;
    height: 20px;
  }
  .note-card__date {
    font-size: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .note-card {
    transition: none;
  }
  .note-card:hover,
  .note-card:active {
    transform: none;
  }
}
</style>
