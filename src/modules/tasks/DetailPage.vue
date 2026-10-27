<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft, Heart } from "lucide-vue-next";
import { ElMessage } from "element-plus";
import TaskBody from "./TaskBody.vue";
import RewardContent from "./RewardContent.vue";
import InterestForm from "./InterestForm.vue";
import { useTaskActions } from "./useTaskActions";
import { useSession } from "../account/session";
import { publicDetail, isLive } from "../../services/publicTasks";
import { service } from "../../services";
import { interactions } from "../../services/taskInteractions";
const route = useRoute(),
  router = useRouter(),
  session = useSession(),
  client = useQueryClient(),
  id = computed(() => String(route.params.id));
const historical = computed(() => route.query.confirmed === "1");
const q = useQuery({
  queryKey: computed(() => [
    "opportunity",
    id.value,
    historical.value ? session.user?.id : null,
    historical.value,
  ]),
  queryFn: () =>
    historical.value && isLive
      ? publicDetail(id.value, undefined, true)
      : service.detail(id.value),
});
const { state, favorited, submitted, favorite } = useTaskActions(id);
const interest = ref(false),
  busy = ref(false);
const own = computed(() => q.data.value?.publisherId === session.user?.id);
const interestState = computed(() => state.data.value?.interest);
const needsConfirmation = computed(
  () =>
    interestState.value?.status === "pending" &&
    interestState.value.confirmedVersion <
      interestState.value.confirmationVersion,
);
const statusNames: Record<string, string> = {
  pending: "已提交意向，等待发布者处理",
  accepted: "已确认承接",
  rejected: "本次未被选中",
  withdrawn: "已撤回意向",
};
const recruitmentNames: Record<string, string> = {
  open: "招募中",
  paused: "暂停招募",
  full: "名额已满",
  ended: "招募已结束",
};
function participate() {
  session.requireLogin(() => (interest.value = true));
}
async function respond(action: "confirm" | "withdraw") {
  if (busy.value) return;
  busy.value = true;
  try {
    await interactions.respond(id.value, action, q.data.value?.version ?? 0);
    await client.invalidateQueries({ queryKey: ["task-state"] });
    await client.invalidateQueries({ queryKey: ["my-interests"] });
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    busy.value = false;
  }
}
function back() {
  if (
    typeof route.query.from === "string" &&
    route.query.from.startsWith("/opportunities")
  )
    router.push(route.query.from);
  else router.push("/opportunities");
}
</script>
<template>
  <main class="detail-page complete-detail">
    <button class="back-link" @click="back">
      <ArrowLeft :size="15" />返回机会列表</button
    ><el-skeleton v-if="q.isPending.value" :rows="14" animated /><el-result
      v-else-if="q.error.value"
      icon="warning"
      :title="q.error.value.message"
    >
      <template #extra>
        <el-button @click="q.refetch()">重新加载</el-button
        ><el-button @click="back">返回机会列表</el-button>
      </template>
    </el-result>
    <div v-else-if="q.data.value" class="detail-layout">
      <article class="detail-main">
        <el-alert
          v-if="historical"
          title="这是你确认过的任务条件，供核对约定；最新发布内容可能已变化。"
          type="info"
          :closable="false"
        /><router-link v-if="historical" :to="`/tasks/${id}`"
          >返回当前正式版本 →</router-link
        ><TaskBody :item="q.data.value" />
      </article>
      <aside class="detail-side">
        <div class="detail-action-card">
          <RewardContent :item="q.data.value" />
          <div class="facts">
            <span
              >{{ q.data.value.mode
              }}{{ q.data.value.city ? " · " + q.data.value.city : "" }}</span
            ><span v-if="q.data.value.duration"
              >预计投入 {{ q.data.value.duration }}</span
            ><span
              >招募 {{ q.data.value.capacity }} 人<template
                v-if="q.data.value.acceptedCount"
              >
                · 已确认 {{ q.data.value.acceptedCount }} 人</template
              ></span
            >
          </div>
          <el-alert
            v-if="needsConfirmation && !historical"
            title="任务条件已变化，请阅读最新内容后决定是否继续。"
            type="warning"
            :closable="false"
          />
          <router-link
            v-if="interestState && !historical"
            :to="`/tasks/${id}?confirmed=1`"
            >查看我确认过的条件 V{{
              interestState.confirmedVersion
            }}
            →</router-link
          >
          <p v-if="interestState" class="personal-state">
            {{ statusNames[interestState.status]
            }}<small v-if="interestState.status === 'accepted'"
              >确认版本 V{{
                interestState.confirmedVersion
              }}，后续变化不会自动覆盖原约定。</small
            >
          </p>
          <el-alert
            v-if="state.error.value"
            :title="state.error.value.message"
            type="error"
            :closable="false"
          />
          <el-button
            v-if="needsConfirmation && !historical"
            type="primary"
            :loading="busy"
            @click="respond('confirm')"
          >
            已阅读最新条件，继续申请
          </el-button>
          <el-button
            v-else
            type="primary"
            :disabled="
              historical ||
              own ||
              submitted ||
              q.data.value.status === 'closed' ||
              (!!session.user && state.isPending.value)
            "
            @click="participate"
          >
            {{
              historical
                ? "历史确认条件"
                : own
                  ? "我发布的任务"
                  : submitted
                    ? interestState?.status === "accepted"
                      ? "已确认承接"
                      : "已提交意向"
                    : q.data.value.status === "closed"
                      ? "当前不接受新意向"
                      : "表达承接意向"
            }}
          </el-button>
          <el-button
            v-if="interestState?.status === 'pending' && !historical"
            :loading="busy"
            @click="respond('withdraw')"
          >
            撤回意向
          </el-button>
          <el-button class="favorite-action" @click="favorite">
            <Heart :size="16" :fill="favorited ? 'currentColor' : 'none'" />{{
              favorited ? "已收藏" : "收藏任务"
            }}
          </el-button>
          <p class="footnote">
            提交意向不代表合作成立。平台暂不提供支付结算、担保或履约管理。
          </p>
        </div>
        <div class="detail-info-card">
          <h3>发布人</h3>
          <div class="publisher">
            <span class="avatar">{{ q.data.value.publisher.slice(0, 1) }}</span
            ><strong>{{ q.data.value.publisher }}</strong>
          </div>
        </div>
        <div class="detail-info-card">
          <h3>任务信息</h3>
          <dl>
            <dt>发布于</dt>
            <dd>{{ q.data.value.createdAt.slice(0, 10) }}</dd>
            <dt>招募状态</dt>
            <dd>
              {{
                recruitmentNames[q.data.value.recruitmentStatus || ""] ||
                (q.data.value.status === "open" ? "招募中" : "已结束")
              }}
            </dd>
            <template v-if="q.data.value.version">
              <dt>正式版本</dt>
              <dd>V{{ q.data.value.version }}</dd>
            </template>
          </dl>
        </div>
      </aside>
    </div>
    <InterestForm
      v-if="q.data.value"
      :key="id"
      :item="q.data.value"
      :open="interest"
      @close="interest = false"
      @submitted="client.invalidateQueries({ queryKey: ['task-state'] })"
    />
  </main>
</template>
<style scoped>
.complete-detail {
  max-width: 1460px;
}
.complete-detail .detail-layout {
  grid-template-columns: minmax(0, 7fr) minmax(290px, 3fr);
  align-items: start;
  gap: 24px;
}
.complete-detail .detail-main {
  padding: 28px;
  border: 1px solid #eceef1;
  border-radius: 12px;
  background: #fff;
}
.complete-detail .detail-side {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-self: start;
}
.detail-action-card {
  width: 100%;
  position: static;
  align-self: start;
  border: 1px solid #eceef1;
  border-radius: 12px;
  padding: 22px;
  background: #fff;
}
.detail-info-card {
  width: 100%;
  border: 1px solid #eceef1;
  border-radius: 12px;
  padding: 22px;
  background: #fff;
  align-self: start;
}
.detail-info-card h3 {
  font-size: 16px;
  margin: 0 0 16px;
}
.detail-info-card dl {
  display: grid;
  grid-template-columns: 90px 1fr;
  font-size: 13px;
  gap: 12px;
  margin: 0;
}
.detail-info-card dt {
  color: #8a8e98;
}
.detail-info-card dd {
  margin: 0;
}
.detail-action-card > .el-button {
  width: 100%;
  margin: 12px 0 0;
  min-height: 42px;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #777d89;
  margin: 18px 0;
}
.footnote {
  font-size: 12px;
  color: #8c919c;
  line-height: 1.7;
  margin-bottom: 0;
}
.publisher {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}
.personal-state {
  font-size: 14px;
  color: #f4511e;
}
.personal-state small {
  display: block;
  line-height: 1.7;
  color: #858996;
  margin-top: 8px;
}
.back-link {
  border: 0;
  background: none;
  cursor: pointer;
  margin-bottom: 20px;
}
.favorite-action {
  display: flex;
  gap: 8px;
}
@media (max-width: 760px) {
  .complete-detail .detail-layout {
    display: flex;
    flex-direction: column;
  }
  .complete-detail .detail-side,
  .complete-detail .detail-main {
    width: 100%;
  }
  .complete-detail .detail-main {
    padding: 18px;
  }
  .detail-action-card,
  .complete-detail .detail-side {
    position: static;
  }
}
</style>
