import { afterEach, expect, it, vi } from "vitest";
import { publicNotes, publicMediaUrl } from "./publicNotes";
const card = {
  recordNo: "SHARE-1",
  title: null,
  summary: "真实正文",
  coverUrl:
    "/api/v1/notes/media/public-content?recordNo=SHARE-1&mediaNo=MEDIA-1",
  publishedAt: "2026-11-11T12:00:00Z",
  author: { nickname: "公开作者", avatarUrl: null },
};
afterEach(() => vi.unstubAllGlobals());
function response(msg: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: status === 200,
      msg,
      errorCode: "NOT_FOUND",
      errorMsg: "记录不存在",
    }),
    { status },
  );
}
it("maps real media and nullable titles, binds search and cursor, propagates cancellation", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      response({ items: [card], nextCursor: "opaque", hasMore: true }),
    );
  vi.stubGlobal("fetch", fetch);
  const signal = new AbortController().signal;
  const page = await publicNotes.list("照片 & 光", "opaque", signal);
  const url = new URL(fetch.mock.calls[0][0], "http://localhost");
  expect(url.searchParams.get("keyword")).toBe("照片 & 光");
  expect(url.searchParams.get("cursor")).toBe("opaque");
  expect(fetch.mock.calls[0][1].signal).toBe(signal);
  expect(page.items[0]).toMatchObject({
    title: "真实正文",
    titleIsExcerpt: true,
    author: "公开作者",
    remote: true,
    imageUrl: card.coverUrl,
    tags: [],
  });
});
it("does not turn failures or malformed payloads into successful empty lists", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(response(null, 404))
      .mockResolvedValueOnce(response({ items: [] }))
      .mockResolvedValueOnce(new Response("not json")),
  );
  await expect(publicNotes.detail("SHARE-1")).rejects.toMatchObject({
    status: 404,
  });
  await expect(publicNotes.list("")).rejects.toMatchObject({
    code: "INVALID_API_RESPONSE",
  });
  await expect(publicNotes.list("")).rejects.toMatchObject({
    code: "INVALID_API_RESPONSE",
  });
});
it("renders body as data and rejects arbitrary media origins", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      response({
        ...card,
        bodyText: "<script>不执行</script>",
        images: [{ mediaNo: "MEDIA-1", contentUrl: card.coverUrl }],
        references: [],
      }),
    ),
  );
  expect((await publicNotes.detail("SHARE-1")).content).toBe(
    "<script>不执行</script>",
  );
  expect(publicMediaUrl("https://tracker.example/image")).toBeUndefined();
  expect(publicMediaUrl("javascript:alert(1)")).toBeUndefined();
});

it("batches real engagement states, validates counts and uses authenticated idempotent POST", async () => {
  const state = {
    likeCount: 2,
    favoriteCount: 1,
    liked: true,
    favorited: false,
  };
  const fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/engagements?"))
      return Promise.resolve(response({ "SHARE-1": state }));
    return Promise.resolve(response(state));
  });
  vi.stubGlobal("fetch", fetch);
  await publicNotes.engagements(
    Array.from({ length: 51 }, (_, i) => `SHARE-${i}`),
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(
    new URL(fetch.mock.calls[0][0], "http://local").searchParams
      .get("recordNos")
      ?.split(","),
  ).toHaveLength(50);
  await publicNotes.setEngagement("SHARE-1", "favorite", true);
  expect(fetch.mock.calls[2][1]).toMatchObject({
    method: "POST",
    credentials: "include",
    body: '{"value":true}',
  });
  fetch.mockResolvedValueOnce(response({ ...state, likeCount: -1 }));
  await expect(
    publicNotes.setEngagement("SHARE-1", "like", false),
  ).rejects.toMatchObject({ code: "INVALID_API_RESPONSE" });
  fetch.mockResolvedValueOnce(response(null, 401));
  await expect(
    publicNotes.setEngagement("SHARE-1", "like", true),
  ).rejects.toMatchObject({ status: 401 });
});

it("评论协议携带会话、正文和幂等号，回复及删除编号只走Query，失败不会伪装空列表", async () => {
  const { noteComments } = await import("./publicNotes");
  const comment = { commentNo: "COMMENT-1", content: "<script>只是文本</script>", createdAt: "2026-11-16T00:00:00Z", author: { nickname: "甲", avatarUrl: null }, replyTo: null, own: true };
  const fetch = vi.fn().mockResolvedValueOnce(response(comment)).mockResolvedValueOnce(response({ deleted: true })).mockResolvedValueOnce(response({ items: [], total: -1, hasMore: false, nextCursor: null })).mockResolvedValueOnce(response(null, 404));
  vi.stubGlobal("fetch", fetch);
  expect(await noteComments.create("NOTE-1", comment.content, "request-0001", "COMMENT-parent")).toEqual(comment);
  const [path, options] = fetch.mock.calls[0]!;
  const url = new URL(path, "http://local");
  expect(url.searchParams.get("recordNo")).toBe("NOTE-1");
  expect(url.searchParams.get("replyToCommentNo")).toBe("COMMENT-parent");
  expect(options).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify({ content: comment.content, clientRequestNo: "request-0001" }) });
  await noteComments.remove("NOTE-1", "COMMENT-1");
  expect(fetch.mock.calls[1]![0]).toContain("comments/delete?recordNo=NOTE-1&commentNo=COMMENT-1");
  await expect(noteComments.list("NOTE-1")).rejects.toMatchObject({ code: "INVALID_API_RESPONSE" });
  await expect(noteComments.list("NOTE-1")).rejects.toMatchObject({ status: 404 });
});
