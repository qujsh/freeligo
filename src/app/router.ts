import { createRouter, createWebHistory } from "vue-router";
export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, saved) {
    if (to.path === from.path) return;
    return saved ?? { top: 0 };
  },
  routes: [
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
      component: () => import("../modules/account/PlaceholderPage.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("../modules/account/PlaceholderPage.vue"),
    },
  ],
});
