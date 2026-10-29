<script setup lang="ts">
import { computed } from "vue";
import type { ProjectTask } from "../../domain/models";
const props = defineProps<{ tasks: ProjectTask[] }>();
const overview = computed(() => props.tasks.length === 1 && props.tasks[0]?.type === 'module' && props.tasks[0].children.length ? props.tasks[0] : undefined);
const groups = computed(() => overview.value?.children ?? props.tasks);
function rows(tasks: ProjectTask[], prefix: string): { task: ProjectTask; number: string }[] {
 return tasks.flatMap((task, index) => { const number = `${prefix}.${index + 1}`; return [{ task, number }, ...rows(task.children, number)]; });
}
const count = computed(() => groups.value.reduce((sum, group, index) => sum + (group.children.length ? rows(group.children, String(index + 1)).filter(row => !row.task.children.length).length : 1), 0));
</script>
<template>
 <div class="scope-reader">
  <div class="scope-count">{{ groups.length }} 个工作分组 · {{ count }} 项具体工作</div>
  <div class="scope-groups">
   <div v-for="(group, index) in groups" :key="group.id" class="scope-group">
    <div class="scope-header"><span class="scope-number">{{ String(index + 1).padStart(2, '0') }}</span><h4>{{ group.name }}</h4></div>
    <div v-for="row in rows(group.children, String(index + 1))" :key="row.task.id" class="scope-row">
     <span class="scope-index">{{ row.number }}</span><strong class="scope-name">{{ row.task.name }}</strong>
    </div>
   </div>
  </div>
 </div>
</template>
<style scoped>

.scope-reader { margin-top: 12px; }
.scope-count { display: none; }
.scope-groups { display: grid; gap: 18px; }
.scope-group { min-width: 0; }
.scope-header { display: flex; align-items: baseline; gap: 9px; margin-bottom: 7px; }
.scope-header h4 { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.7; overflow-wrap: anywhere; }
.scope-number { color: var(--scope-accent, #eb633b); background: var(--scope-tint, #fff2eb); border-radius: 4px; padding: 2px 5px; font-size: 11px; line-height: 1.7; font-weight: 600; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.scope-row { margin: 4px 0 4px 32px; padding-left: 12px; position: relative; font-size: 14px; line-height: 1.75; overflow-wrap: anywhere; }
.scope-row::before { content: '·'; position: absolute; left: 0; color: #a0a7b1; }
.scope-index { display: none; }
.scope-name { font-weight: 500; color: #414b59; }
</style>
