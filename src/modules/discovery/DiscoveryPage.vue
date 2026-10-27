<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowUpRight,
} from "lucide-vue-next";
import { ElMessage } from "element-plus";
import { interactions } from "../../services/taskInteractions";
import { service } from "../../services";
import {
  browse,
  categories as loadCategories,
  cities,
  isLive,
} from "../../services/publicTasks";
import { useSession } from "../account/session";
import OpportunityCard from "../../shared/ui/OpportunityCard.vue";
import PreviewDrawer from "../tasks/PreviewDrawer.vue";
const route = useRoute(),
  router = useRouter(),
  session = useSession(),
  client = useQueryClient(),
  search = ref(String(route.query.q ?? "")),
  layout = ref("grid"),
  page = ref(1);
const home = computed(() => route.path === "/"),
  favorites = computed(() => route.path === "/favorites"),
  categoryQuery = useQuery({
    queryKey: ["public-categories"],
    queryFn: ({ signal }) => loadCategories(signal),
  });
const cityQuery = useQuery({
  queryKey: ["public-cities"],
  queryFn: ({ signal }) => cities(signal),
});
const categories = computed(() => [
  { code: "", name: "全部机会" },
  ...(categoryQuery.data.value ?? []),
]);
const category = computed(() => String(route.query.category ?? "")),
  mode = computed(() => String(route.query.mode ?? "")),
  kind = computed(() => String(route.query.kind ?? "")),
  newcomer = computed(() => route.query.newcomer === "1");
const q = useQuery({
  queryKey: computed(() => [
    "opportunities",
    route.query.q,
    route.query.city,
    route.query.budget,
    route.query.unit,
    route.query.sort,
    page.value,
    category.value,
    mode.value,
    kind.value,
    newcomer.value,
    favorites.value,
    session.user?.id,
  ]),
  queryFn: async ({ signal }) => {
    if (isLive && favorites.value) {
      if (!session.user) return { items: [], total: 0, page: 1, pageSize: 8 };
      const ids = await interactions.favorites();
      const items = await Promise.all(
        ids.map((id) => service.detail(id).catch(() => null)),
      );
      const visible = items.filter(
        (i): i is NonNullable<typeof i> => i !== null,
      );
      return {
        items: visible.slice((page.value - 1) * 8, page.value * 8),
        total: visible.length,
        page: page.value,
        pageSize: 8,
      };
    }
    if (isLive && !favorites.value)
      return browse(
        {
          kind: kind.value,
          keyword: String(route.query.q ?? ""),
          category: category.value,
          mode: mode.value,
          newcomer: newcomer.value,
          city: String(route.query.city ?? ""),
          budget: String(route.query.budget ?? ""),
          unit: String(route.query.unit ?? "project"),
          sort: String(
            route.query.sort ??
              (route.query.tab === "latest" ? "latest" : "recommended"),
          ),
          page: page.value,
          pageSize: 8,
        },
        signal,
      );
    const name = categories.value.find((c) => c.code === category.value)?.name;
    const items = await service.list(
      {
        keyword: String(route.query.q ?? ""),
        category:
          name === "技术与数据"
            ? "商业支持"
            : category.value
              ? name
              : undefined,
        mode: mode.value,
        kind: kind.value,
        newcomer: newcomer.value,
        favorites: favorites.value,
      },
      session.user,
    );
    return {
      items: items.slice((page.value - 1) * 8, page.value * 8),
      total: items.length,
      page: page.value,
      pageSize: 8,
    };
  },
});
const favoriteQuery = useQuery({
  queryKey: computed(() => ["favorite-ids", session.user?.id]),
  enabled: computed(() => isLive && !!session.user),
  queryFn: () => interactions.favorites(),
});
const favoriteIds = computed(() =>
  isLive
    ? (favoriteQuery.data.value ?? [])
    : session.user
      ? service.favorites(session.user)
      : [],
);

watch(
  () => route.query,
  () => {
    page.value = 1;
    search.value = String(route.query.q ?? "");
  },
);
const visible = computed(() => q.data.value?.items ?? []);
function filter(key: string, value: string) {
  router.push({
    path: favorites.value ? "/favorites" : "/opportunities",
    query: { ...route.query, [key]: value || undefined, preview: undefined },
  });
}
function open(id: string) {
  if (matchMedia("(max-width: 760px)").matches) {
    const o = q.data.value?.items.find((o) => o.id === id);
    router.push(`/${o?.kind === "project" ? "projects" : "tasks"}/${id}`);
  } else router.push({ query: { ...route.query, preview: id } });
}
function favorite(id: string) {
  session.requireLogin(async () => {
    try {
      if (isLive)
        await interactions.favorite(id, !favoriteIds.value.includes(id));
      else await service.favorite(id, session.user!);
      await client.invalidateQueries({ queryKey: ["favorite-ids"] });
      await client.invalidateQueries({ queryKey: ["task-state"] });
      await client.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (e) {
      ElMessage.error((e as Error).message);
    }
  });
}
</script>
<template>
  <main>
    <section v-if="home" class="hero">
      <div class="hero-copy">
        <div class="hero-line"></div>
        <h1>
          让你的本领，
          <br />
          遇见值得做的事。
        </h1>
        <p>
          不止一种职业，不止一种可能。
          <br />
          发现适合你的机会，和靠谱的人一起把事情做成。
        </p>
        <form class="hero-search" @submit.prevent="filter('q', search)">
          <Search :size="20" />
          <input
            v-model="search"
            aria-label="搜索机会"
            placeholder="试试「设计」「摄影」「整理资料」"
          />
          <button type="submit">
            找机会
            <ArrowRight :size="16" />
          </button>
        </form>
        <div class="hero-links">
          <span>从这里开始</span>
          <button @click="filter('mode', '远程')">远程协作 ↗</button>
          <button @click="filter('newcomer', '1')">新人可参与 ↗</button>
        </div>
      </div>
      <div class="hero-photo">
        <img src="/images/hero.jpg" alt="在自然光下共同讨论和工作的伙伴" />
        <div class="photo-caption">
          <span>普通人的本领，也有不普通的可能。</span>
          <small>一起做，让事情发生。</small>
        </div>
      </div>
    </section>
    <section class="discovery-section">
      <header class="section-title">
        <div>
          <p class="section-kicker">
            {{
              favorites
                ? "为值得的机会，留一个位置"
                : home
                  ? "从一件具体的事开始"
                  : "找到适合你的下一件事"
            }}
          </p>
          <h2>
            {{
              favorites ? "我的收藏" : home ? "发现你的下一次可能" : "机会大厅"
            }}
          </h2>
        </div>
        <router-link v-if="home" class="text-link" to="/opportunities">
          查看全部机会
          <ArrowUpRight :size="17" />
        </router-link>
        <form
          v-else
          class="inline-search"
          @submit.prevent="filter('q', search)"
        >
          <Search :size="17" />
          <input
            v-model="search"
            aria-label="搜索机会"
            placeholder="搜索你想做的事"
          />
          <button type="submit">搜索</button>
        </form>
      </header>
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.code"
          :class="{ active: category === cat.code }"
          @click="filter('category', cat.code)"
        >
          {{ cat.name }}
        </button>
      </div>
      <div v-if="!home" class="filter-toolbar">
        <div class="filter-controls">
          <SlidersHorizontal :size="15" />
          <el-select
            :model-value="mode"
            placeholder="工作方式"
            clearable
            aria-label="工作方式"
            @change="(v: string) => filter('mode', v)"
          >
            <el-option
              v-for="v in ['远程', '现场', '混合']"
              :key="v"
              :value="v"
            />
          </el-select>
          <el-select
            :model-value="kind"
            placeholder="机会类型"
            clearable
            aria-label="机会类型"
            @change="(v: string) => filter('kind', v)"
          >
            <el-option value="project" label="协作项目" />
            <el-option value="task" label="具体任务" />
          </el-select>
          <el-select
            v-if="isLive"
            :model-value="String(route.query.city ?? '')"
            placeholder="城市"
            clearable
            aria-label="城市"
            @change="(v: string) => filter('city', v)"
            ><el-option
              v-for="option in cityQuery.data.value ?? []"
              :key="option.code"
              :value="option.code"
              :label="option.name"
          /></el-select>
          <el-select
            v-if="isLive"
            :model-value="String(route.query.sort ?? '')"
            placeholder="默认发现"
            clearable
            aria-label="排序"
            @change="(v: string) => filter('sort', v)"
            ><el-option value="recommended" label="默认发现" /><el-option
              value="latest"
              label="最新发布"
          /></el-select>
          <el-select
            v-if="isLive"
            :model-value="String(route.query.budget ?? '')"
            placeholder="预算"
            clearable
            aria-label="预算"
            @change="(v: string) => filter('budget', v)"
            ><el-option value="under1000" label="1,000以下" /><el-option
              value="1000to3000"
              label="1,000–3,000" /><el-option
              value="over3000"
              label="3,000以上"
          /></el-select>
          <el-select
            v-if="isLive && route.query.budget"
            :model-value="String(route.query.unit ?? 'project')"
            aria-label="预算计价单位"
            @change="(v: string) => filter('unit', v)"
            ><el-option value="project" label="每项目" /><el-option
              value="hour"
              label="每小时" /><el-option value="day" label="每天" /><el-option
              value="time"
              label="每次" /><el-option value="item" label="每件"
          /></el-select>
          <el-checkbox
            :model-value="newcomer"
            @change="
              (v: string | number | boolean) => filter('newcomer', v ? '1' : '')
            "
          >
            新人可参与
          </el-checkbox>
          <button
            v-if="Object.keys(route.query).some((k) => k !== 'preview')"
            class="clear-filter"
            @click="$router.push(favorites ? '/favorites' : '/opportunities')"
          >
            清空筛选
          </button>
        </div>
        <div class="view-switch">
          <span>{{ q.data.value?.total ?? 0 }} 个机会</span>
          <button
            aria-label="卡片视图"
            :class="{ active: layout === 'grid' }"
            @click="layout = 'grid'"
          >
            <LayoutGrid :size="17" />
          </button>
          <button
            aria-label="列表视图"
            :class="{ active: layout === 'list' }"
            @click="layout = 'list'"
          >
            <List :size="17" />
          </button>
        </div>
      </div>
      <div v-if="favorites && !session.user" class="empty-block">
        <h3>登录后，收藏会在这里等你</h3>
        <p>把感兴趣的事情留住，下次再继续了解。</p>
        <el-button
          type="primary"
          @click="session.requireLogin(() => client.invalidateQueries())"
        >
          使用演示账号登录
        </el-button>
      </div>
      <el-skeleton v-else-if="q.isPending.value" :rows="8" animated />
      <el-result
        v-else-if="q.error.value"
        icon="error"
        :title="q.error.value.message"
      >
        <template #extra>
          <el-button @click="q.refetch()">重试</el-button>
        </template>
      </el-result>
      <div v-else-if="!visible.length" class="empty-block">
        <Search :size="32" />
        <h3>暂时没有找到合适的机会</h3>
        <p>换个关键词，或减少一些筛选条件试试。</p>
        <el-button @click="$router.push('/opportunities')">
          查看全部机会
        </el-button>
      </div>
      <div v-else class="discovery-layout" :class="{ 'home-layout': home }">
        <div
          class="opportunity-grid"
          :class="{ 'list-view': layout === 'list' && !home }"
        >
          <OpportunityCard
            v-for="item in visible"
            :key="item.id"
            :item="item"
            :favorite="favoriteIds.includes(item.id)"
            @open="open"
            @favorite="favorite"
          />
        </div>
        <aside v-if="home" class="discovery-aside">
          <section class="together">
            <span class="aside-number">01 / 一起做</span>
            <h3>
              一个人有本领，
              <br />
              一群人有可能。
            </h3>
            <p>
              加入一个项目，
              <br />
              找到属于你的那一部分。
            </p>
            <router-link to="/opportunities?kind=project">
              探索协作项目
              <ArrowUpRight :size="17" />
            </router-link>
            <div class="collaboration-circles">
              <span>设</span>
              <span>影</span>
              <span>策</span>
              <span>＋</span>
            </div>
          </section>
          <section class="starter">
            <span class="aside-number">02 / 第一次参与</span>
            <h3>
              每一段经历，
              <br />
              都从第一次开始。
            </h3>
            <p>
              范围清楚、要求明确，
              <br />
              找到适合新人的机会。
            </p>
            <router-link to="/opportunities?newcomer=1">
              看看新人机会 →
            </router-link>
          </section>
        </aside>
      </div>
      <el-pagination
        v-if="!home && (q.data.value?.total ?? 0) > 8"
        v-model:current-page="page"
        :page-size="8"
        :total="q.data.value?.total ?? 0"
        layout="prev,pager,next"
        class="pagination"
      />
    </section>
    <section v-if="home" class="publish-band">
      <div>
        <span>你也可以成为发起者</span>
        <h2>有一件事，想找人一起做？</h2>
        <p>把需求说清楚，让合适的伙伴找到你。</p>
      </div>
      <el-button @click="session.requireLogin(() => $router.push('/publish'))">
        发布我的需求
        <ArrowUpRight :size="17" />
      </el-button>
    </section>
    <PreviewDrawer
      :id="String(route.query.preview ?? '')"
      @close="
        $router.replace({ query: { ...route.query, preview: undefined } })
      "
    />
  </main>
</template>
