<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, ArrowUpRight, Check } from "lucide-vue-next";
import { service } from "../../services";
import { useSession } from "../account/session";
const session = useSession(),
  client = useQueryClient(),
  selected = ref(""),
  busy = ref(false);
const q = useQuery({
    queryKey: computed(() => ["owned", session.user?.id]),
    queryFn: () => service.owned(session.user!),
    enabled: computed(() => !!session.user),
  }),
  applicants = useQuery({
    queryKey: computed(() => ["applicants", selected.value, session.user?.id]),
    queryFn: () => service.applicants(selected.value, session.user!),
    enabled: computed(() => !!selected.value && !!session.user),
  });
const task = computed(() => q.data.value?.find((o) => o.id === selected.value));
async function accept(id: string) {
  try {
    await ElMessageBox.confirm(
      "确认选择这位伙伴承接任务？该操作在当前原型中不提供撤销。",
      "选择承接人",
    );
    busy.value = true;
    await service.accept(id, session.user!);
    await client.invalidateQueries();
    ElMessage.success("已模拟确认承接人");
  } catch (e) {
    if (e instanceof Error) ElMessage.error(e.message);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="publisher-page">
    <header class="section-title">
      <div>
        <p class="section-kicker">让每一次合作，有一个清楚的开始</p>
        <h1>发布者工作台</h1>
      </div>
      <el-button
        type="primary"
        @click="session.requireLogin(() => $router.push('/publish'))"
      >
        <Plus :size="16" />
        发布需求
      </el-button>
    </header>
    <div v-if="!session.user" class="empty-block">
      <h2>登录后，管理你发起的机会</h2>
      <el-button
        type="primary"
        @click="session.requireLogin(() => client.invalidateQueries())"
      >
        选择演示身份
      </el-button>
    </div>
    <template v-else>
      <el-alert
        v-if="q.error.value"
        :title="q.error.value.message"
        type="error"
        :closable="false"
      />
      <el-skeleton v-if="q.isPending.value" :rows="6" animated />
      <div v-else class="publisher-table">
        <el-table
          :data="q.data.value ?? []"
          empty-text="还没有发布需求，试着发起一件事吧"
        >
          <el-table-column label="机会" min-width="270">
            <template #default="{ row }">
              <strong>{{ row.title }}</strong>
              <small class="table-sub">
                {{ row.kind === "project" ? "项目" : "任务" }} ·
                {{ row.category }}
              </small>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'open' ? 'success' : 'info'">
                {{ row.status === "open" ? "招募中" : "已关闭" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="capacity" label="人数" width="70" />
          <el-table-column label="操作" width="210">
            <template #default="{ row }">
              <el-button
                link
                @click="
                  $router.push(
                    `/${row.kind === 'project' ? 'projects' : 'tasks'}/${row.id}`,
                  )
                "
              >
                查看
                <ArrowUpRight :size="13" />
              </el-button>
              <el-button
                v-if="row.kind === 'task'"
                link
                type="primary"
                @click="selected = row.id"
              >
                查看意向
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
    <el-drawer
      :model-value="!!selected"
      title="选择合适的伙伴"
      size="min(580px,100vw)"
      @close="selected = ''"
    >
      <h3>{{ task?.title }}</h3>
      <p class="muted">
        承接名额 {{ task?.capacity }} 人，默认为单人，由发布者选择。
      </p>
      <el-alert
        v-if="applicants.error.value"
        :title="applicants.error.value.message"
        type="error"
        :closable="false"
      />
      <el-skeleton v-if="applicants.isPending.value" :rows="5" animated />
      <el-empty
        v-else-if="!applicants.data.value?.length"
        description="还没有人表达意向"
      />
      <article v-for="a in applicants.data.value" :key="a.id" class="applicant">
        <header>
          <span class="avatar">{{ a.name.slice(0, 1) }}</span>
          <h3>{{ a.name }}</h3>
          <el-tag v-if="a.status === 'accepted'" type="success">
            <Check :size="12" />
            已选择
          </el-tag>
        </header>
        <p>{{ a.experience }}</p>
        <p class="muted">可开始时间：{{ a.startDate }}</p>
        <p v-if="a.portfolio" class="muted">作品链接：{{ a.portfolio }}</p>
        <p v-if="a.question">待确认：{{ a.question }}</p>
        <el-button
          type="primary"
          :loading="busy"
          :disabled="a.status === 'accepted' || task?.status === 'closed'"
          @click="accept(a.id)"
        >
          {{ a.status === "accepted" ? "已确认承接" : "选择这位伙伴" }}
        </el-button>
      </article>
      <p class="muted">后续将补充评论、飞书聊天群跳转及交付验收能力。</p>
    </el-drawer>
  </main>
</template>
