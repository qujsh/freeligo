<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { ElMessage } from "element-plus";
import { interactions } from "../../services/taskInteractions";
import { isLive } from "../../services/publicTasks";
import { useSession } from "./session";
const session = useSession(),
  client = useQueryClient(),
  busy = ref(false);
const q = useQuery({
  queryKey: computed(() => ["my-interests", session.user?.id]),
  enabled: computed(() => isLive && !!session.user),
  queryFn: () => interactions.mine(),
});
const names = {
  pending: "待处理",
  accepted: "已确认承接",
  rejected: "未选中",
  withdrawn: "已撤回",
};
async function withdraw(no: string) {
  busy.value = true;
  try {
    await interactions.respond(no, "withdraw");
    await client.invalidateQueries({ queryKey: ["my-interests"] });
    await client.invalidateQueries({ queryKey: ["task-state"] });
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="my-interests">
    <h1>我的承接意向</h1>
    <p class="muted">查看发布者的处理进度。提交意向不代表合作成立。</p>
    <el-empty v-if="!isLive" description="演示模式不展示真实意向" /><el-button
      v-else-if="!session.user"
      type="primary"
      @click="session.requireLogin(() => q.refetch())"
    >
      登录查看 </el-button
    ><el-skeleton v-else-if="q.isPending.value" :rows="5" animated /><el-result
      v-else-if="q.error.value"
      icon="warning"
      :title="q.error.value.message"
    >
      <template #extra>
        <el-button @click="q.refetch()">重试</el-button>
      </template> </el-result
    ><template v-else>
      <el-empty v-if="!q.data.value?.length" description="还没有提交承接意向" />
      <article v-for="i in q.data.value" :key="i.id">
        <div>
          <router-link :to="`/tasks/${i.taskNo}`">{{ i.title }}</router-link>
          <p>{{ names[i.status] }} · 第 {{ i.attemptNo }} 次提交</p>
          <p
            v-if="
              i.status === 'pending' &&
              i.confirmedVersion < i.confirmationVersion
            "
            class="changed"
          >
            任务条件已变化，请查看详情并决定是否继续申请。
          </p>
          <p
            v-if="
              i.status !== 'pending' &&
              i.confirmedVersion < i.confirmationVersion
            "
            class="changed"
          >
            任务条件已更新；原意向状态不自动变更，已确认承接仍按原条件沟通。
          </p>
          <p v-if="i.status === 'accepted'">
            承接条件：V{{ i.confirmedVersion }}，新版本不会自动覆盖原约定。
          </p>
        </div>
        <el-button
          v-if="i.status === 'pending'"
          :loading="busy"
          @click="withdraw(i.taskNo)"
        >
          撤回意向
        </el-button>
      </article>
    </template>
  </main>
</template>
<style scoped>
.my-interests {
  max-width: 1100px;
  margin: 32px auto;
  padding: 0 24px;
  min-height: 60vh;
}
.my-interests h1 {
  font-size: 28px;
}
.my-interests article {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border: 1px solid #e9eaee;
  border-radius: 10px;
  padding: 22px;
  margin: 16px 0;
  background: #fff;
}
.my-interests a {
  font-size: 18px;
  font-weight: 600;
}
.my-interests article p {
  font-size: 13px;
  color: #828794;
}
.my-interests .changed {
  color: #ef511e;
}
</style>
