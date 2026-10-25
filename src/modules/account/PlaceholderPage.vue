<script setup lang="ts">
import { useRoute } from "vue-router";
const route = useRoute();
</script>
<template>
  <main class="placeholder-page">
    <el-result
      icon="info"
      :title="
        route.path === '/my-interests' ? '我的意向，稍后见' : '这个页面暂不存在'
      "
      :sub-title="
        route.path === '/my-interests'
          ? '入口已保留。本期暂不提供意向状态管理、撤回、修改和重新申请。'
          : '你可以回到机会大厅继续浏览。'
      "
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/opportunities')">
          继续发现机会
        </el-button>
        <el-button @click="$router.push('/publisher')">发布者工作台</el-button>
      </template>
    </el-result>
  </main>
</template>
