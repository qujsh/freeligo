<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Search,
  LayoutGrid,
  Camera,
  Wrench,
  CodeXml,
  ArrowLeft,
  PenLine,
} from "lucide-vue-next";
import { ElMessage } from "element-plus";
import NotesHeader from "../notes/components/NotesHeader.vue";
import NoteCard from "../notes/components/NoteCard.vue";
import { sampleNotes } from "../notes/sampleNotes";
import { useLocalNotes } from "../notes/useLocalNotes";
import type { Note } from "../notes/noteModels";
const route = useRoute(),
  router = useRouter();
const { notes, draft, storageError, save } = useLocalNotes();
const search = ref(String(route.query.q ?? ""));
watch(
  () => route.query.q,
  (value) => {
    search.value = String(value ?? "");
  },
);
const categories = [
  { id: "", label: "全部", icon: LayoutGrid },
  { id: "photography", label: "摄影影像", icon: Camera },
  { id: "life", label: "生活经验", icon: Wrench },
  { id: "tools", label: "工具开发", icon: CodeXml },
];
const isMine = computed(() => route.query.view === "mine");
const isGrowth = computed(() => route.query.view === "growth");
const allNotes = computed(() => [...notes.value, ...sampleNotes]);
const visible = computed(() => {
  const keyword = String(route.query.q ?? "")
    .trim()
    .toLowerCase();
  return allNotes.value.filter(
    (note) =>
      (!isMine.value || note.own) &&
      (!route.query.category || note.category === route.query.category) &&
      (!keyword ||
        [note.title, note.summary, ...note.tags, note.author]
          .join(" ")
          .toLowerCase()
          .includes(keyword)),
  );
});
const selected = computed(() =>
  allNotes.value.find((note) => note.id === route.query.note),
);
const composing = computed(() => route.query.compose === "1");
function query(values: Record<string, string | undefined>) {
  void router.push({ path: "/", query: { ...route.query, ...values } });
}
function open(note: Note) {
  query({ note: note.id });
}
function submitSearch() {
  query({ q: search.value.trim() || undefined });
}
function saveNote() {
  if (!draft.value.title.trim() || !draft.value.content.trim()) {
    ElMessage.warning("先写一个标题，再记录一点内容吧");
    return;
  }
  if (save()) {
    query({
      compose: undefined,
      view: "mine",
      q: undefined,
      category: undefined,
    });
    ElMessage.success("已保存到本机笔记");
  } else ElMessage.error("本机存储不可用，请保留并复制你的内容");
}
</script>
<template>
  <div class="notes-app">
    <NotesHeader
      :growth="isGrowth"
      @mine="query({ view: 'mine', q: undefined, category: undefined })"
      @compose="query({ compose: '1' })"
    />
    <main class="notes-main">
      <template v-if="!isGrowth">
        <section
          v-if="!isMine"
          class="notes-hero"
          aria-labelledby="notes-headline"
        >
          <div class="notes-hero__copy">
            <h1 id="notes-headline">做着做着，<br />就有了些想法。</h1>
            <p>有时是一张照片，有时是随手写下的几句话。</p>
            <form
              class="notes-search"
              role="search"
              @submit.prevent="submitSearch"
            >
              <Search :size="21" /><input
                v-model="search"
                aria-label="搜索笔记、话题"
                placeholder="搜索笔记、话题"
                type="search"
              /><button class="notes-primary" type="submit">搜索</button>
            </form>
          </div>
          <img
            class="notes-hero__image"
            src="/images/reference/hero-stories.webp"
            alt="用镜头记录真实的美好，修好一把椅子，做成一件解决难题的小工具"
            fetchpriority="high"
          />
        </section>
        <div v-else class="notes-personal">
          <button class="notes-back" @click="router.push('/')">
            <ArrowLeft :size="18" />返回发现
          </button>
          <h1>我的笔记</h1>
          <p>
            把生活里的想法，一点点留下来。这里保存着你在这台设备上写下的笔记。
          </p>
        </div>
        <section aria-labelledby="notes-section-title">
          <div class="notes-toolbar">
            <h2 id="notes-section-title">
              {{ isMine ? "本机笔记" : "发现笔记" }}
            </h2>
            <div class="notes-categories" aria-label="笔记分类">
              <button
                v-for="category in categories"
                :key="category.id"
                :class="{
                  active: String(route.query.category ?? '') === category.id,
                }"
                :aria-pressed="
                  String(route.query.category ?? '') === category.id
                "
                @click="query({ category: category.id || undefined })"
              >
                <component :is="category.icon" :size="23" />{{ category.label }}
              </button>
            </div>
          </div>
          <div v-if="route.query.q" class="notes-search-result" role="status">
            “{{ route.query.q }}”的搜索结果 · {{ visible.length }} 篇<button
              @click="query({ q: undefined })"
            >
              清除搜索
            </button>
          </div>
          <div v-if="visible.length" class="notes-grid">
            <NoteCard
              v-for="(note, index) in visible"
              :key="note.id"
              :note="note"
              :compact="index >= 4 && !!note.image"
              @open="open"
            />
          </div>
          <div v-else class="notes-empty">
            <PenLine :size="32" />
            <h3>{{ isMine ? "还没有写下笔记" : "还没有找到相关笔记" }}</h3>
            <p>
              {{
                isMine
                  ? "一张照片、一点经验，都值得记录。"
                  : "换个关键词，或者看看其他分类。"
              }}
            </p>
            <button
              class="notes-primary"
              @click="
                isMine
                  ? query({ compose: '1' })
                  : query({ q: undefined, category: undefined })
              "
            >
              {{ isMine ? "写第一篇笔记" : "查看全部笔记" }}
            </button>
          </div>
        </section>
      </template>
      <section v-else class="notes-growth">
        <button class="notes-back" @click="router.push('/')">
          <ArrowLeft :size="18" />返回发现
        </button>
        <h1>每一次动手，都有一点成长。</h1>
        <p>从一个想法，到一件做成的事。回看过程，也看见自己的变化。</p>
        <div class="notes-growth__feature">
          <img src="/images/notes/repair.webp" alt="修复木椅的过程" />
          <div>
            <span>生活经验 · 手工修复</span>
            <h2>修好一把椅子，<br />也是在修复生活。</h2>
            <p>
              从检查连接点到重新加固，把一次动手的过程，变成可以分享的经验。
            </p>
            <button class="notes-primary" @click="open(sampleNotes[1]!)">
              阅读这篇笔记
            </button>
          </div>
        </div>
        <p class="notes-growth__hint">
          这里展示参考笔记故事，个人成长数据尚未接入。
        </p>
      </section>
      <footer class="notes-footer">
        生活里的小发现，值得被看见。<span
          >参考内容为演示笔记 · 新笔记仅保存在本机</span
        >
      </footer>
    </main>
    <el-dialog
      :model-value="!!selected"
      width="min(740px, 94vw)"
      title="笔记"
      @close="query({ note: undefined })"
      >
<article v-if="selected" class="notes-reader">
        <img
          v-if="selected.image"
          :src="`/images/notes/${selected.image}.webp`"
          :alt="selected.title"
        />
        <h1>{{ selected.title }}</h1>
        <p class="notes-reader__meta">
          {{ selected.author }} · {{ selected.date }} ·
          {{ selected.own ? "本机笔记" : "演示笔记" }}
        </p>
        <div class="notes-reader__content">{{ selected.content }}</div>
        <div class="notes-reader__tags">
          <span v-for="tag in selected.tags" :key="tag">#{{ tag }}</span>
        </div>
      </article>
</el-dialog
    >
    <el-dialog
      :model-value="composing"
      width="min(700px, 94vw)"
      title="写下今天的想法"
      @close="query({ compose: undefined })"
      >
<form class="notes-editor" @submit.prevent="saveNote">
        <p>不必是完整的故事，一点发现也很好。草稿会自动保存在本机。</p>
        <label for="note-title">标题</label
        ><el-input
          id="note-title"
          v-model="draft.title"
          placeholder="给这篇笔记起个名字"
          maxlength="60"
          show-word-limit
        /><label for="note-category">分类</label
        ><el-select
          id="note-category"
          v-model="draft.category"
          aria-label="笔记分类"
          >
<el-option
            v-for="category in categories.slice(1)"
            :key="category.id"
            :value="category.id"
            :label="category.label" />
</el-select
        ><label for="note-content">正文</label
        ><el-input
          id="note-content"
          v-model="draft.content"
          type="textarea"
          :rows="9"
          maxlength="10000"
          show-word-limit
          placeholder="今天做了什么，又有了哪些想法？"
        />
        <p v-if="storageError" role="alert">
          本机存储读取或保存失败，请复制保留你的内容。
        </p>
        <div class="notes-editor__actions">
          <span>仅保存到本机，不会公开发布</span
          ><button class="notes-primary" type="submit">保存笔记</button>
        </div>
      </form>
</el-dialog
    >
  </div>
</template>
<style src="../notes/notesPage.css"></style>
