<script setup lang="ts">
import type { Note } from "../noteModels";
defineProps<{ note: Note; compact?: boolean }>();
defineEmits<{ open: [note: Note] }>();
</script>
<template>
  <button
    class="note-card"
    :class="{ 'note-card--text': !note.image, 'note-card--compact': compact }"
    @click="$emit('open', note)"
  >
    <img
      v-if="note.image"
      class="note-card__photo"
      :src="`/images/notes/${note.image}.webp`"
      :alt="note.title"
      :loading="compact ? 'lazy' : 'eager'"
    />
    <span class="note-card__body">
      <strong class="note-card__title">{{ note.title }}</strong>
      <span v-if="!compact" class="note-card__summary">{{
        note.image ? note.summary : note.content
      }}</span>
      <span class="note-card__tags"
        ><span v-for="tag in note.tags" :key="tag">#{{ tag }}</span></span
      >
      <span class="note-card__author"
        ><img
          v-if="note.avatar"
          :src="`/images/notes/avatar-${note.avatar}.webp`"
          alt=""
        /><span v-else class="note-card__initial">{{
          note.author.slice(0, 1)
        }}</span
        >{{ note.author
        }}<span class="note-card__date">· {{ note.date }}</span></span
      >
    </span>
  </button>
</template>
<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--notes-border);
  border-radius: 12px;
  background: #fff;
  text-align: left;
  transition:
    transform 0.18s,
    border-color 0.18s;
  min-width: 0;
  color: var(--notes-text);
}
.note-card:hover {
  transform: translateY(-3px);
  border-color: #e4bba8;
}
.note-card__photo {
  width: 100%;
  aspect-ratio: 1.9;
  object-fit: cover;
  border-radius: 11px;
  display: block;
}
.note-card__body {
  display: flex;
  flex-direction: column;
  padding: 9px 14px 10px;
  flex: 1;
  min-width: 0;
}
.note-card__title {
  font-size: 18px;
  line-height: 1.4;
  white-space: pre-line;
  color: #131313;
  letter-spacing: 0.1px;
}
.note-card__summary {
  font-size: 14px;
  line-height: 1.45;
  margin-top: 3px;
  color: #484b55;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-card__tags {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin: 7px 0 8px;
}
.note-card__tags > span {
  font-size: 12px;
  line-height: 22px;
  padding: 0 10px;
  background: #f2f2f2;
  border-radius: 20px;
  white-space: nowrap;
}
.note-card__author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-top: auto;
  line-height: 26px;
}
.note-card__author img,
.note-card__initial {
  width: 25px;
  height: 25px;
  object-fit: cover;
  border-radius: 50%;
}
.note-card__initial {
  display: grid;
  place-items: center;
  background: #f5e5db;
  color: #8a4b2d;
}
.note-card__date {
  color: #525866;
}
.note-card--text {
  background: #fbf3e6;
  border-color: #ecd4b6;
}
.note-card--text .note-card__body {
  padding: 12px 18px;
}
.note-card--text .note-card__title {
  font-family: "Songti SC", "SimSun", serif;
  font-size: 23px;
  line-height: 1.28;
}
.note-card--text .note-card__summary {
  display: block;
  color: #29241e;
  font-family: "Songti SC", "SimSun", serif;
  font-size: 16px;
  line-height: 1.35;
  margin-top: 12px;
  white-space: pre-line;
}
.note-card--text .note-card__tags {
  margin-top: 14px;
}
.note-card--compact .note-card__photo {
  aspect-ratio: 2.65;
}
.note-card--compact .note-card__title {
  font-size: 17px;
}
.note-card--compact .note-card__body {
  padding-top: 7px;
}
@media (max-width: 650px) {
  .note-card__title,
  .note-card--compact .note-card__title {
    font-size: 15px;
  }
  .note-card__body {
    padding: 9px;
  }
  .note-card__summary {
    font-size: 12px;
  }
  .note-card--text .note-card__title {
    font-size: 19px;
  }
  .note-card--text .note-card__summary {
    display: -webkit-box;
    -webkit-line-clamp: 7;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 14px;
  }
  .note-card__author {
    font-size: 12px;
    gap: 5px;
  }
  .note-card__tags {
    gap: 4px;
  }
  .note-card__tags > span {
    padding: 0 7px;
    font-size: 11px;
  }
  .note-card--text .note-card__body {
    padding: 12px;
  }
  .note-card--compact .note-card__photo {
    aspect-ratio: 1.9;
  }
}
</style>
