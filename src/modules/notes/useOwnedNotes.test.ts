import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { defineComponent, ref } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { useSession } from "../account/session";
import { useOwnedNotes } from "./useOwnedNotes";
import { ownedNotes } from "../../services/ownedNotes";
afterEach(() => vi.restoreAllMocks());
it("换号和退出移除本人列表及详情缓存，迟到响应不恢复旧账号内容", async () => {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  let session!:ReturnType<typeof useSession>, notes!:ReturnType<typeof useOwnedNotes>;
  let resolve!: (value: Awaited<ReturnType<typeof ownedNotes.list>>) => void;
  vi.spyOn(ownedNotes,"list").mockImplementationOnce(() => new Promise(r => {resolve=r;})).mockResolvedValue({items:[],total:0,hasMore:false,nextCursor:null});
  const wrapper=mount(defineComponent({setup(){session=useSession();session.user={id:"USER-a",name:"甲"};notes=useOwnedNotes(ref(""),ref(true),ref(""));return()=>null;}}),{global:{plugins:[createPinia(),[VueQueryPlugin,{queryClient:client}]]}});
  try {
    await flushPromises();
    client.setQueryData(["owned-notes","USER-a","detail","secret"],{content:"甲的私密正文"});
    session.user={id:"USER-b",name:"乙"};
    await flushPromises();
    resolve({items:[],total:999,hasMore:false,nextCursor:null});
    await flushPromises();
    expect(client.getQueriesData({queryKey:["owned-notes","USER-a"]})).toHaveLength(0);
    expect(notes.total.value).toBe(0);
    session.user=null;await flushPromises();
    expect(client.getQueriesData({queryKey:["owned-notes","USER-b"]})).toHaveLength(0);
    expect(notes.items.value).toEqual([]);
  } finally { wrapper.unmount();client.clear(); }
});
