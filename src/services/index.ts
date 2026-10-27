import { mockService } from "./mock";
import { browse, isLive, publicDetail } from "./publicTasks";
import type { PrototypeService } from "./contracts";
const unavailable = async (): Promise<never> => {
  throw new Error("此入口尚未接入；任务详情中的收藏与承接意向已连接后端");
};
const liveService: PrototypeService = {
  list: async (query) =>
    query.favorites ? [] : (await browse({ ...query, pageSize: 100 })).items,
  detail: publicDetail,
  favorite: unavailable,
  favorites: () => [],
  submit: unavailable,
  hasInterest: () => false,
  publish: unavailable,
  owned: async () => [],
  applicants: async () => [],
  accept: unavailable,
  reset: () => {},
};
export const service = isLive ? liveService : mockService;
