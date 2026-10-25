<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import { ArrowUpRight } from "lucide-vue-next";
import { service } from "../../services";
import TaskBody from "./TaskBody.vue";
import InterestForm from "./InterestForm.vue";
import { useSession } from "../account/session";
const props = defineProps<{ id: string }>(),
  emit = defineEmits<{ close: [] }>(),
  router = useRouter(),
  session = useSession(),
  interest = ref(false),
  revision = ref(0);
const q = useQuery({
  queryKey: computed(() => ["opportunity", props.id]),
  queryFn: () => service.detail(props.id),
  enabled: computed(() => !!props.id),
});
const submitted = computed(() => {
  void revision.value;
  return !!session.user && service.hasInterest(props.id, session.user);
});
watch(
  () => props.id,
  () => (interest.value = false),
);
function participate() {
  session.requireLogin(() => (interest.value = true));
}
function detail() {
  const o = q.data.value;
  if (o) {
    router.push(`/${o.kind === "project" ? "projects" : "tasks"}/${o.id}`);
  }
}
</script>
<template>
  <el-drawer
    :model-value="!!id"
    title="机会预览"
    size="540px"
    append-to-body
    class="preview-drawer"
    @close="emit('close')"
  >
    <el-skeleton v-if="q.isPending.value" :rows="12" animated />
    <el-result
      v-else-if="q.error.value"
      icon="warning"
      :title="q.error.value.message"
    />
    <TaskBody v-else-if="q.data.value" :item="q.data.value" compact />
    <template #footer>
      <div class="drawer-footer">
        <button class="text-link" @click="detail">
          查看完整详情
          <ArrowUpRight :size="16" />
        </button>
        <el-button
          v-if="q.data.value?.kind === 'project'"
          type="primary"
          @click="detail"
        >
          查看项目任务
        </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="
            !q.data.value ||
            q.data.value.status === 'closed' ||
            submitted ||
            q.data.value.publisherId === session.user?.id
          "
          @click="participate"
        >
          {{
            submitted
              ? "已提交意向"
              : q.data.value?.status === "closed"
                ? "已停止招募"
                : q.data.value?.publisherId === session.user?.id
                  ? "我发布的任务"
                  : "表达承接意向"
          }}
        </el-button>
      </div>
    </template>
  </el-drawer>
  <InterestForm
    v-if="q.data.value"
    :item="q.data.value"
    :open="interest"
    @close="interest = false"
    @submitted="revision++"
  />
</template>
