import { mockService } from './mock';
import { browse, isLive, publicDetail } from './publicTasks';
import type { PrototypeService } from './contracts';
const unavailable=async():Promise<never>=>{throw new Error('本批仅开放真实任务浏览；收藏、承接意向和 C 端发布将在后续接入');};
const liveService:PrototypeService={
  list:async(query)=>query.favorites?[]:(await browse({...query,pageSize:100})).items,
  detail:publicDetail,favorite:unavailable,favorites:()=>[],submit:unavailable,hasInterest:()=>false,
  publish:unavailable,owned:async()=>[],applicants:async()=>[],accept:unavailable,reset:()=>{},
};
export const service=isLive?liveService:mockService;
