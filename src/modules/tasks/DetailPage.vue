<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft, Heart, ArrowUpRight } from "lucide-vue-next";
import { ElMessage } from "element-plus";
import TaskBody from "./TaskBody.vue";
import InterestForm from "./InterestForm.vue";
import PublicProjectTree from "./PublicProjectTree.vue";
import OpportunityCard from "../../shared/ui/OpportunityCard.vue";
import { useSession } from "../account/session";
import { isLive } from "../../services/publicTasks";
import { service } from "../../services";
const route = useRoute(),
  session = useSession(),
  id = computed(() => String(route.params.id)),
  q = useQuery({
    queryKey: computed(() => ["opportunity", id.value]),
    queryFn: () => service.detail(id.value),
  }),
  all = useQuery({
    enabled:!isLive,
    queryKey: ["all-opportunities"],
    queryFn: () => service.list({}),
  });
const interest = ref(false),
  revision = ref(0),
  favorited = computed(() => {
    void revision.value;
    return !!session.user && service.favorites(session.user).includes(id.value);
  }),
  submitted = computed(() => {
    void revision.value;
    return !!session.user && service.hasInterest(id.value, session.user);
  }),
  children = computed(() =>
    (all.data.value ?? []).filter((o) => o.projectId === id.value),
  );
function participate() {
  session.requireLogin(() => (interest.value = true));
}
function favorite(target = id.value) {
  session.requireLogin(async () => {
    try {
      await service.favorite(target, session.user!);
      revision.value++;
    } catch (e) {
      ElMessage.error((e as Error).message);
    }
  });
}
</script>
<template>
  <main class="detail-page">
    <router-link class="back-link" to="/opportunities">
      <ArrowLeft :size="15" />
      返回机会大厅
    </router-link>
    <el-skeleton v-if="q.isPending.value" :rows="14" animated />
    <el-result
      v-else-if="q.error.value"
      icon="warning"
      :title="q.error.value.message"
    >
      <template #extra>
        <el-button @click="$router.push('/opportunities')">
          继续发现机会
        </el-button>
      </template>
    </el-result>
    <div v-else-if="q.data.value" class="detail-layout">
      <article class="detail-main">
        <TaskBody :item="q.data.value" />
        <section
          v-if="q.data.value.kind === 'project'"
          id="project-tasks"
          class="project-tasks"
        >
          <h2>项目任务</h2>
          <p class="muted">以下为发布者确认公开的任务结构。工作项状态和内部依赖不在此展示。</p>
          <PublicProjectTree v-if="q.data.value.project?.tasks.length" :tasks="q.data.value.project.tasks" />
          <router-link v-if="q.data.value.source==='api'" class="project-back" :to="`/tasks/${q.data.value.publicationTaskId}`">查看本次招募要求与报酬 <ArrowUpRight :size="16" /></router-link>
          <div v-if="!isLive" class="opportunity-grid list-view">
            <OpportunityCard v-for="item in children" :key="item.id" :item="item" @open="target => $router.push(`/tasks/${target}`)" @favorite="favorite" />
          </div>
          <el-empty v-if="isLive ? !q.data.value.project?.tasks.length : !children.length" description="该版本暂未发布项目任务" />
        </section>
        <router-link
          v-else-if="q.data.value.projectId"
          class="project-back"
          :to="`/projects/${q.data.value.projectId}`"
        >
          查看所属项目介绍与项目任务
          <ArrowUpRight :size="16" />
        </router-link>
      </article>
      <aside class="detail-side">
        <div class="participation-panel">
          <span class="detail-category">
            {{
              q.data.value.status === "open" ? "期待合适的你" : "本次招募已结束"
            }}
          </span>
          <h3>
            让一次合作，
            <br />
            成为新的可能。
          </h3>
          <strong>{{ q.data.value.rewardPrefix ?? '¥' }} {{ q.data.value.reward }}</strong>
          <small v-if="q.data.value.unit">/ {{ q.data.value.unit }}</small>
          <div class="participation-facts">
            <span>
              工作方式
              <b>{{ q.data.value.mode }}</b>
            </span>
            <span v-if="q.data.value.duration">
              预计投入
              <b>{{ q.data.value.duration }}</b>
            </span>
            <span>
              承接人数
              <b>{{ q.data.value.capacity }} 人</b>
            </span>
          </div>
          <el-button
            v-if="q.data.value.kind === 'project'"
            type="primary"
            tag="a"
            href="#project-tasks"
          >
            查看项目任务
          </el-button>
          <el-button
            v-else
            type="primary"
            :disabled="
              submitted ||
              q.data.value.status === 'closed' ||
              q.data.value.publisherId === session.user?.id
            "
            @click="participate"
          >
            {{
              submitted
                ? "已提交意向"
                : q.data.value.status === "closed"
                  ? "已停止招募"
                  : q.data.value.publisherId === session.user?.id
                    ? "我发布的任务"
                    : "表达承接意向"
            }}
          </el-button>
          <el-button class="detail-favorite" @click="favorite()">
            <Heart :size="15" :fill="favorited ? 'currentColor' : 'none'" />
            {{ favorited ? "已收藏" : "收藏这个机会" }}
          </el-button>
          <p>
            提交意向后，由项目发布者选择承接者。报酬仅作展示，暂无平台支付。
          </p>
        </div>
        <div class="detail-tip">
          <h4>把事情说清楚，再一起开始。</h4>
          <p>
            参与前确认工作范围、交付要求与报酬安排。沟通与履约能力将在后续补充。
          </p>
        </div>
      </aside>
    </div>
    <InterestForm
      v-if="q.data.value"
      :key="id"
      :item="q.data.value"
      :open="interest"
      @close="interest = false"
      @submitted="revision++"
    />
  </main>
</template>
