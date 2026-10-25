<script setup lang="ts">
import { ref } from "vue";
import {
  MapPin,
  Clock,
  Users,
  Check,
  Image as ImageIcon,
} from "lucide-vue-next";
import PublicProjectTree from "./PublicProjectTree.vue";
import type { Opportunity } from "../../domain/models";
defineProps<{ item: Opportunity; compact?: boolean }>();
const viewer = ref(false);
</script>
<template>
  <div class="task-body">
    <span class="detail-category">
      {{ item.kind === "project" ? "协作项目" : item.category }} ·
      {{ item.status === "open" ? "正在招募" : "已停止招募" }}
    </span>
    <h1>{{ item.title }}</h1>
    <div class="detail-reward">
      {{ item.rewardPrefix ?? '¥' }} {{ item.reward }}
      <small v-if="item.unit">/ {{ item.unit }}</small>
    </div>
    <div class="detail-meta">
      <span>
        <MapPin :size="15" />
        {{ item.mode }}{{ item.mode!=='远程' && item.city ? ` · ${item.city}` : '' }}
      </span>
      <span v-if="item.duration">
        <Clock :size="15" />
        {{ item.duration }}
      </span>
      <span>
        <Users :size="15" />
        {{ item.capacity }} 人
      </span>
    </div>
    <section>
      <h2>{{ item.kind==='project' ? '项目介绍' : '任务介绍' }}</h2>
      <p class="pre-wrap">{{ item.summary }}</p>
    </section>
    <section v-if="item.image || item.video || item.media?.length">
      <h2>参考资料</h2>
      <button
        v-if="item.image"
        class="reference-image"
        aria-label="放大参考图片"
        @click="viewer = true"
      >
        <img :src="item.image" :alt="item.title" />
        <span>
          <ImageIcon :size="14" />
          点击查看大图
        </span>
      </button>
      <p v-if="item.video && item.source !== 'api'" class="muted">
        以下为原型播放样例，不是任务实拍素材。
      </p>
      <video
        v-if="item.video"
        :src="item.video"
        controls
        preload="metadata"
        :poster="item.image"
      />
      <div v-if="item.media?.length" class="public-media-gallery"><template v-for="media in item.media" :key="media.mediaNo"><el-image v-if="media.type==='image'" :src="media.url" :preview-src-list="item.media.filter(m=>m.type==='image').map(m=>m.url)" fit="contain" /><video v-else-if="media.url!==item.video" :src="media.url" controls preload="metadata" :poster="item.image" /></template></div>
    </section>
    <section v-if="item.budgetText || item.startDate || item.deadline"><h2>报酬与时间安排</h2><p v-if="item.budgetText">{{ item.budgetText }}</p><p v-if="item.startDate">开始日期：{{ item.startDate }}</p><p v-if="item.deadline">交付期限：{{ item.deadline }}</p></section>
    <section v-if="item.scope.length">
      <h2>工作范围</h2>
      <ol class="scope-list">
        <li v-for="(s, i) in item.scope" :key="i">
          <span>{{ String(i + 1).padStart(2, "0") }}</span>
          <p>{{ s }}</p>
        </li>
      </ol>
    </section>
    <section v-if="item.deliverables.length">
      <h2>交付成果</h2>
      <ul class="check-list">
        <li v-for="s in item.deliverables" :key="s">
          <Check :size="15" />
          {{ s }}
        </li>
      </ul>
    </section>
    <section v-if="item.acceptance.length">
      <h2>验收要求</h2>
      <ul class="check-list">
        <li v-for="s in item.acceptance" :key="s">
          <Check :size="15" />
          {{ s }}
        </li>
      </ul>
    </section>
    <section v-if="item.skills.length || item.newcomer || item.experience && item.experience!=='不限'">
      <h2>角色与技能</h2>
      <div class="skill-list">
        <span v-for="s in item.skills" :key="s">{{ s }}</span>
        <span v-if="item.experience && item.experience!=='不限'">{{ item.experience }}</span>
        <span v-if="item.newcomer">新人可参与</span>
      </div>
    </section>
    <section v-if="item.kind==='task' && item.project" class="publication-project"><h2>所属项目</h2><h3>{{ item.project.title || item.title }}</h3><p v-if="item.project.summary" class="pre-wrap">{{ item.project.summary }}</p><h2>项目任务</h2><PublicProjectTree v-if="item.project.tasks.length" :tasks="item.project.tasks" /><p v-else class="muted">暂未发布项目任务</p><router-link :to="`/projects/${item.projectId}`">查看完整项目 →</router-link></section>
    <section class="publisher-profile">
      <span class="avatar">{{ item.publisher.slice(0, 1) }}</span>
      <div>
        <strong>{{ item.publisher }}</strong>
        <p>项目发布者 · {{ item.createdAt }} 发布</p>
      </div>
    </section>
    <el-image-viewer
      v-if="viewer && item.image"
      :url-list="[item.image]"
      @close="viewer = false"
    />
  </div>
</template>

<style scoped>
.public-media-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.public-media-gallery .el-image{height:150px}
</style>
