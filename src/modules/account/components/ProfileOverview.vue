<script setup lang="ts">
import { Settings, ArrowLeft } from "lucide-vue-next";
import MemberAvatar from "./MemberAvatar.vue";
defineProps<{
  name?: string;
  bio?: string;
  avatar?: string;
  favorites: boolean;
  live: boolean;
  loading: boolean;
  error?: string;
}>();
defineEmits<{
  mine: [];
  favorites: [];
  edit: [];
  settings: [];
  login: [];
  retry: [];
}>();
</script>
<template>
  <section class="member-overview">
    <router-link to="/" class="member-back"
      >
<ArrowLeft :size="16" />返回发现
</router-link
    >
    <div class="member-overview__identity">
      <MemberAvatar :src="avatar" :name="name" :size="120" />
      <div class="member-overview__copy">
        <h1>{{ name || "我的主页" }}</h1>
        <p>
          {{
            loading
              ? "正在读取个人资料…"
              : bio ||
                (name ? "还没有填写个人简介" : "写下想法，收藏值得回看的内容。")
          }}
        </p>
        <button v-if="error" class="member-link" @click="$emit('retry')">
          资料读取失败，点击重试
        </button>
      </div>
      <div class="member-overview__actions">
        <button
          v-if="name && live"
          class="member-outline"
          :disabled="loading || !!error"
          @click="$emit('edit')"
        >
          编辑资料
</button
        ><button
          v-else-if="live"
          class="member-outline"
          @click="$emit('login')"
        >
          登录账号
</button
        ><button class="member-outline" @click="$emit('settings')">
          <Settings :size="18" />设置
        </button>
      </div>
    </div>
    <nav class="member-tabs" aria-label="个人内容">
      <button
        :class="{ active: !favorites }"
        :aria-current="!favorites ? 'page' : undefined"
        @click="$emit('mine')"
      >
        我的笔记
</button
      ><button
        v-if="live"
        :class="{ active: favorites }"
        :aria-current="favorites ? 'page' : undefined"
        @click="$emit('favorites')"
      >
        我的收藏
      </button>
    </nav>
  </section>
</template>
<style scoped>
.member-overview {
  padding-top: 32px;
}
.member-overview > .member-back {
  display: none;
}
.member-overview__identity {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 16px 32px 32px;
  border-bottom: 1px solid #eeeff0;
}
.member-overview__copy {
  min-width: 0;
  flex: 1;
}
.member-overview__copy h1 {
  font-size: 32px;
  line-height: 1.4;
  font-weight: 650;
  margin: 0 0 10px;
  overflow-wrap: anywhere;
}
.member-overview__copy p {
  color: #4b5059;
  font-size: 17px;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.member-overview__actions {
  margin-left: auto;
  display: flex;
  gap: 16px;
  align-self: center;
}
.member-tabs {
  display: flex;
  gap: 42px;
  border-bottom: 1px solid #dfe1e4;
  margin-top: 8px;
}
.member-tabs > button {
  position: relative;
  border: 0;
  background: none;
  font-size: 19px;
  font-weight: 600;
  color: #777c85;
  padding: 23px 5px 20px;
  cursor: pointer;
}
.member-tabs > button.active {
  color: #17191f;
}
.member-tabs > button.active::after {
  content: "";
  position: absolute;
  left: 5px;
  right: 5px;
  bottom: -1px;
  height: 3px;
  background: var(--notes-accent);
}
.member-tabs span {
  font-size: 11px;
  font-weight: 400;
  color: #969aa1;
  margin-left: 7px;
}
@media (max-width: 700px) {
  .member-overview {
    padding-top: 14px;
  }
  .member-overview > .member-back {
    display: inline-flex;
    margin-bottom: 22px;
  }
  .member-overview__identity {
    padding: 0 2px 25px;
    gap: 18px;
    flex-wrap: wrap;
  }
  .member-overview__identity {
    --member-avatar-size: 78px;
  }
  .member-overview__copy h1 {
    font-size: 25px;
    margin-bottom: 5px;
  }
  .member-overview__copy p {
    font-size: 14px;
  }
  .member-overview__actions {
    width: 100%;
    margin-left: 96px;
    gap: 10px;
  }
  .member-tabs {
    gap: 25px;
  }
  .member-tabs > button {
    font-size: 17px;
  }
}
</style>
