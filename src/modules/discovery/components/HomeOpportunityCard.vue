<script setup lang="ts">
import { Bookmark, Clock, MapPin, Monitor, Play } from "lucide-vue-next";
import type { Opportunity } from "../../../domain/models";
defineProps<{ item: Opportunity; favorite: boolean }>();
defineEmits<{ open: [id: string]; favorite: [id: string] }>();
</script>
<template>
  <article class="home-opportunity-card">
    <button class="home-card-main" @click="$emit('open', item.id)">
      <div v-if="item.image" class="home-card-picture">
        <img v-if="item.image" :src="item.image" :alt="item.title" />
        <span v-if="item.video" class="home-video-play" aria-label="含示例视频">
          <Play :size="27" fill="currentColor" />
        </span>
      </div>
      <div class="home-card-copy">
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary }}</p>
        <div class="home-card-tags">
          <span
            v-for="tag in (
              item.tags ?? [item.category, item.mode, item.skills[0]]
            ).filter(Boolean)"
            :key="tag"
          >
            {{ tag }}
          </span>
        </div>
        <div class="home-card-foot">
          <span class="home-card-reward">
            {{ item.rewardPrefix ?? '¥' }}{{ item.reward }}
            <small v-if="item.unit">/{{ item.unit }}</small>
          </span>
          <span class="home-card-location">
            <Monitor v-if="item.mode === '远程'" :size="13" />
            <MapPin v-else :size="13" />
            {{ item.mode === "远程" ? "远程" : `${item.city}·线下` }}
          </span>
          <span v-if="item.duration" class="home-card-duration">
            <Clock :size="13" />
            预计投入 {{ item.duration }}
          </span>
        </div>
      </div>
    </button>
    <button
      class="home-bookmark"
      :class="{ selected: favorite }"
      :aria-label="favorite ? '取消收藏' : '收藏机会'"
      :aria-pressed="favorite"
      @click="$emit('favorite', item.id)"
    >
      <Bookmark :size="18" :fill="favorite ? 'currentColor' : 'none'" />
    </button>
  </article>
</template>
