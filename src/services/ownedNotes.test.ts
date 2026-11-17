import { afterEach, expect, it, vi } from "vitest";
import { ownedNotes } from "./ownedNotes";
afterEach(() => vi.unstubAllGlobals());
const record = { recordNo: "SHARE-own", title: null, bodyText: "本人私密正文", occurredAt: "2026-11-15T08:00:00+08:00", visibility: "PRIVATE", reviewStatus: "queued", images: ["/api/v1/c/notes/media?recordNo=SHARE-own&mediaNo=MEDIA-own", "https://untrusted.invalid/image.png"] };
it("binds search, cursor and signal to session-only endpoint and maps private status/media", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success:true, msg:{ items:[record], total:1000, hasMore:true, nextCursor:"cursor" } })));
  vi.stubGlobal("fetch", fetch);
  const signal = new AbortController().signal;
  const page = await ownedNotes.list("照片 & 文字", "cursor", signal);
  const url = new URL(fetch.mock.calls[0][0], "http://localhost");
  expect(url.pathname).toBe("/api/v1/c/notes/records");
  expect(url.searchParams.get("keyword")).toBe("照片 & 文字");
  expect(url.searchParams.has("userNo")).toBe(false);
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials:"include", signal });
  expect(page.total).toBe(1000);
  expect(page.items[0]).toMatchObject({ own:true, remote:true, statusLabel:"审核中", engagementAvailable:false, content:record.bodyText, imageUrls:[record.images[0]] });
});
it("does not hide unauthenticated or malformed responses as empty local notes", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({success:false,msg:null,errorCode:"AUTH",errorMsg:"请先登录"}),{status:401})).mockResolvedValueOnce(new Response(JSON.stringify({success:true,msg:{items:[]}}))));
  await expect(ownedNotes.detail("SHARE-own")).rejects.toMatchObject({status:401,code:"AUTH"});
  await expect(ownedNotes.list("")).rejects.toMatchObject({code:"INVALID_API_RESPONSE"});
});
it("草稿详情只GET本人读取接口，展示完整正文及本人图片预览", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success:true, msg:{ recordNo:"DRAFT-a", status:"DRAFT", draftVersion:null, record:{ title:null, document:{type:"doc", content:[{type:"paragraph",content:[{type:"text",text:"完整草稿正文"}]}]}, occurredAt:"2026-11-15T00:00:00Z", mediaNos:["MEDIA-a&x"] } } })));
  vi.stubGlobal("fetch", fetch);
  const note = await ownedNotes.draftDetail("DRAFT-a");
  expect(note).toMatchObject({cloudDraft:true,content:"完整草稿正文",own:true,imageUrls:["/api/v1/c/notes/media/preview?mediaNo=MEDIA-a%26x"]});
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/c/notes/editor?recordNo=DRAFT-a");
  expect(fetch.mock.calls[0][1]).toMatchObject({credentials:"include"});
  expect(fetch.mock.calls[0][1].method).toBeUndefined();
});

it("仅本人正式公开笔记使用发现页互动，私密内容不开放互动", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,msg:{...record,visibility:"PUBLIC"}}))));
  expect(await ownedNotes.detail(record.recordNo)).toMatchObject({own:true,engagementAvailable:true});
});
