<script setup lang="ts">
import type { Opportunity } from "../../domain/models";
defineProps<{ item: Opportunity }>();
const names = { cash: "现金回报", goods: "物品交换", service: "服务交换" };
const amount = (v: number | null) =>
  v?.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) ?? "未填写";
</script>
<template>
  <div class="reward-content">
    <h2>回报内容</h2>
    <template v-if="item.details?.rewards.length">
      <section v-for="(r, i) in item.details.rewards" :key="i">
        <small>{{ names[r.type] }}</small>
        <h3>{{ r.title }}</h3>
        <strong v-if="r.type === 'cash'"
          >¥{{ amount(r.amountMin)
          }}<template v-if="r.pricing === 'range'"
            >–{{ amount(r.amountMax) }}</template
          ><span> / {{ r.unit }}</span></strong
        >
        <p v-else-if="r.type === 'goods'">
          {{ r.quantity }} {{ r.unit }} · {{ r.condition }}
        </p>
        <p v-if="r.description">{{ r.description }}</p>
        <p v-if="r.handover" class="muted">{{ r.handover }}</p>
      </section> </template
    ><strong v-else
      >{{ item.rewardPrefix ?? "¥" }} {{ item.reward }}
      <span v-if="item.unit">/ {{ item.unit }}</span></strong
    >
    <p v-if="item.budgetText">{{ item.budgetText }}</p>
  </div>
</template>
<style scoped>
.reward-content h2 {
  font-size: 16px;
  margin: 0 0 12px;
}
.reward-content section {
  padding: 12px 0;
  border-bottom: 1px solid #eceef1;
}
.reward-content small {
  color: #858996;
  font-size: 12px;
}
.reward-content h3 {
  overflow-wrap: anywhere;
  font-size: 17px;
  margin: 7px 0;
}
.reward-content strong {
  font-size: 23px;
  color: var(--primary, #f4511e);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.reward-content strong span {
  font-size: 13px;
  color: #767b86;
  font-weight: 400;
}
.reward-content p {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 8px 0;
}
</style>
