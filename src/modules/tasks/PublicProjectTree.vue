<script setup lang="ts">
import type { ProjectTask } from "../../domain/models";
defineProps<{ tasks: ProjectTask[] }>();
const labels = {
  module: "模块",
  feature: "功能",
  work: "任务",
  subtask: "子任务",
};
</script>
<template>
  <div class="publication-project-tree">
    <details v-for="task in tasks" :key="task.id" open>
      <summary>
        <span>{{ labels[task.type] }}</span
        ><strong>{{ task.name }}</strong>
      </summary>
      <p v-if="task.description">{{ task.description }}</p>
      <p
        v-if="task.role || task.startDate || task.endDate"
        class="publication-node-meta"
      >
        {{
          [
            task.role,
            task.startDate && `开始 ${task.startDate}`,
            task.endDate && `结束 ${task.endDate}`,
          ]
            .filter(Boolean)
            .join(" · ")
        }}
      </p>
      <PublicProjectTree v-if="task.children.length" :tasks="task.children" />
    </details>
  </div>
</template>
<style scoped>
.publication-project-tree {
  display: grid;
  gap: 10px;
}
.publication-project-tree details {
  border: 1px solid #e4e8f0;
  border-radius: 6px;
  padding: 12px;
  min-width: 0;
}
.publication-project-tree summary {
  cursor: pointer;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.publication-project-tree summary span {
  font-size: 11px;
  color: #697386;
  margin-right: 10px;
}
.publication-project-tree strong {
  font-size: 14px;
}
.publication-project-tree p {
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 8px 0;
}
.publication-project-tree .publication-project-tree {
  margin-top: 10px;
}
.publication-node-meta {
  color: #697386;
}
</style>
