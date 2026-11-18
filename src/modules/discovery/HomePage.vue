<script setup lang="ts">
import { publicAssetUrl } from "../../shared/lib/publicAssetUrl";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search, ArrowLeft, ArrowUpRight, PenLine } from "lucide-vue-next";
import { useQuery } from "@tanstack/vue-query";

import { ownedNotes } from "../../services/ownedNotes";
import { managementNoteUrl } from "../notes/managementNavigation";
import { ElMessage } from "element-plus";
import { useSession } from "../account/session";
import { useNoteEngagements } from "../notes/useNoteEngagements";
import { useNoteComments } from "../notes/useNoteComments";
import NoteComments from "../notes/components/NoteComments.vue";
import NoteCommentComposer from "../notes/components/NoteCommentComposer.vue";
import type { NoteComment } from "../../services/publicNotes";
import NoteActions from "../notes/components/NoteActions.vue";
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
import { useOwnedNotes } from "../notes/useOwnedNotes";
import { usePublicNotes } from "../notes/usePublicNotes";
import { useNoteMasonry } from "../notes/useNoteMasonry";
import type { Note } from "../notes/noteModels";
const route = useRoute(),
  router = useRouter();
const { notes: localNotes } = useLocalNotes();
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
const isCloudDrafts = computed(() => isMine.value && route.query.source === "drafts");
const isRemoteMine = computed(() => isMine.value && !isMock);
const isGrowth = computed(() => route.query.view === "growth");
const isMock = import.meta.env.VITE_DATA_SOURCE === "mock";
// 旧备份链接归并到云端草稿，不再读取或展示浏览器备份。
watch(() => route.query.source, source => {
  if (!isMock && source === "local") void router.replace({ query: { ...route.query, source: "drafts", note: undefined } });
}, { immediate: true });
const summary=useQuery({queryKey:computed(()=>["owned-notes",viewer.value,"summary"]),queryFn:({signal})=>ownedNotes.list("",undefined,signal),enabled:computed(()=>!!session.user&&!isMock),staleTime:30000,retry:false});
// 标签数量只统计后端草稿，保持与搜索结果和浏览器恢复内容分离。
const draftSummary = useQuery({
  queryKey: computed(() => ["owned-notes", viewer.value, "draft-summary"]),
  queryFn: ({ signal }) => ownedNotes.drafts("", undefined, signal),
  enabled: computed(() => isMine.value && !!session.user && !isMock),
  staleTime: 30000,
  retry: false,
});
const keyword = computed(() => String(route.query.q ?? "").trim());
const localSelected = computed(() =>
  [...(isMock ? localNotes.value : []), ...(isMock || isGrowth.value ? sampleNotes : [])].find(
    (note) => note.id === route.query.note,
  ),
);
const remoteId = computed(() =>
  !isMock && !localSelected.value && route.query.note
    ? String(route.query.note)
    : "",
);
const { list: publicList, detail: publicDetail, items } = usePublicNotes(
  keyword,
  computed(
    () => !isMock && !isMine.value && !isGrowth.value && !isSettings.value,
  ),
  computed(() => isRemoteMine.value ? "" : remoteId.value),
  isFavorites,
);
const own = useOwnedNotes(keyword, computed(() => isRemoteMine.value && !isMock), computed(() => isRemoteMine.value ? remoteId.value : ""), isCloudDrafts);
const list = computed(() => isRemoteMine.value ? own.list : publicList);
const detail = computed(() => isRemoteMine.value ? own.detail : publicDetail);
const visible = computed(() => {
  if (isRemoteMine.value) return session.user ? own.items.value : [];

  if (!isMine.value && !isMock) return items.value;
  return (isMine.value ? localNotes.value : sampleNotes).filter(
    (note) =>
      !keyword.value ||
      [note.title, note.content]
        .join(" ")
        .toLowerCase()
        .includes(keyword.value.toLowerCase()),
  );
});
// 刷新期间隐藏旧详情，但保留同一公开笔记的评论输入；失败或失去本人权限时立即失效。
const availableNote = computed(() => localSelected.value ??
  ((!isRemoteMine.value || !!session.user) && !detail.value.isError.value ? detail.value.data.value : undefined));
const selected = computed(() => {
  const note = localSelected.value ?? (!detail.value.isFetching.value ? availableNote.value : undefined);
  if (!note?.own || !session.user) return note;
  // 本人接口不重复返回作者信息，阅读时使用当前账号的真实资料，避免修改查询缓存。
  return {
    ...note,
    author: profile.data.value?.nickname || session.user.name,
    avatarUrl: avatar.value || note.avatarUrl,
  };
});
function canEngage(note: Note) {
  return note.remote && (!note.own || note.engagementAvailable);
}
const discussion = useNoteComments(computed(() => availableNote.value && canEngage(availableNote.value) ? availableNote.value.id : ""));
const commentsPanel = ref<InstanceType<typeof NoteComments> | null>(null);
const commentComposer = ref<InstanceType<typeof NoteCommentComposer> | null>(null);
function replyComment(comment: NoteComment) {
  discussion.replyTo.value = comment;
  commentComposer.value?.focus();
}
function showComments() {
  commentsPanel.value?.scrollIntoView();
  commentComposer.value?.focus();
}
const engagementIds = computed(() =>
  [
    ...new Set([
      ...visible.value.filter(canEngage).map((note) => note.id),
      ...(selected.value && canEngage(selected.value) ? [selected.value.id] : []),
    ]),
  ].sort(),
);
const {
  state: engagementState,
  change: changeEngagement,
  busy: engagementBusy,
} = useNoteEngagements(engagementIds);
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
    !isMock &&
    (!(isFavorites.value || isRemoteMine.value) || !!session.user) &&
    list.value.isPending.value,
);
const feedError = computed(() =>
  !isMock && !list.value.isFetchNextPageError.value
    ? list.value.error.value
    : null,
);
function query(values: Record<string, string | undefined>) {
  void router.push({ path: "/", query: { ...route.query, ...values } });
}
function open(note: Note) {
  query({ note: note.id });
}
/** 管理端通过共享后端Cookie恢复真实会话，不在跳转链接中传递身份凭证。 */
function openManagement(view?: "trash") {
  try {
    window.open(managementNoteUrl(view), "_blank", "noopener,noreferrer");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "管理端地址尚未配置");
  }
}
function writeNote() { openManagement(); }
function openTrash() { openManagement("trash"); }
// 旧创作链接只清除编辑参数，保留当前页面；不再挂载C端编辑器或自动写入。
watch(() => [route.query.compose, route.query.edit, route.query.resume, route.query.legacy], values => {
  if (values.some(value => value !== undefined)) {
    void router.replace({ query: { ...route.query, compose: undefined, edit: undefined, resume: undefined, legacy: undefined } });
  }
}, { immediate: true });
function submitSearch() {
  query({ q: search.value.trim() || undefined });
}
</script>
<template>
  <div class="notes-app">
    <NotesHeader
      :growth="isGrowth"
      :personal="isMine || isFavorites || isSettings"
      :avatar="avatar"
      :bio="profile.data.value?.bio || undefined"
      :note-count="isMock ? localNotes.length : session.user ? summary.data.value?.total : undefined"
      :user-name="session.user?.name"
      :live="!isMock"
      @profile="query({ view: 'mine', source: undefined, q: undefined, note: undefined })"
      @settings="query({ view: 'settings', q: undefined, note: undefined })"
      @favorites="showFavorites"
      @login="session.requireLogin(() => {})"
      @logout="signout"
      @mine="query({ view: 'mine', source: undefined, note: undefined, q: undefined, category: undefined })"
      @compose="writeNote"
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
          @mine="query({ view: 'mine', source: undefined, note: undefined, q: undefined })"
          @favorites="showFavorites"
        />
        <div v-if="isMine" class="member-content-bar">
          <div class="member-note-sources" aria-label="笔记列表">
            <button :class="{ active: !isCloudDrafts || isMock }" @click="query({ source: undefined, q: undefined, note: undefined })">全部笔记</button>
            <button v-if="!isMock" :class="{ active: isCloudDrafts }" @click="query({ source: 'drafts', q: undefined, note: undefined })">草稿<small v-if="session.user && draftSummary.data.value && !draftSummary.isError.value">{{ draftSummary.data.value.total }}</small></button>
            <button v-if="!isMock" title="在新窗口打开管理端回收站" @click="openTrash">回收站 <ArrowUpRight :size="13" aria-hidden="true" /></button>
          </div>
          <span v-if="session.user && own.total.value !== undefined" class="member-count">共 {{ own.total.value }} 篇{{ isCloudDrafts ? "草稿" : "笔记" }}</span>
          <form v-if="isRemoteMine && session.user" class="notes-search member-search" role="search" @submit.prevent="submitSearch">
            <Search :size="18" /><input v-model="search" :aria-label="isCloudDrafts ? '搜索草稿' : '搜索我的笔记'" :placeholder="isCloudDrafts ? '搜索草稿' : '搜索我的笔记'" type="search" />
            <button class="notes-primary" type="submit">搜索</button>
          </form>
        </div>
        <form v-if="isFavorites && session.user" class="notes-search notes-favorites-search" role="search" @submit.prevent="submitSearch">
          <Search :size="21" /><input v-model="search" aria-label="搜索收藏笔记" placeholder="搜索收藏笔记" type="search" /><button class="notes-primary" type="submit">搜索</button>
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
          <div v-if="(isFavorites || isRemoteMine) && !session.user" class="notes-empty">
            <h3>登录后查看{{ isRemoteMine ? "我的笔记" : "我的收藏" }}</h3>
            <button class="notes-primary" @click="isRemoteMine ? session.requireLogin(() => {}) : showFavorites()">
              登录并继续
            </button>
          </div>
          <el-skeleton
            v-else-if="feedLoading"
            :rows="8"
            animated
            aria-label="正在加载公开笔记"
          />
          <div v-else-if="feedError" class="notes-empty" role="alert">
            <h3>{{ isRemoteMine ? "我的笔记加载失败" : "公开笔记加载失败" }}</h3>
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
                isRemoteMine
                  ? (keyword ? "未找到相关笔记" : isCloudDrafts ? "还没有草稿" : "还没有保存的笔记")
                  : isMine
                  ? "没有本机备份"
                  : isFavorites
                    ? "还没有相关收藏"
                    : "还没有找到相关笔记"
              }}
            </h3>
            <p>
              {{
                isRemoteMine
                  ? (isCloudDrafts ? "前往管理端写笔记或管理草稿。" : "前往管理端写下第一篇笔记。")
                  : isMine
                  ? "一张照片、一点经验，都值得记录。"
                  : isFavorites
                    ? "在发现中收藏喜欢的内容，稍后回来慢慢看。"
                    : "换个关键词，或稍后再来看看。"
              }}
            </p>
            <button
              class="notes-primary"
              @click="
                isRemoteMine
                  ? (keyword ? query({ q: undefined }) : writeNote())
                  : isMine
                  ? writeNote()
                  : isFavorites
                    ? router.push('/')
                    : query({ q: undefined, category: undefined })
              "
            >
              {{
                isRemoteMine
                  ? (keyword ? "清除搜索" : "写一篇笔记")
                  : isMine
                  ? "写第一篇笔记"
                  : isFavorites
                    ? "去发现看看"
                    : "查看全部笔记"
              }}
            </button>
          </div>
          <div
            v-if="!isMock && visible.length"
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
              >{{ isCloudDrafts ? "已显示全部草稿" : isRemoteMine ? "已显示全部笔记" : isFavorites ? "已显示全部收藏" : "已经看到全部公开笔记" }}</span
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
              从检查连接点到重新加固，把一次动手的过程，变成可以笔记的经验。
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
        生活里的小发现，值得被看见。
        <span v-if="isMock">当前为演示模式</span>
        <span><router-link to="/legal/terms" target="_blank">用户协议</router-link> · <router-link to="/legal/privacy" target="_blank">隐私政策</router-link></span>
      </footer>
    </main>
    <el-dialog
      :model-value="reading"
      class="notes-reader-dialog"
      body-class="notes-reader-dialog-body"
      width="min(1120px, 94vw)"
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
        <h3>这篇笔记暂时无法查看</h3>
        <p>{{ detail.error.value?.message }}</p>
        <button class="notes-primary" @click="detail.refetch()">重试</button>
      </div>
      <NoteReader
        v-else-if="selected"
        :note="selected"
        :images="readerImages"
        @reference="query({ note: $event })"
      >
        <template v-if="canEngage(selected)" #comments>
          <NoteComments
            ref="commentsPanel"
            :items="discussion.items.value"
            :total="discussion.total.value"
            :loading="discussion.list.isPending.value"
            :error="discussion.list.isFetchNextPageError.value ? undefined : discussion.list.error.value?.message"
            :more="!!discussion.list.hasNextPage.value"
            :loading-more="discussion.list.isFetchingNextPage.value"
            :more-error="discussion.list.isFetchNextPageError.value ? '更多评论加载失败，请重试' : undefined"
            :deleting="discussion.remove.isPending.value"
            @reply="replyComment"
            @remove="discussion.deleteComment"
            @retry="discussion.list.refetch()"
            @more="discussion.list.fetchNextPage()"
          />
        </template>
        <template v-if="canEngage(selected)" #actions>
          <NoteCommentComposer
            ref="commentComposer"
            v-model="discussion.content.value"
            :reply-name="discussion.replyTo.value ? discussion.replyTo.value.author.nickname || '用户' : undefined"
            :busy="discussion.post.isPending.value"
            :logged-in="!!session.user"
            :error="discussion.post.error.value?.message"
            @submit="discussion.submit"
            @cancel-reply="discussion.replyTo.value = null"
          />
          <NoteActions
            show-comments
            :comment-count="discussion.total.value"
            :state="engagementState.data.value?.[selected.id]"
            :busy="engagementBusy"
            :failed="engagementState.isError.value"
            @comment="showComments"
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
  </div>
</template>
<style src="../notes/notesPage.css"></style>

<style scoped>
.member-content-bar { justify-content:flex-start; gap:16px; padding:22px 0; flex-wrap:wrap; }
.member-note-sources button { display:inline-flex; align-items:center; gap:4px; }
.member-count { font-size:12px; white-space:nowrap; }
.member-search { margin:0 0 0 auto; width:300px; height:38px; }
.member-search input { font-size:13px; }
.member-search .notes-primary { min-width:60px; padding:0 16px; height:30px; font-size:13px; }
@media(max-width:650px) {
  .member-content-bar { gap:12px; padding:18px 0; }
  .member-count { margin-left:auto; }
  .member-search { width:100%; margin:0; }
}
</style>
