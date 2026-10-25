<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserRound, Bookmark, Clock, FileText, Laptop, Palette, Monitor, CalendarDays, CircleHelp, ArrowRight } from 'lucide-vue-next';
import type { Opportunity } from '../../../domain/models';
import { useSession } from '../../account/session';
defineProps<{ viewed: Opportunity[] }>();
defineEmits<{ open: [id: string] }>();
const router = useRouter(), session = useSession();
const preferencesOpen = ref(false), historyOpen = ref(false), helpOpen = ref(false);
const preferences = ref(['技术与数据', '设计创意', '浏览优先', '周末可参与']);
const options = [
  { label: '技术与数据', icon: Laptop }, { label: '设计创意', icon: Palette },
  { label: '浏览优先', icon: Monitor }, { label: '周末可参与', icon: CalendarDays },
];
function navigate(path: string) { session.requireLogin(() => router.push(path)); }
</script>
<template>
  <section class="task-assistant">
    <h2>我的任务助手</h2>
    <div class="assistant-shortcuts">
      <button @click="navigate('/my-interests')"><UserRound /><span>我的意向</span></button>
      <button @click="navigate('/favorites')"><Bookmark /><span>我的收藏</span></button>
      <button @click="historyOpen = true"><Clock /><span>浏览记录</span></button>
      <button @click="navigate('/publisher')"><FileText /><span>我的发布</span></button>
    </div>
    <div class="assistant-section">
      <div class="assistant-section-heading"><h3>我的找事偏好</h3><button @click="preferencesOpen = true">调整</button></div>
      <div class="assistant-preferences">
        <span v-for="option in options.filter(o => preferences.includes(o.label))" :key="option.label"><component :is="option.icon" :size="19" />{{ option.label }}</span>
      </div>
      <p class="assistant-note">原型偏好示例，暂不影响“为你发现”的排序。</p>
    </div>
    <div class="assistant-section">
      <div class="assistant-section-heading"><h3>最近看过</h3><button @click="historyOpen = true">全部 <ArrowRight :size="14" /></button></div>
      <button v-for="item in viewed.slice(0, 2)" :key="item.id" class="assistant-recent" @click="$emit('open', item.id)"><strong>{{ item.title }}</strong><span>{{ item.rewardPrefix ?? '¥' }}{{ item.reward }}<small> /{{ item.unit }} · {{ item.mode === '远程' ? '远程' : item.city }}</small></span></button>
      <p v-if="!viewed.length" class="assistant-note assistant-empty">还没有浏览记录，点击任务看看吧。</p>
    </div>
    <button class="assistant-help" @click="helpOpen = true"><CircleHelp :size="21" />第一次承接？了解流程<ArrowRight :size="16" /></button>
  </section>
  <el-dialog v-model="preferencesOpen" title="调整找事偏好" width="min(440px, 92vw)">
    <p>当前仅用于体验偏好设置，不影响任务推荐。</p>
    <el-checkbox-group v-model="preferences"><el-checkbox v-for="option in options" :key="option.label" :value="option.label">{{ option.label }}</el-checkbox></el-checkbox-group>
    <template #footer><el-button type="primary" @click="preferencesOpen = false">完成</el-button></template>
  </el-dialog>
  <el-dialog v-model="historyOpen" title="本次首页浏览记录" width="min(520px, 92vw)">
    <p v-if="!viewed.length">还没有浏览记录，打开首页任务预览后会出现在这里。</p>
    <button v-for="item in viewed" :key="item.id" class="assistant-recent" @click="historyOpen = false; $emit('open', item.id)"><strong>{{ item.title }}</strong><span>{{ item.rewardPrefix ?? '¥' }}{{ item.reward }} /{{ item.unit }}</span></button>
    <p class="assistant-note">仅记录当前首页会话内打开的任务，刷新后清空。</p>
  </el-dialog>
  <el-dialog v-model="helpOpen" title="第一次承接？从这里开始" width="min(520px, 92vw)">
    <ol class="assistant-guide"><li>浏览任务，确认工作范围、报酬与时间安排。</li><li>表达承接意向，填写相关经验与可以开始的时间。</li><li>等待发布者选择；提交意向不代表已确认承接。</li></ol>
    <p class="assistant-note">当前为本机交互原型，沟通、支付与交付验收尚未接入。</p>
  </el-dialog>
</template>
