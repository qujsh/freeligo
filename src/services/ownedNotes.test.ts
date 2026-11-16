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
  expect(page.items[0]).toMatchObject({ own:true, remote:true, statusLabel:"审核中", content:record.bodyText, imageUrls:[record.images[0]] });
});
it("does not hide unauthenticated or malformed responses as empty local notes", async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({success:false,msg:null,errorCode:"AUTH",errorMsg:"请先登录"}),{status:401})).mockResolvedValueOnce(new Response(JSON.stringify({success:true,msg:{items:[]}}))));
  await expect(ownedNotes.detail("SHARE-own")).rejects.toMatchObject({status:401,code:"AUTH"});
  await expect(ownedNotes.list("")).rejects.toMatchObject({code:"INVALID_API_RESPONSE"});
});
