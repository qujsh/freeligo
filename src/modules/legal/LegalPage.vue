<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { legal } from "../../services/legal";
import { legalPreview } from "./legalPreview";
const route = useRoute();
const kind = computed(() => route.params.kind === "terms" ? "TERMS" : route.params.kind === "privacy" ? "PRIVACY" : "INVALID");
const version = computed(() => route.params.version ? Number(route.params.version) : null);
const title = computed(() => kind.value === "TERMS" ? "用户协议" : "隐私政策");
const query = useQuery({ queryKey: computed(() => ["legal", kind.value, version.value]), queryFn: async ({ signal }) => {
  if (kind.value === "INVALID" || (version.value !== null && (!Number.isInteger(version.value) || version.value < 1))) throw new Error("协议地址无效");
  if (version.value !== null) return legal.document(kind.value, version.value, signal);
  return (await legal.current(signal)).find(item => item.kind === kind.value)!;
}, retry: false });
const srcdoc = computed(() => query.data.value ? legalPreview(query.data.value.html) : "");
</script>
<template>
  <main class="legal-page">
    <header><router-link to="/">自由人联合体</router-link><span>{{ title }}<template v-if="query.data.value"> · V{{ query.data.value.version }}</template></span></header>
    <p v-if="query.isPending.value" role="status">正在加载协议…</p>
    <div v-else-if="query.isError.value" role="alert"><p>{{ query.error.value?.message }}</p><button @click="query.refetch()">重试</button></div>
    <iframe v-else :title="title" :srcdoc="srcdoc" sandbox="" referrerpolicy="no-referrer" />
  </main>
</template>
<style scoped>
.legal-page{max-width:1000px;margin:0 auto;padding:20px}.legal-page header{display:flex;gap:20px;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid #eee;color:#555}.legal-page header a{color:#e95520}.legal-page iframe{display:block;width:100%;height:calc(100dvh - 100px);border:0;background:white}.legal-page button{border:1px solid #ddd;padding:8px 16px;background:white;border-radius:8px}
</style>
