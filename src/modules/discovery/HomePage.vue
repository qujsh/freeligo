<script setup lang="ts">
import { publicAssetUrl } from "../../shared/lib/publicAssetUrl";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search, ArrowLeft, PenLine } from "lucide-vue-next";
import { ElMessage } from "element-plus";
import { useSession } from "../account/session";
import { useShareEngagements } from "../notes/useShareEngagements";
import ShareActions from "../notes/components/ShareActions.vue";
import { useAccountProfile } from "../account/useAccountProfile";
import ProfileOverview from "../account/components/ProfileOverview.vue";
import ProfileEditor from "../account/components/ProfileEditor.vue";
import AccountSettings from "../account/components/AccountSettings.vue";
import type { ProfileInput } from "../../services/accountProfile";
import NotesHeader from "../notes/components/NotesHeader.vue";
import NoteCard from "../notes/components/NoteCard.vue";
import NoteReader from "../notes/components/NoteReader.vue";
import { sampleNotes } from "../notes/sampleNotes";
import { useLocalNotes } from "../notes/useLocalNotes";
import { usePublicNotes } from "../notes/usePublicNotes";
import { useNoteMasonry } from "../notes/useNoteMasonry";
import type { Note } from "../notes/noteModels";
const route = useRoute(),
  router = useRouter();
const { notes, draft, storageError, save } = useLocalNotes();
const search = ref(String(route.query.q ?? ""));
const noteGrid = ref<HTMLElement | null>(null);
useNoteMasonry(noteGrid);
watch(
  () => route.query.q,
  (value) => {
    search.value = String(value ?? "");
  },
);
const session = useSession();
const { profile, save: saveProfile, viewer, avatar } = useAccountProfile();
const editingProfile = ref(false);
watch(viewer, () => {
  editingProfile.value = false;
  saveProfile.reset();
});
const isSettings = computed(() => route.query.view === "settings");
const isFavorites = computed(() => route.query.view === "favorites");
const isMine = computed(() => route.query.view === "mine");
const isGrowth = computed(() => route.query.view === "growth");
const isMock = import.meta.env.VITE_DATA_SOURCE === "mock";
const keyword = computed(() => String(route.query.q ?? "").trim());
const localSelected = computed(() =>
  [...notes.value, ...(isMock || isGrowth.value ? sampleNotes : [])].find(
    (note) => note.id === route.query.note,
  ),
);
const remoteId = computed(() =>
  !isMock && !localSelected.value && route.query.note
    ? String(route.query.note)
    : "",
);
const { list, detail, items } = usePublicNotes(
  keyword,
  computed(
    () => !isMock && !isMine.value && !isGrowth.value && !isSettings.value,
  ),
  remoteId,
  isFavorites,
);
const visible = computed(() => {
  if (!isMine.value && !isMock) return items.value;
  return (isMine.value ? notes.value : sampleNotes).filter(
    (note) =>
      !keyword.value ||
      [note.title, note.content]
        .join(" ")
        .toLowerCase()
        .includes(keyword.value.toLowerCase()),
  );
});
const selected = computed(
  () =>
    localSelected.value ??
    (!detail.isError.value && !detail.isFetching.value
      ? detail.data.value
      : undefined),
);
const engagementIds = computed(() =>
  [
    ...new Set([
      ...visible.value.filter((note) => note.remote).map((note) => note.id),
      ...(selected.value?.remote ? [selected.value.id] : []),
    ]),
  ].sort(),
);
const {
  state: engagementState,
  change: changeEngagement,
  busy: engagementBusy,
} = useShareEngagements(engagementIds);
/** 收藏入口恢复真实登录后导航；本机笔记继续保持独立。 */
function showFavorites() {
  session.requireLogin(() =>
    query({ view: "favorites", q: undefined, note: undefined }),
  );
}
/** 编辑真实账号资料，等待完整资料后创建独立表单，避免用空值覆盖尚未读取的字段。 */
function editProfile() {
  session.requireLogin(() => {
    if (!profile.data.value) {
      ElMessage.warning("请先等待资料加载，或重试读取资料");
      return;
    }
    saveProfile.reset();
    editingProfile.value = true;
  });
}
async function submitProfile(value: ProfileInput) {
  const owner = viewer.value;
  try {
    await saveProfile.mutateAsync({ value, viewer: owner });
    if (viewer.value === owner) {
      editingProfile.value = false;
      ElMessage.success("个人资料已更新");
    }
  } catch {
    /* 错误留在表单中，保留用户正在编辑的内容。 */
  }
}
async function signout() {
  try {
    await session.logout();
  } catch {
    ElMessage.error("退出失败，请重试");
  }
}
const readerImages = computed(() => {
  const note = selected.value;
  if (!note) return [];
  if (note.imageUrls?.length) return note.imageUrls;
  if (note.imageUrl) return [note.imageUrl];
  return note.image ? [publicAssetUrl(`/images/notes/${note.image}.webp`)] : [];
});
const reading = computed(() => !!route.query.note);
const feedLoading = computed(
  () =>
    !isMine.value &&
    !isMock &&
    (!isFavorites.value || !!session.user) &&
    list.isPending.value,
);
const feedError = computed(() =>
  !isMine.value && !isMock && !list.isFetchNextPageError.value
    ? list.error.value
    : null,
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
      :personal="isMine || isFavorites || isSettings"
      :avatar="avatar"
      :bio="profile.data.value?.bio || undefined"
      :note-count="notes.length"
      :user-name="session.user?.name"
      :live="!isMock"
      @profile="query({ view: 'mine', q: undefined, note: undefined })"
      @settings="query({ view: 'settings', q: undefined, note: undefined })"
      @favorites="showFavorites"
      @login="session.requireLogin(() => {})"
      @logout="signout"
      @mine="query({ view: 'mine', q: undefined, category: undefined })"
      @compose="query({ compose: '1' })"
    />
    <main
      class="notes-main"
      :class="{ 'notes-main--personal': isMine || isFavorites }"
    >
      <AccountSettings
        v-if="isSettings"
        :profile="profile.data.value"
        :avatar="avatar"
        :loading="profile.isPending.value"
        :error="profile.error.value?.message"
        :live="!isMock"
        @back="query({ view: 'mine' })"
        @edit="editProfile"
        @logout="signout"
        @login="session.requireLogin(() => {})"
        @retry="profile.refetch()"
      />
      <template v-else-if="!isGrowth">
        <section
          v-if="!isMine && !isFavorites"
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
            :src="publicAssetUrl('/images/reference/hero-stories.webp')"
            alt="用镜头记录真实的美好，修好一把椅子，做成一件解决难题的小工具"
            fetchpriority="high"
          />
        </section>
        <ProfileOverview
          v-else
          :name="session.user?.name"
          :bio="profile.data.value?.bio || undefined"
          :avatar="avatar"
          :favorites="isFavorites"
          :live="!isMock"
          :loading="!!session.user && profile.isPending.value && !isMock"
          :error="profile.error.value?.message"
          @edit="editProfile"
          @settings="query({ view: 'settings', q: undefined })"
          @login="session.requireLogin(() => {})"
          @retry="profile.refetch()"
          @mine="query({ view: 'mine', q: undefined })"
          @favorites="showFavorites"
        />
        <div v-if="isMine" class="member-content-bar">
          <span class="member-content-bar__filter">全部<span>仅本机</span></span
          ><span>共 {{ notes.length }} 篇笔记</span>
        </div>
        <form
          v-if="isFavorites && session.user"
          class="notes-search notes-favorites-search"
          role="search"
          @submit.prevent="submitSearch"
        >
          <Search :size="21" /><input
            v-model="search"
            aria-label="搜索收藏笔记"
            placeholder="搜索收藏笔记"
            type="search"
          /><button class="notes-primary" type="submit">搜索</button>
        </form>
        <section aria-labelledby="notes-section-title">
          <div v-if="!isMine && !isFavorites" class="notes-toolbar">
            <h2 id="notes-section-title">
              {{ isMine ? "本机笔记" : isFavorites ? "收藏笔记" : "发现笔记" }}
            </h2>
          </div>
          <div v-if="route.query.q" class="notes-search-result" role="status">
            “{{ route.query.q }}”的搜索结果 · 已加载
            {{ visible.length }} 篇<button @click="query({ q: undefined })">
              清除搜索
            </button>
          </div>
          <div v-if="isFavorites && !session.user" class="notes-empty">
            <h3>登录后查看我的收藏</h3>
            <button class="notes-primary" @click="showFavorites">
              登录并继续
            </button>
          </div>
          <el-skeleton
            v-else-if="feedLoading"
            :rows="8"
            animated
            aria-label="正在加载公开分享"
          />
          <div v-else-if="feedError" class="notes-empty" role="alert">
            <h3>公开分享加载失败</h3>
            <p>{{ feedError.message }}</p>
            <button class="notes-primary" @click="list.refetch()">重试</button>
          </div>
          <div v-else-if="visible.length" ref="noteGrid" class="notes-grid">
            <NoteCard
              v-for="note in visible"
              :key="note.id"
              :note="note"
              :engagement="engagementState.data.value?.[note.id]"
              :busy="engagementBusy"
              :engagement-failed="engagementState.isError.value"
              @like="changeEngagement(note.id, 'like')"
              @retry="engagementState.refetch()"
              @open="open"
            />
          </div>
          <div v-else class="notes-empty">
            <PenLine :size="32" />
            <h3>
              {{
                isMine
                  ? "还没有写下笔记"
                  : isFavorites
                    ? "还没有相关收藏"
                    : "还没有找到相关笔记"
              }}
            </h3>
            <p>
              {{
                isMine
                  ? "一张照片、一点经验，都值得记录。"
                  : isFavorites
                    ? "在发现中收藏喜欢的内容，稍后回来慢慢看。"
                    : "换个关键词，或稍后再来看看。"
              }}
            </p>
            <button
              class="notes-primary"
              @click="
                isMine
                  ? query({ compose: '1' })
                  : isFavorites
                    ? router.push('/')
                    : query({ q: undefined, category: undefined })
              "
            >
              {{
                isMine
                  ? "写第一篇笔记"
                  : isFavorites
                    ? "去发现看看"
                    : "查看全部笔记"
              }}
            </button>
          </div>
          <div
            v-if="!isMine && !isMock && visible.length"
            class="notes-pagination"
          >
            <p v-if="list.isFetchNextPageError.value" role="alert">
              加载下一页失败，请重试。
            </p>
            <button
              v-if="list.hasNextPage.value"
              class="notes-primary"
              :disabled="list.isFetchingNextPage.value"
              @click="list.fetchNextPage()"
            >
              {{
                list.isFetchingNextPage.value ? "正在加载…" : "加载更多"
              }}
</button
            ><span v-else
              >已经看到全部{{ isFavorites ? "收藏" : "公开分享" }}</span
            >
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
          <img
            :src="publicAssetUrl('/images/notes/repair.webp')"
            alt="修复木椅的过程"
          />
          <div>
            <span>成果故事 · 演示内容</span>
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
      <p v-if="isMine" class="member-local-hint">
        本机笔记仅保存在当前浏览器，不会公开发布或同步到其他设备。
      </p>
      <footer class="notes-footer">
        生活里的小发现，值得被看见。<span
          >{{ isMock ? "当前为演示模式" : "发现内容来自审核通过的公开分享" }} ·
          新笔记仅保存在本机</span
        >
      <span><router-link to="/legal/terms" target="_blank">用户协议</router-link> · <router-link to="/legal/privacy" target="_blank">隐私政策</router-link></span></footer>
    </main>
    <el-dialog
      :model-value="reading"
      class="notes-reader-dialog"
      body-class="notes-reader-dialog-body"
      :width="readerImages.length ? 'min(1120px, 94vw)' : 'min(740px, 94vw)'"
      top="6vh"
      title="笔记"
      :show-close="false"
      header-class="notes-reader-dialog-header"
      @close="query({ note: undefined })"
    >
      <template #header></template>
      <el-skeleton
        v-if="remoteId && detail.isFetching.value"
        :rows="8"
        animated
      />
      <div
        v-else-if="remoteId && detail.isError.value"
        class="notes-empty"
        role="alert"
      >
        <h3>这篇分享暂时无法查看</h3>
        <p>{{ detail.error.value?.message }}</p>
        <button class="notes-primary" @click="detail.refetch()">重试</button>
      </div>
      <NoteReader
        v-else-if="selected"
        :note="selected"
        :images="readerImages"
        @reference="query({ note: $event })"
      >
        <template v-if="selected.remote" #actions>
          <ShareActions
            :state="engagementState.data.value?.[selected.id]"
            :busy="engagementBusy"
            :failed="engagementState.isError.value"
            @like="changeEngagement(selected.id, 'like')"
            @favorite="changeEngagement(selected.id, 'favorite')"
            @retry="engagementState.refetch()"
          />
        </template>
      </NoteReader>
    </el-dialog>
    <el-dialog
      v-if="editingProfile && profile.data.value && session.user"
      :model-value="editingProfile"
      title="编辑个人资料"
      width="min(540px, 94vw)"
      destroy-on-close
      :close-on-click-modal="!saveProfile.isPending.value"
      :close-on-press-escape="!saveProfile.isPending.value"
      :show-close="!saveProfile.isPending.value"
      @close="editingProfile = false"
      >
<ProfileEditor
        :profile="profile.data.value"
        :busy="saveProfile.isPending.value"
        :error="saveProfile.error.value?.message"
        @cancel="editingProfile = false"
        @save="submitProfile"
    />
</el-dialog>
    <el-dialog
      :model-value="composing"
      width="min(700px, 94vw)"
      title="写下今天的想法"
      @close="query({ compose: undefined })"
    >
      <form class="notes-editor" @submit.prevent="saveNote">
        <p>
          不必是完整的故事，一点发现也很好。这里是本机体验，草稿和笔记不会上传。
        </p>
        <label for="note-title">标题</label
        ><el-input
          id="note-title"
          v-model="draft.title"
          placeholder="给这篇笔记起个名字"
          maxlength="60"
          show-word-limit
        /><label for="note-content">正文</label
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
    </el-dialog>
  </div>
</template>
<style src="../notes/notesPage.css"></style>
