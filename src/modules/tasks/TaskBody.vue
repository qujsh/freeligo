<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { MapPin, Clock, Users } from "lucide-vue-next";
import PublicProjectTree from "./PublicProjectTree.vue";
import RewardContent from "./RewardContent.vue";
import type { Opportunity } from "../../domain/models";
const props = defineProps<{ item: Opportunity; compact?: boolean }>();
const expanded = ref(false);
watch(
  () => props.item.id,
  () => (expanded.value = false),
);
const nodes = computed(() => props.item.project?.tasks ?? []);
const visibleNodes = computed(() =>
  nodes.value.slice(
    0,
    props.compact ? 2 : expanded.value ? nodes.value.length : 3,
  ),
);
const images = computed(
  () =>
    props.item.media?.filter((m) => m.type === "image").map((m) => m.url) ??
    (props.item.image ? [props.item.image] : []),
);
const broken = ref<string[]>([]);
watch(
  () => props.item.id,
  () => (broken.value = []),
);
const states: Record<string, string> = {
  open: "招募中",
  paused: "暂停招募",
  full: "名额已满",
  ended: "招募已结束",
};
</script>
<template>
  <div class="task-body complete-task-body" :class="{ compact }">
    <span class="detail-category"
      >{{ item.category }} ·
      {{
        states[item.recruitmentStatus || ""] ||
        (item.status === "open" ? "招募中" : "已停止招募")
      }}</span
    >
    <h1>{{ item.title }}</h1>
    <p class="task-summary">{{ item.summary }}</p>
    <div class="skill-list">
      <span v-for="skill in item.skills" :key="skill">{{ skill }}</span>
    </div>
    <div class="detail-meta">
      <span
        ><MapPin :size="15" />{{ item.mode
        }}{{ item.city ? " · " + item.city : "" }}</span
      ><span v-if="item.duration"
        ><Clock :size="15" />预计投入 {{ item.duration }}</span
      ><span><Users :size="15" />招募 {{ item.capacity }} 人</span>
    </div>
    <section v-if="item.details?.goal">
      <h2>任务目标</h2>
      <p>{{ item.details.goal }}</p>
    </section>
    <section v-if="nodes.length || item.scope.length">
      <h2>{{ compact ? "主要工作" : "工作范围" }}</h2>
      <template v-if="nodes.length">
        <p v-if="!compact" class="scope-note">
          以下工作整体招募，不单独计价或分配名额。
        </p>
        <ul v-if="compact" class="preview-work">
          <li v-for="n in visibleNodes" :key="n.id">{{ n.name }}</li>
          <li v-if="nodes.length > 2">
            另有 {{ nodes.length - 2 }} 个模块，完整详情中查看
          </li>
        </ul>
        <PublicProjectTree v-else :tasks="visibleNodes" /><el-button
          v-if="!compact && nodes.length > 3"
          link
          type="primary"
          @click="expanded = !expanded"
        >
          {{ expanded ? "收起工作范围" : `展开全部 ${nodes.length} 个模块` }}
        </el-button>
      </template>
      <ul v-else>
        <li
          v-for="(s, i) in compact ? item.scope.slice(0, 3) : item.scope"
          :key="i"
        >
          {{ s }}
        </li>
      </ul>
    </section>
    <RewardContent v-if="compact" :item="item" />
    <template v-if="!compact">
      <section v-if="item.media?.length || item.image">
        <h2>参考素材</h2>
        <p class="scope-note">参考素材不代替最终交付要求。</p>
        <div class="reference-gallery">
          <template
            v-for="m in item.media?.length
              ? item.media
              : images.map((url, i) => ({
                  url,
                  type: 'image',
                  mediaNo: String(i),
                }))"
            :key="m.mediaNo"
          >
            <p
              v-if="
                broken.includes(m.mediaNo) ||
                ('available' in m && m.available === false)
              "
              role="status"
              class="media-error"
            >
              该素材暂时无法加载
            </p>
            <el-image
              v-else-if="m.type === 'image'"
              :src="m.url"
              :preview-src-list="images"
              fit="cover"
              @error="broken.push(m.mediaNo)"
            />
            <a
              v-else-if="m.type === 'file'"
              class="reference-file"
              :href="m.url"
              target="_blank"
              rel="noopener noreferrer"
              download
              >{{
                "originalName" in m
                  ? m.originalName || "下载参考文件"
                  : "下载参考文件"
              }}
              ↗</a
            >
            <video
              v-else
              :src="m.url"
              controls
              preload="metadata"
              :poster="item.image"
              @error="broken.push(m.mediaNo)"
            />
          </template>
        </div>
      </section>
      <section v-if="item.deliverables.length">
        <h2>交付成果</h2>
        <ul class="deliverable-list">
          <li v-for="(d, i) in item.deliverables" :key="i">{{ d }}</li>
        </ul>
      </section>
      <details v-if="item.acceptance.length" class="acceptance">
        <summary>验收要求 · {{ item.acceptance.length }} 项</summary>
        <ul>
          <li v-for="(a, i) in item.acceptance" :key="i">{{ a }}</li>
        </ul>
      </details>
    </template>
    <section
      v-if="
        item.startDate ||
        item.deadline ||
        item.duration ||
        item.details?.collaboration
      "
    >
      <h2>时间与协作</h2>
      <p v-if="item.startDate">可开始日期：{{ item.startDate }}</p>
      <p v-if="item.deadline">交付期限：{{ item.deadline }}</p>
      <p v-if="item.duration">预计投入：{{ item.duration }}</p>
      <p v-if="item.details?.collaboration">{{ item.details.collaboration }}</p>
    </section>
    <section
      v-if="
        !compact &&
        item.project?.summary &&
        item.project.summary !== item.summary
      "
    >
      <h2>项目介绍</h2>
      <h3>{{ item.project.title }}</h3>
      <p>{{ item.project.summary }}</p>
    </section>
    <p v-if="compact" class="publisher-line">发布人：{{ item.publisher }}</p>
  </div>
</template>
<style scoped>
.complete-task-body h1 {
  overflow-wrap: anywhere;
  font-family: inherit;
  font-size: clamp(24px, 2.2vw, 34px);
  line-height: 1.4;
  letter-spacing: 0;
  margin: 12px 0;
}
.task-summary {
  font-size: 16px;
  color: #666c78;
  line-height: 1.8;
  white-space: pre-wrap;
}
.complete-task-body section {
  margin-top: 26px;
}
.complete-task-body section h2 {
  font-size: 17px;
  border-left: 3px solid #f4511e;
  padding-left: 10px;
  margin: 0 0 12px;
}
.complete-task-body section p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
  font-size: 14px;
}
.scope-note,
.publisher-line {
  color: #858996;
  font-size: 12px !important;
}
.reference-gallery {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.reference-gallery .el-image,
.reference-gallery video {
  width: 100%;
  height: 155px;
  border-radius: 8px;
  object-fit: cover;
}
.reference-file {
  border: 1px solid #e9eaee;
  border-radius: 8px;
  padding: 18px;
  font-size: 14px;
  overflow-wrap: anywhere;
  align-self: start;
  color: #f4511e;
}
.media-error {
  background: #f7f8fa;
  padding: 20px;
  border-radius: 8px;
}
.deliverable-list,
.acceptance ul,
.preview-work {
  padding-left: 22px;
  font-size: 14px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.acceptance {
  padding: 14px;
  border: 1px solid #e9eaee;
  border-radius: 8px;
  margin-top: 24px;
}
.acceptance summary {
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}
.compact h1 {
  font-size: 24px;
}
.compact section {
  margin-top: 20px;
}
.compact .task-summary {
  font-size: 14px;
}
.skill-list {
  margin: 14px 0;
}
.detail-meta {
  margin-top: 14px;
}
@media (max-width: 760px) {
  .reference-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .reference-gallery .el-image,
  .reference-gallery video {
    height: 130px;
  }
}
</style>
