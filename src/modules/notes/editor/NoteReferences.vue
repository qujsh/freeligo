<script setup lang="ts">
import { ref, computed } from "vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { ownedNotes } from "../../../services/ownedNotes";
import { useSession } from "../../account/session";
const props = defineProps<{
  modelValue: string[];
  disabled: boolean;
  recordNo?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();
const session = useSession(),
  keyword = ref("");
const query = useInfiniteQuery({
  queryKey: computed(() => [
    "owned-notes",
    session.user?.id,
    "reference-search",
    keyword.value,
  ]),
  queryFn: ({ pageParam, signal }) =>
    ownedNotes.list(keyword.value, pageParam, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page) =>
    page.hasMore ? (page.nextCursor ?? undefined) : undefined,
  enabled: computed(() => !!session.user),
  retry: false,
});
const options = computed(
  () =>
    query.data.value?.pages
      .flatMap((page) => page.items)
      .filter((note) => note.id !== props.recordNo) || [],
);
</script>
<template>
  <section class="composer-references">
    <label>关联笔记 <small>可选，仅选择本人正式笔记</small></label>
    <el-select
      :model-value="modelValue"
      :disabled="disabled"
      multiple
      filterable
      remote
      :remote-method="(value: string) => (keyword = value)"
      :loading="query.isFetching.value"
      placeholder="搜索并选择要关联的笔记"
      :multiple-limit="50"
      style="width: 100%"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <el-option
        v-for="note in options"
        :key="note.id"
        :label="note.title"
        :value="note.id"
      />
      <template #footer
        ><button
          v-if="query.hasNextPage.value"
          type="button"
          :disabled="query.isFetchingNextPage.value"
          @click="query.fetchNextPage()"
        >
          加载更多关联候选</button
        ><button
          v-if="query.isError.value"
          type="button"
          @click="query.refetch()"
        >
          读取失败，重试
        </button></template
      >
    </el-select>
  </section>
</template>
<style scoped>
.composer-references label {
  display: block;
  margin: 0 0 8px;
  font-size: 14px;
  color: #535860;
}
.composer-references small {
  font-size: 12px;
  font-weight: 400;
  color: #92969c;
  margin-left: 8px;
}
</style>
