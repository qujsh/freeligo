<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ElMessage } from "element-plus";
import {
  Search,
  Compass,
  ClipboardCheck,
  MoveRight,
  LayoutGrid,
  List,
  Camera,
  Palette,
  Wrench,
  BookOpen,
  CalendarDays,
  Laptop,
  ChevronDown,
  ArrowRight,
  Ellipsis,
} from "lucide-vue-next";
import { interactions } from "../../services/taskInteractions";
import { service } from "../../services";
import { browse, categories, cities, isLive } from "../../services/publicTasks";
import { useSession } from "../account/session";
import PeopleIcon from "../../shared/ui/PeopleIcon.vue";
import HomeOpportunityCard from "./components/HomeOpportunityCard.vue";
import PreviewDrawer from "../tasks/PreviewDrawer.vue";
import TaskAssistant from "./components/TaskAssistant.vue";
const route = useRoute(),
  router = useRouter(),
  session = useSession(),
  client = useQueryClient();
const search = ref(String(route.query.q ?? "")),
  layout = ref("grid");
const category = computed(() => String(route.query.category ?? ""));
const viewed = ref<import("../../domain/models").Opportunity[]>([]);
const tab = computed(() => String(route.query.tab ?? "recommended"));
const city = computed(() => String(route.query.city ?? ""));
const mode = computed(() => String(route.query.mode ?? ""));
const budget = computed(() => String(route.query.budget ?? ""));
const tabs = [
  { id: "recommended", label: "为你发现" },
  { id: "latest", label: "最新发布" },
  { id: "nearby", label: "身边的机会" },
  { id: "newcomer", label: "新人可参与" },
];
const categoryQuery = useQuery({
  queryKey: ["public-categories"],
  queryFn: ({ signal }) => categories(signal),
});
const cityQuery = useQuery({
  queryKey: ["public-cities"],
  queryFn: ({ signal }) => cities(signal),
});
const icons: Record<string, typeof Camera> = {
  photography: Camera,
  design: Palette,
  life_service: Wrench,
  education: BookOpen,
  events: CalendarDays,
  technology_data: Laptop,
};
const fields = computed(() =>
  (categoryQuery.data.value ?? [])
    .slice(0, 6)
    .map((c) => ({
      icon: icons[c.code] || BookOpen,
      title: c.name,
      category: c.code,
    })),
);
const unit = computed(() => String(route.query.unit ?? "project"));
const q = useQuery({
  queryKey: computed(() => [
    "opportunities",
    "home",
    route.query.q,
    category.value,
    city.value,
    mode.value,
    budget.value,
    unit.value,
    tab.value,
    session.user?.id,
  ]),
  queryFn: ({ signal }) =>
    browse(
      {
        keyword: String(route.query.q ?? ""),
        category: category.value,
        city: city.value,
        mode: mode.value,
        budget: budget.value,
        unit: unit.value,
        newcomer: tab.value === "newcomer",
        sort: tab.value === "latest" ? "latest" : "recommended",
        page: 1,
        pageSize: 6,
      },
      signal,
    ),
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
  () => route.query.q,
  (v) => {
    search.value = String(v ?? "");
  },
);
const results = computed(() => q.data.value?.items ?? []);
const visible = results;
function filter(key: string, value: string) {
  router.push({
    path: "/",
    query: { ...route.query, [key]: value || undefined, preview: undefined },
  });
}
function switchTab(value: string) {
  if (value === "nearby" && !city.value) {
    ElMessage.info("请先选择城市，再查看身边的机会");
    return;
  }
  router.push({
    path: "/",
    query: {
      ...route.query,
      tab: value === "recommended" ? undefined : value,
      city: city.value || undefined,
      preview: undefined,
    },
  });
}
function open(id: string) {
  const item =
    results.value.find((o) => o.id === id) ??
    viewed.value.find((o) => o.id === id);
  if (item)
    viewed.value = [item, ...viewed.value.filter((o) => o.id !== id)].slice(
      0,
      8,
    );
  if (matchMedia("(max-width: 760px)").matches) router.push(`/tasks/${id}`);
  else router.push({ query: { ...route.query, preview: id } });
}
async function favorite(id: string) {
  if (isLive) {
    ElMessage.info("收藏功能将在后续接入");
    return;
  }
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
function findPartners() {
  session.requireLogin(() => router.push("/publish"));
}
</script>
<template>
  <main class="reference-home">
    <section class="reference-hero" aria-labelledby="hero-heading">
      <div class="reference-hero-copy">
        <h1 id="hero-heading">
          让每一份本领，
          <br />
          都有用武之地
        </h1>
        <p>从真实的需要出发，找到合适的人，把事情做成。</p>
        <form
          class="reference-search"
          @submit.prevent="
            router.push({
              path: '/opportunities',
              query: { q: search || undefined },
            })
          "
        >
          <Search :size="21" />
          <input
            v-model="search"
            aria-label="搜索机会"
            placeholder="搜索机会、技能或项目"
          />
          <button type="submit">搜索</button>
        </form>
      </div>
      <img
        class="hero-stories"
        src="/images/reference/hero-stories.webp"
        alt="用镜头记录真实的美好、修好一把椅子、做成一件解决难题的小工具"
        fetchpriority="high"
      />
    </section>
    <section class="home-process" aria-label="从机会到成果">
      <div class="process-step">
        <Compass />
        <div>
          <strong>找到机会</strong>
          <p>发现你能做的事，也找到需要你的人</p>
        </div>
        <MoveRight class="process-arrow" />
      </div>
      <div class="process-step">
        <PeopleIcon />
        <div>
          <strong>一起完成</strong>
          <p>找到合适的人，分工协作，把事情做成</p>
        </div>
        <MoveRight class="process-arrow" />
      </div>
      <div class="process-step">
        <ClipboardCheck />
        <div>
          <strong>留下成果</strong>
          <p>完成交付，积累经验和作品，让更多机会找到你</p>
        </div>
      </div>
    </section>
    <div class="home-workspace">
      <section class="home-opportunities" aria-labelledby="opportunity-heading">
        <h2 id="opportunity-heading">发现适合你的机会</h2>
        <p class="discovery-intro">从你擅长的事，找到可以开始的机会。</p>
        <p v-if="categoryQuery.error.value" class="muted">
          分类加载失败 <button @click="categoryQuery.refetch()">重试</button>
        </p>
        <div class="discovery-categories" aria-label="技能分类">
          <button
            :class="{ active: !category }"
            :aria-pressed="!category"
            @click="filter('category', '')"
          >
            <LayoutGrid :size="21" />全部
          </button>
          <button
            v-for="field in fields"
            :key="field.title"
            :class="{ active: category === field.category }"
            :aria-pressed="category === field.category"
            @click="filter('category', field.category)"
          >
            <component :is="field.icon" :size="22" />{{ field.title }}
          </button>
          <button @click="router.push('/opportunities')">
            <Ellipsis :size="22" />更多
          </button>
        </div>
        <div class="home-discovery-toolbar">
          <div class="home-tabs" role="tablist" aria-label="机会推荐">
            <button
              v-for="t in tabs"
              :key="t.id"
              role="tab"
              :aria-selected="tab === t.id"
              :class="{ active: tab === t.id }"
              @click="switchTab(t.id)"
            >
              {{ t.label }}
            </button>
          </div>
          <div class="home-filters">
            <label class="home-select">
              <span class="sr-only">城市</span>
              <select
                :value="city"
                aria-label="城市"
                @change="
                  filter('city', ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="">城市</option>
                <option
                  v-for="option in cityQuery.data.value ?? []"
                  :key="option.code"
                  :value="option.code"
                >
                  {{ option.name }}
                </option>
                <option
                  v-if="
                    city &&
                    !(cityQuery.data.value ?? []).some((c) => c.code === city)
                  "
                  :value="city"
                >
                  {{ city }}
                </option>
                <option value="">不限城市</option>
              </select>
              <ChevronDown :size="13" />
            </label>
            <label class="home-select">
              <span class="sr-only">工作方式</span>
              <select
                :value="mode"
                aria-label="工作方式"
                @change="
                  filter('mode', ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="">工作方式</option>
                <option value="远程">线上 / 远程</option>
                <option value="现场">线下 / 现场</option>
                <option value="混合">混合</option>
              </select>
              <ChevronDown :size="13" />
            </label>
            <label class="home-select">
              <span class="sr-only">预算</span>
              <select
                :value="budget"
                aria-label="预算"
                @change="
                  filter('budget', ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="">预算</option>
                <option value="under1000">¥1,000 以下</option>
                <option value="1000to3000">¥1,000–3,000</option>
                <option value="over3000">¥3,000 以上</option>
              </select>
              <ChevronDown :size="13" />
            </label>
            <label v-if="budget && isLive" class="home-select"
              ><span class="sr-only">预算计价单位</span
              ><select
                :value="unit"
                aria-label="预算计价单位"
                @change="
                  filter('unit', ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="project">每项目</option>
                <option value="hour">每小时</option>
                <option value="day">每天</option>
                <option value="time">每次</option>
                <option value="item">每件</option>
              </select></label
            >
            <div class="home-view-toggle">
              <button
                aria-label="卡片视图"
                :aria-pressed="layout === 'grid'"
                :class="{ active: layout === 'grid' }"
                @click="layout = 'grid'"
              >
                <LayoutGrid
                  :size="20"
                  :fill="layout === 'grid' ? 'currentColor' : 'none'"
                />
              </button>
              <button
                aria-label="列表视图"
                :aria-pressed="layout === 'list'"
                :class="{ active: layout === 'list' }"
                @click="layout = 'list'"
              >
                <List :size="22" />
              </button>
            </div>
          </div>
        </div>
        <div class="discovery-result-count" aria-live="polite">
          <span>{{
            q.isPending.value
              ? "正在查找任务…"
              : q.error.value
                ? "任务加载失败"
                : `共找到 ${q.data.value?.total ?? 0} 个任务`
          }}</span>
          <button
            v-if="
              category ||
              city ||
              mode ||
              budget ||
              route.query.q ||
              tab !== 'recommended'
            "
            @click="router.push('/')"
          >
            清除筛选
          </button>
        </div>
        <el-skeleton v-if="q.isPending.value" :rows="9" animated />
        <el-result
          v-else-if="q.error.value"
          icon="error"
          :title="q.error.value.message"
        >
          <template #extra>
            <el-button @click="q.refetch()">重试</el-button>
          </template>
        </el-result>
        <div v-else-if="!visible.length" class="home-empty">
          <Search :size="30" />
          <h3>暂时没有找到合适的机会</h3>
          <p>换个筛选条件，再看看有什么适合你的事。</p>
          <el-button @click="router.push('/')">清空筛选</el-button>
        </div>
        <div
          v-else
          class="home-card-grid"
          :class="{ 'home-list-view': layout === 'list' }"
        >
          <HomeOpportunityCard
            v-for="item in visible"
            :key="item.id"
            :item="item"
            :favorite="favoriteIds.includes(item.id)"
            @open="open"
            @favorite="favorite"
          />
        </div>
        <button
          class="discovery-more"
          @click="
            router.push({
              path: '/opportunities',
              query: {
                ...route.query,
                preview: undefined,
                page: undefined,
                sort: tab === 'latest' ? 'latest' : undefined,
                newcomer: tab === 'newcomer' ? '1' : undefined,
              },
            })
          "
        >
          查看更多任务<ArrowRight :size="17" />
        </button>
      </section>
      <aside class="home-right-rail">
        <section class="demand-invitation">
          <h2>有件事，需要人来做？</h2>
          <p>把需要说清楚，找到合适的人。</p>
          <button @click="findPartners">
            <span aria-hidden="true">＋</span>发布需求
          </button>
        </section>
        <TaskAssistant :viewed="viewed" @open="open" />
      </aside>
    </div>
    <PreviewDrawer
      :id="String(route.query.preview ?? '')"
      @close="router.replace({ query: { ...route.query, preview: undefined } })"
    />
  </main>
</template>
