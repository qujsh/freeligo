import { createRouter, createWebHashHistory } from "vue-router";
export const router = createRouter({
  // 页面固定从空间根入口加载，不能将 Vite 的版本资源 base 用作页面路径。
  history: createWebHashHistory("/"),
  scrollBehavior(to, from, saved) {
    if (to.path === from.path) return;
    return saved ?? { top: 0 };
  },
  routes: [
    { path: "/legal/:kind/:version?", component: () => import("../modules/legal/LegalPage.vue") },
    {
      path: "/",
      component: () => import("../modules/discovery/HomePage.vue"),
    },
    {
      path: "/opportunities",
      component: () => import("../modules/discovery/DiscoveryPage.vue"),
    },
    {
      path: "/favorites",
      component: () => import("../modules/discovery/DiscoveryPage.vue"),
    },
    {
      path: "/projects/:id",
      component: () => import("../modules/tasks/DetailPage.vue"),
    },
    {
      path: "/tasks/:id",
      component: () => import("../modules/tasks/DetailPage.vue"),
    },
    {
      path: "/publish",
      component: () => import("../modules/publishing/PublishPage.vue"),
    },
    {
      path: "/publisher",
      component: () => import("../modules/publisher/PublisherPage.vue"),
    },
    {
      path: "/my-interests",
      component: () => import("../modules/account/MyInterestsPage.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("../modules/account/PlaceholderPage.vue"),
    },
  ],
});
