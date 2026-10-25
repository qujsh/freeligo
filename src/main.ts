import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import ElementPlus from "element-plus";
import App from "./app/App.vue";
import { router } from "./app/router";
import "element-plus/dist/index.css";
import "./styles/main.css";
import "./styles/reference.css";
createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 1000 } },
    }),
  })
  .use(router)
  .use(ElementPlus)
  .mount("#app");
