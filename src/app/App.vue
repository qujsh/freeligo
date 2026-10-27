<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import {
  Search,
  ChevronDown,
  RotateCcw,
  ArrowRight,
  ArrowUpRight,
} from "lucide-vue-next";
import { ref, onMounted } from "vue";
import LoginForm from "../modules/account/LoginForm.vue";
import UnionLogo from "../shared/ui/UnionLogo.vue";
import { useSession } from "../modules/account/session";
import { service } from "../services";
import { isLive } from "../services/publicTasks";
import { ElMessageBox, ElMessage } from "element-plus";
import { useRouter } from "vue-router";
const growthOpen = ref(false);
const session = useSession(),
  client = useQueryClient(),
  router = useRouter();
onMounted(() => session.restore());
async function reset() {
  try {
    await ElMessageBox.confirm(
      "重置本机所有演示收藏、意向和发布记录？",
      "重置演示数据",
    );
    service.reset();
    await client.invalidateQueries();
    ElMessage.success("演示数据已重置");
  } catch {
    /* cancelled */
  }
}
async function signout() {
  await session.logout();
  client.clear();
}
function publish() {
  session.requireLogin(() => router.push("/publish"));
}
</script>
<template>
  <el-config-provider :locale="zhCn">
    <header class="site-header reference-header">
      <router-link class="brand" to="/" aria-label="自由人联合体首页">
        <UnionLogo />
        <span>
          自由人联合体
          <small>不同的人，向往同一个美好生活</small>
        </span>
      </router-link>
      <nav aria-label="主导航">
        <router-link
          to="/"
          :class="{
            active:
              !$route.query.kind &&
              ['/', '/opportunities', '/favorites'].includes($route.path),
          }"
        >
          发现机会
        </router-link>
        <router-link
          to="/opportunities?kind=project"
          :class="{
            active:
              $route.query.kind === 'project' ||
              $route.path.startsWith('/projects/'),
          }"
        >
          一起做
        </router-link>
        <button :class="{ active: growthOpen }" @click="growthOpen = true">
          成果与成长
        </button>
      </nav>
      <div class="header-actions">
        <div class="account-capsule">
          <button
            class="header-search"
            aria-label="搜索机会"
            @click="router.push('/opportunities')"
          >
            <Search :size="23" />
          </button>
          <el-dropdown
            @command="
              (v: string) =>
                v === 'logout'
                  ? signout()
                  : session.requireLogin(() => router.push(v))
            "
          >
            <button class="intent-menu" aria-label="我的意向">
              <span class="intent-label">
                我的意向
                <ChevronDown :size="13" />
              </span>
              <span class="profile-button">
                <span v-if="session.user" class="avatar">
                  {{ session.user.name.slice(0, 1) }}
                </span>
                <img
                  v-else
                  src="/images/reference/avatar.webp"
                  alt="演示头像"
                />
              </span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="/my-interests">
                  我的意向
                </el-dropdown-item>
                <el-dropdown-item command="/favorites">
                  我的收藏
                </el-dropdown-item>
                <el-dropdown-item command="/publisher">
                  发布者工作台
                </el-dropdown-item>
                <el-dropdown-item v-if="session.user" command="logout" divided>
                  退出账号
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <el-button class="publish-button" type="primary" @click="publish">
          发布需求
        </el-button>
      </div>
    </header>
    <router-view />
    <footer class="site-footer">
      <router-link class="brand" to="/">自由人联合体</router-link>
      <p>
        {{
          isLive
            ? "任务、收藏与意向连接共享后端 · 平台不提供交易担保"
            : "交互原型 · 机会、人物、收藏与发布操作均为本机演示数据"
        }}
      </p>
      <el-button v-if="!isLive" link @click="reset">
        <RotateCcw :size="12" />
        重置演示
      </el-button>
      <span>© 2026 Freeligo</span>
    </footer>
    <el-dialog
      v-model="growthOpen"
      title="最近完成的事 · 一家老店的新招牌"
      width="min(660px, 92vw)"
    >
      <div class="growth-comparison">
        <img src="/images/reference/shop-before.webp" alt="改造前的老店招牌" />
        <ArrowRight :size="25" />
        <img
          src="/images/reference/shop-after.webp"
          alt="改造后的张记杂货铺招牌"
        />
      </div>
      <h3>从需求到交付，看看大家如何把事情做成。</h3>
      <p>
        一次清楚的需求沟通，一份兼顾老店故事与日常使用的设计，让新的招牌保留熟悉的温度。
      </p>
      <p class="muted">
        这是参考图中的成果展示样例。个人成果记录与成长体系尚未接入。
      </p>
    </el-dialog>
    <el-dialog
      :model-value="session.loginOpen"
      :title="isLive ? '登录并继续' : '以演示身份继续'"
      width="min(420px, 92vw)"
      @close="session.cancel"
    >
      <LoginForm v-if="isLive" @logged-in="client.invalidateQueries()" />
      <template v-else
        >
<p class="muted">原型不收集手机号，也不会进行真实登录。</p>
        <button
          class="demo-identity"
          @click="
            session.login();
            client.invalidateQueries();
          "
        >
          <span class="avatar">林</span>
          <span>
            <strong>我是参与者</strong>
            <small>收藏机会、表达承接意向、发布新需求</small>
          </span>
          <ArrowUpRight :size="18" />
        </button>
        <button
          class="demo-identity"
          @click="
            session.login(true);
            client.invalidateQueries();
          "
        >
          <span class="avatar">间</span>
          <span>
            <strong>我是项目发布者</strong>
            <small>查看样例申请、选择承接人</small>
          </span>
          <ArrowUpRight :size="18" />
        </button>
      </template>
    </el-dialog>
  </el-config-provider>
</template>
