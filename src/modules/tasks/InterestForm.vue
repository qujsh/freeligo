<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import type { Opportunity } from "../../domain/models";
import { service } from "../../services";
import { useSession } from "../account/session";
const props = defineProps<{ item: Opportunity; open: boolean }>(),
  emit = defineEmits<{ close: []; submitted: [] }>(),
  session = useSession(),
  client = useQueryClient(),
  busy = ref(false),
  error = ref(""),
  success = ref(false);
const form = reactive({
  experience: "",
  portfolio: "",
  startDate: "",
  question: "",
  quote: "",
});
watch(
  () => props.item.id,
  () => {
    Object.assign(form, {
      experience: "",
      portfolio: "",
      startDate: "",
      question: "",
      quote: "",
    });
    success.value = false;
    error.value = "";
  },
);
async function submit() {
  error.value = "";
  if (!form.experience.trim() || !form.startDate) {
    error.value = "请填写相关经验和可开始时间";
    return;
  }
  if (form.portfolio && !/^https?:\/\//.test(form.portfolio)) {
    error.value = "作品链接请使用 http:// 或 https:// 地址";
    return;
  }
  session.requireLogin(async () => {
    busy.value = true;
    try {
      await service.submit(props.item.id, session.user!, { ...form });
      success.value = true;
      emit("submitted");
      await client.invalidateQueries();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  });
}
</script>
<template>
  <el-dialog
    :model-value="open"
    :title="success ? '意向已提交' : '表达承接意向'"
    width="min(570px,94vw)"
    :close-on-click-modal="false"
    append-to-body
    @close="emit('close')"
  >
    <el-result
      v-if="success"
      icon="success"
      title="让合适的合作，从这里开始"
      sub-title="模拟意向已保存到本机。正式产品由项目发布者选择承接人。"
    >
      <template #extra>
        <el-button type="primary" @click="emit('close')">
          继续发现机会
        </el-button>
        <el-button
          @click="
            $router.push('/my-interests');
            emit('close');
          "
        >
          我的意向
        </el-button>
      </template>
    </el-result>
    <template v-else>
      <div class="interest-task">
        <span>{{ item.category }}</span>
        <h3>{{ item.title }}</h3>
        <strong>¥ {{ item.reward }} / {{ item.unit }}</strong>
      </div>
      <form @submit.prevent="submit">
        <label>
          相关经验 / 为什么你适合
          <em>*</em>
          <el-input
            v-model="form.experience"
            aria-label="相关经验"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="介绍与这件事相关的经历、技能，或你的思路"
          />
        </label>
        <label>
          作品链接
          <small>选填</small>
          <el-input
            v-model="form.portfolio"
            aria-label="作品链接"
            placeholder="https://"
          />
        </label>
        <label>
          可开始时间
          <em>*</em>
          <el-date-picker
            v-model="form.startDate"
            aria-label="可开始时间"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
          />
        </label>
        <label>
          需要补充确认的问题
          <small>选填</small>
          <el-input
            v-model="form.question"
            type="textarea"
            :rows="2"
            placeholder="把你想提前了解的事情写在这里"
          />
        </label>
        <label v-if="item.reward === '协商报价'">
          你的报价
          <el-input v-model="form.quote" />
        </label>
        <el-alert v-if="error" :title="error" type="error" :closable="false" />
        <div class="form-footnote">
          提交意向不代表承接成功，最终由项目发布者确认。
        </div>
        <div class="dialog-actions">
          <el-button @click="emit('close')">再想想</el-button>
          <el-button type="primary" native-type="submit" :loading="busy">
            提交意向
          </el-button>
        </div>
      </form>
    </template>
  </el-dialog>
</template>
