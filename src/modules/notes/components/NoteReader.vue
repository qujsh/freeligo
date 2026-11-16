<script setup lang="ts">
import { computed, ref, watch } from "vue";
import NoteDocument from "./NoteDocument.vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { useNoteGallery } from "../useNoteGallery";
import type { Note } from "../noteModels";
const props = defineProps<{ note: Note; images: string[] }>();
defineEmits<{ reference: [recordNo: string] }>();
const reading = ref<HTMLElement | null>(null),
  root = ref<HTMLElement | null>(null);
const { track, active, go, scrolled, pointerDown, pointerMove, finish, reset } =
  useNoteGallery(() => props.images.length);
const avatarFailed = ref(false);
const label = computed(() =>
  props.note.own ? (props.note.remote ? props.note.statusLabel || "本人笔记" : "本机笔记") : props.note.remote ? "公开笔记" : "演示笔记",
);
watch(
  () => props.note.id,
  () => {
    reset();
    avatarFailed.value = false;
    if (reading.value) reading.value.scrollTop = 0;
    if (root.value) root.value.scrollTop = 0;
  },
);
</script>
<template>
  <article
    ref="root"
    class="note-detail"
    :class="{ 'note-detail--media': images.length }"
  >
    <section
      v-if="images.length"
      class="note-detail__gallery"
      aria-label="笔记图片"
    >
      <div
        ref="track"
        class="note-detail__track"
        tabindex="0"
        @scroll="scrolled"
        @pointerdown="pointerDown"
        @pointermove="pointerMove"
        @pointerup="finish($event)"
        @pointercancel="finish($event, true)"
        @lostpointercapture="finish($event, true)"
        @keydown.left.prevent="go(active - 1)"
        @keydown.right.prevent="go(active + 1)"
      >
        <img
          v-for="(url, index) in images"
          :key="`${note.id}-${index}`"
          :src="url"
          :alt="`笔记配图 ${index + 1}`"
          :draggable="false"
        />
      </div>
      <template v-if="images.length > 1">
        <button
          class="note-detail__previous"
          aria-label="上一张图片"
          :disabled="active === 0"
          @click="go(active - 1)"
        >
          <span class="note-detail__arrow-disc"
            ><ChevronLeft :size="18"
          /></span>
        </button>
        <button
          class="note-detail__next"
          aria-label="下一张图片"
          :disabled="active === images.length - 1"
          @click="go(active + 1)"
        >
          <span class="note-detail__arrow-disc"
            ><ChevronRight :size="18"
          /></span>
        </button>
        <span class="note-detail__counter" aria-live="polite"
          >{{ active + 1 }} / {{ images.length }}</span
        >
        <div class="note-detail__dots" role="group" aria-label="选择图片">
          <button
            v-for="(_, index) in images"
            :key="`${note.id}-dot-${index}`"
            type="button"
            :aria-label="`查看第 ${index + 1} 张图片`"
            :aria-current="active === index ? 'true' : undefined"
            @click="go(index)"
          >
            <span />
          </button>
        </div>
      </template>
    </section>
    <div class="note-detail__panel">
      <div ref="reading" class="note-detail__reading">
        <div class="note-detail__author">
          <img
            v-if="note.avatarUrl && !avatarFailed"
            :src="note.avatarUrl"
            alt=""
            @error="avatarFailed = true"
          />
          <span v-else-if="note.author" class="note-detail__initial">{{
            note.author.slice(0, 1)
          }}</span>
          <div>
            <strong>{{ note.author }}</strong
            ><span>{{ note.date }} · {{ label }}</span>
          </div>
        </div>
        <h1 v-if="!note.titleIsExcerpt">{{ note.title }}</h1>
        <NoteDocument v-if="note.document" :document="note.document" />
        <div v-else class="notes-reader__content">{{ note.content }}</div>
        <div v-if="note.references?.length" class="notes-reader__references">
          <h3>关联笔记</h3>
          <button
            v-for="reference in note.references"
            :key="reference.recordNo"
            @click="$emit('reference', reference.recordNo)"
          >
            {{ reference.title || "查看关联笔记" }}
          </button>
        </div>
        <div v-if="note.tags.length" class="notes-reader__tags">
          <span v-for="tag in note.tags" :key="tag">#{{ tag }}</span>
        </div>
      </div>
      <div v-if="$slots.actions" class="note-detail__actions">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>
<style scoped>
.note-detail {
  --note-detail-font:
    -apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI",
    Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji",
    "Segoe UI Symbol";
  font-family: var(--note-detail-font);
  font-size: 14px;
  line-height: 1.428571;
  color: #172033;
  max-height: 88dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.note-detail__panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  max-height: 88dvh;
}
.note-detail__actions {
  flex-shrink: 0;
  padding: 12px 28px;
  border-top: 1px solid #f0f0f0;
  background: white;
}
.note-detail__reading {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px 40px;
  min-width: 0;
}
.note-detail .notes-reader__content {
  font: 17px/1.8 var(--note-detail-font);
  color: inherit;
}
.note-detail__author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}
.note-detail__author img,
.note-detail__initial {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.note-detail__initial {
  display: grid;
  place-items: center;
  background: #f7e8dc;
  color: #8a4b2d;
}
.note-detail__author strong {
  display: block;
  font-size: 14px;
  color: inherit;
  font-weight: 500;
}
.note-detail__author div > span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #778195;
}
.note-detail h1 {
  margin: 0 0 20px;
  font-size: 23px;
  line-height: 1.55;
  font-weight: 600;
  color: inherit;
  overflow-wrap: anywhere;
}
.note-detail--media {
  display: grid;
  grid-template-columns: 1.65fr 1fr;
  height: min(760px, 88dvh);
  overflow: hidden;
}
.note-detail--media .note-detail__reading {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 28px;
}
.note-detail__gallery {
  position: relative;
  background: var(--note-gallery-background, #f0f1f3);
  min-width: 0;
  min-height: 0;
}
.note-detail__track {
  display: flex;
  overflow-x: auto;
  height: 100%;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  cursor: grab;
  overscroll-behavior-x: contain;
}
.note-detail__track[data-dragging] {
  cursor: grabbing;
  scroll-snap-type: none;
  user-select: none;
}
.note-detail__track::-webkit-scrollbar {
  display: none;
}
.note-detail__track > img {
  display: block;
  flex: 0 0 100%;
  width: 100%;
  min-width: 0;
  height: 100%;
  object-fit: contain;
  scroll-snap-align: start;
  user-select: none;
}
.note-detail__previous,
.note-detail__next {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  z-index: 3;
  width: 52px;
  height: 52px;
  padding: 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 300ms,
    transform 300ms;
}
.note-detail__previous {
  left: 0;
  transform: translate(-12px, -50%);
}
.note-detail__next {
  right: 0;
  transform: translate(12px, -50%);
}
.note-detail__arrow-disc {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(64, 64, 64, 0.25);
  backdrop-filter: blur(10px);
  color: white;
}
.note-detail__gallery:is(:hover, :focus-within)
  :is(.note-detail__previous, .note-detail__next) {
  opacity: 1;
  transform: translate(0, -50%);
}
.note-detail__gallery button:disabled {
  visibility: hidden;
}
.note-detail__counter {
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms;
  position: absolute;
  top: 16px;
  right: 16px;
  border-radius: 12px;
  background: rgba(64, 64, 64, 0.25);
  backdrop-filter: saturate(150%) blur(10px);
  color: white;
  font-size: 12px;
  line-height: 16px;
  padding: 4px 8px;
}
.note-detail__gallery:is(:hover, :focus-within) .note-detail__counter {
  opacity: 1;
}
.note-detail__dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  max-width: calc(100% - 32px);
}
.note-detail__dots button {
  display: grid;
  place-items: center;
  width: 14px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.note-detail__dots button span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffffb3;
  box-shadow: 0 0 5px #0004;
  transition:
    background 180ms,
    transform 180ms;
}
.note-detail__dots button[aria-current] span {
  background: white;
  transform: scale(1.3);
}
@media (hover: none) {
  .note-detail__gallery :is(.note-detail__previous, .note-detail__next) {
    opacity: 1;
    transform: translate(0, -50%);
  }
  .note-detail__counter {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .note-detail__gallery :is(.note-detail__previous, .note-detail__next),
  .note-detail__dots button span,
  .note-detail__counter {
    transition: none;
  }
}
@media (min-width: 701px) {
  .note-detail:not(.note-detail--media) {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    height: min(760px, 88dvh);
    overflow: hidden;
  }
}
@media (max-width: 700px) {
  .note-detail .notes-reader__content {
    font-size: 16px;
  }
  .note-detail__panel {
    display: block;
    max-height: none;
  }
  .note-detail__reading {
    overflow: visible;
  }
  .note-detail__actions {
    position: sticky;
    bottom: 0;
    padding: 10px 20px;
  }
  .note-detail--media {
    display: block;
    height: auto;
    max-height: 88dvh;
    overflow-y: auto;
  }
  .note-detail--media .note-detail__reading {
    overflow: visible;
    padding: 22px 20px 30px;
  }
  .note-detail__gallery {
    height: 60dvh;
  }
  .note-detail__reading {
    padding: 24px 22px 32px;
  }
  .note-detail h1 {
    font-size: 21px;
  }
  .note-detail__author {
    margin-bottom: 22px;
  }
}
</style>
