<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { ArrowLeft, ArrowRight, Check } from "lucide-vue-next";
import { ElMessage, ElMessageBox } from "element-plus";
import { useSession } from "../account/session";
import { service } from "../../services";
import type { PublishInput } from "../../domain/models";
const session = useSession(),
  router = useRouter(),
  client = useQueryClient(),
  step = ref(0),
  busy = ref(false),
  dirty = ref(false),
  error = ref(""),
  done = ref("");
const initial = {
  title: "",
  summary: "",
  category: "设计创意",
  mode: "远程" as const,
  city: "",
  duration: "",
  reward: "",
  unit: "项目",
  skills: [] as string[],
  capacity: 1,
  newcomer: false,
  scope: [] as string[],
  deliverables: [] as string[],
  acceptance: [] as string[],
};
const form = reactive<PublishInput>({ ...initial }),
  scope = ref(""),
  deliverables = ref(""),
  acceptance = ref(""),
  skills = ref("");
const storageKey = () =>
  `freeligo.publish-draft.${session.user?.id ?? "anonymous"}`;
function restore() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const d = JSON.parse(raw);
      Object.assign(form, d.form);
      scope.value = d.scope ?? "";
      deliverables.value = d.deliverables ?? "";
      acceptance.value = d.acceptance ?? "";
      skills.value = d.skills ?? "";
    }
  } catch {
    /* ignore invalid demo draft */
  }
}
restore();
watch(() => session.user?.id, restore);
watch(
  [form, scope, deliverables, acceptance, skills],
  () => (dirty.value = true),
  { deep: true },
);
onBeforeRouteLeave(async () => {
  if (dirty.value && !done.value) {
    try {
      await ElMessageBox.confirm(
        "当前需求尚未保存，确认离开？",
        "未保存的草稿",
      );
    } catch {
      return false;
    }
  }
});
function saveDraft() {
  session.requireLogin(() => {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        form,
        scope: scope.value,
        deliverables: deliverables.value,
        acceptance: acceptance.value,
        skills: skills.value,
      }),
    );
    dirty.value = false;
    ElMessage.success("演示草稿已保存到本机");
  });
}
function next() {
  error.value = "";
  if (step.value === 0 && (!form.title.trim() || !form.summary.trim())) {
    error.value = "请填写需求标题和说明";
    return;
  }
  if (step.value === 1 && (!scope.value.trim() || !deliverables.value.trim())) {
    error.value = "请填写工作范围和交付要求";
    return;
  }
  if (form.mode !== "远程" && !form.city.trim()) {
    error.value = "现场或混合协作需要填写城市";
    return;
  }
  step.value++;
}
async function publish() {
  session.requireLogin(async () => {
    busy.value = true;
    error.value = "";
    try {
      const result = await service.publish(
        {
          ...form,
          city: form.mode === "远程" ? "不限城市" : form.city,
          duration: form.duration || "协商确定",
          reward: form.reward || "协商报价",
          skills: skills.value
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter(Boolean),
          scope: scope.value.split("\n").filter(Boolean),
          deliverables: deliverables.value.split("\n").filter(Boolean),
          acceptance: acceptance.value.split("\n").filter(Boolean),
        },
        session.user!,
      );
      done.value = result.id;
      dirty.value = false;
      localStorage.removeItem(storageKey());
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
  <main class="publish-page">
    <router-link class="back-link" to="/opportunities">
      <ArrowLeft :size="15" />
      返回机会大厅
    </router-link>
    <header class="publish-heading">
      <div>
        <h1>把想做的事，变成一次合作。</h1>
        <p>需求越清楚，越容易遇见合适的人。</p>
      </div>
      <el-button v-if="!done" @click="saveDraft">保存草稿</el-button>
    </header>
    <el-result
      v-if="done"
      icon="success"
      title="你的演示需求已发布"
      sub-title="本机已生成一个项目及一个关联任务；正式拆解和发布规则将在接口接入时确认。"
    >
      <template #extra>
        <el-button type="primary" @click="router.push(`/projects/${done}`)">
          查看项目
        </el-button>
        <el-button @click="router.push('/publisher')">
          进入发布者工作台
        </el-button>
      </template>
    </el-result>
    <div v-else class="publish-layout">
      <aside class="publish-steps">
        <div
          v-for="(s, i) in ['说说你的需求', '明确工作与交付', '预览并发布']"
          :key="s"
          :class="{ active: step === i, complete: step > i }"
        >
          <span>
            <Check v-if="step > i" :size="15" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <strong>{{ s }}</strong>
        </div>
        <p>
          先把边界说清楚，
          <br />
          为合作留出更多可能。
        </p>
      </aside>
      <section class="publish-form-panel">
        <el-alert
          v-if="!session.user"
          title="可以先填写内容，保存或发布时再选择演示身份。"
          type="info"
          :closable="false"
        />
        <template v-if="step === 0">
          <h2>你希望完成什么？</h2>
          <label>
            需求标题
            <em>*</em>
            <el-input
              v-model="form.title"
              aria-label="需求标题"
              placeholder="用一句话说清楚要完成的事"
              maxlength="80"
              show-word-limit
            />
          </label>
          <label>
            需求说明
            <em>*</em>
            <el-input
              v-model="form.summary"
              aria-label="需求说明"
              type="textarea"
              :rows="6"
              placeholder="介绍背景、目标、使用场景，以及你希望解决的问题"
            />
          </label>
          <div class="form-grid">
            <label>
              机会分类
              <el-select v-model="form.category">
                <el-option
                  v-for="v in [
                    '设计创意',
                    '摄影影像',
                    '内容与翻译',
                    '生活服务',
                    '商业支持',
                    '活动执行',
                    '软件开发',
                    '其他',
                  ]"
                  :key="v"
                  :value="v"
                />
              </el-select>
            </label>
            <label>
              工作方式
              <el-select v-model="form.mode">
                <el-option
                  v-for="v in ['远程', '现场', '混合']"
                  :key="v"
                  :value="v"
                />
              </el-select>
            </label>
          </div>
          <label v-if="form.mode !== '远程'">
            所在城市
            <em>*</em>
            <el-input v-model="form.city" placeholder="例如：上海" />
          </label>
        </template>
        <template v-else-if="step === 1">
          <h2>让双方对完成有相同的理解</h2>
          <label>
            工作范围
            <em>*</em>
            <el-input
              v-model="scope"
              aria-label="工作范围"
              type="textarea"
              :rows="4"
              placeholder="每行写一项具体工作"
            />
          </label>
          <label>
            交付要求
            <em>*</em>
            <el-input
              v-model="deliverables"
              aria-label="交付要求"
              type="textarea"
              :rows="3"
              placeholder="最终需要交付什么？每行一项"
            />
          </label>
          <label>
            验收要求
            <el-input
              v-model="acceptance"
              type="textarea"
              :rows="2"
              placeholder="满足哪些条件算完成？"
            />
          </label>
          <div class="form-grid">
            <label>
              报酬
              <el-input
                v-model="form.reward"
                placeholder="例如：1500–2500，留空为协商报价"
              />
            </label>
            <label>
              计价单位
              <el-select v-model="form.unit">
                <el-option
                  v-for="v in ['项目', '天', '次', '小时']"
                  :key="v"
                  :value="v"
                />
              </el-select>
            </label>
            <label>
              承接人数
              <el-input-number v-model="form.capacity" :min="1" :max="100" />
            </label>
            <label>
              预计周期
              <el-input v-model="form.duration" placeholder="例如：5–7 天" />
            </label>
          </div>
          <label>
            相关技能
            <el-input
              v-model="skills"
              placeholder="使用逗号分隔，例如：摄影，修图"
            />
          </label>
          <el-checkbox v-model="form.newcomer">
            工作范围明确，适合新人参与
          </el-checkbox>
        </template>
        <template v-else>
          <h2>发布前，再确认一次</h2>
          <div class="publish-summary">
            <span>
              {{ form.category }} · {{ form.mode }} ·
              {{ form.city || "不限城市" }}
            </span>
            <h3>{{ form.title }}</h3>
            <strong>
              {{ form.reward ? "¥ " + form.reward : "协商报价" }} /
              {{ form.unit }}
            </strong>
            <p class="pre-wrap">{{ form.summary }}</p>
            <h4>工作范围</h4>
            <p class="pre-wrap">{{ scope }}</p>
            <h4>交付要求</h4>
            <p class="pre-wrap">{{ deliverables }}</p>
            <h4>验收要求</h4>
            <p class="pre-wrap">{{ acceptance || "由双方协商确认" }}</p>
            <p>
              {{ form.capacity }} 人承接 · {{ form.duration || "周期待协商" }}
            </p>
          </div>
          <el-alert
            title="这是本机交互演示。发布会生成项目和关联任务，不会向真实平台提交；暂不提供支付、沟通与交付。"
            type="info"
            :closable="false"
          />
        </template>
        <el-alert v-if="error" :title="error" type="error" :closable="false" />
        <footer class="publish-form-footer">
          <el-button v-if="step > 0" @click="step--">上一步</el-button>
          <el-button v-if="step < 2" type="primary" @click="next">
            下一步
            <ArrowRight :size="15" />
          </el-button>
          <el-button v-else type="primary" :loading="busy" @click="publish">
            确认模拟发布
          </el-button>
        </footer>
      </section>
    </div>
  </main>
</template>
