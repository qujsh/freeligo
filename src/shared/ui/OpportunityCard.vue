<script setup lang="ts">
import { Heart, MapPin, Clock, ArrowUpRight, Play } from "lucide-vue-next";
import type { Opportunity } from "../../domain/models";
defineProps<{ item: Opportunity; favorite?: boolean }>();
defineEmits<{ open: [id: string]; favorite: [id: string] }>();
</script>
<template>
  <article class="opportunity-card" :class="{ 'has-image': !!item.image }">
    <button class="card-main" @click="$emit('open', item.id)">
      <div v-if="item.image" class="card-image">
        <img :src="item.image" :alt="item.title" loading="lazy" />
        <span v-if="item.video" class="video-mark">
          <Play :size="13" />
          查看视频
        </span>
      </div>
      <div class="card-content">
        <div class="card-category">
          {{ item.kind === "project" ? "协作项目" : item.category }}
          <span v-if="item.newcomer">新人可参与</span>
          <span v-if="item.status === 'closed'">已停止招募</span>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary }}</p>
        <div class="card-meta">
          <span>
            <MapPin :size="12" />
            {{ item.mode === "远程" ? "远程" : item.city }}
          </span>
          <span v-if="item.duration">
            <Clock :size="12" />
            {{ item.duration }}
          </span>
        </div>
        <div class="card-price">
          {{ item.rewardPrefix ?? '¥' }} {{ item.reward }}
          <small v-if="item.unit">/ {{ item.unit }}</small>
        </div>
      </div>
    </button>
    <div class="card-bottom">
      <span class="publisher-avatar">{{ item.publisher.slice(0, 1) }}</span>
      <span>{{ item.publisher }}</span>
      <button
        class="favorite"
        :class="{ selected: favorite }"
        :aria-label="favorite ? '取消收藏' : '收藏机会'"
        :aria-pressed="favorite"
        @click="$emit('favorite', item.id)"
      >
        <Heart :size="16" :fill="favorite ? 'currentColor' : 'none'" />
      </button>
      <ArrowUpRight :size="15" class="card-arrow" />
    </div>
  </article>
</template>
