import { afterEach, expect, it, vi } from "vitest";
import { legal } from "./legal";
afterEach(() => vi.unstubAllGlobals());
it("主动登录提交明确同意及两份快照编号，保留版本冲突错误码", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, msg: { userNo: "TEST", nickname: "测试" } })));
  vi.stubGlobal("fetch", fetch);
  await legal.login("13900000000", "test-only", "password", { accepted: true, termsId: 11, privacyId: 22 });
  expect(fetch.mock.calls[0][0]).toContain("/api/v1/c/legal/login");
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "include", method: "POST" });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ phone: "13900000000", credential: "test-only", method: "password", accepted: true, termsId: 11, privacyId: 22 });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, msg: null, errorCode: "LEGAL_CHANGED", errorMsg: "协议已更新" }), { status: 409 }));
  await expect(legal.login("13900000000", "test-only", "password", { accepted: true, termsId: 11, privacyId: 22 })).rejects.toMatchObject({ code: "LEGAL_CHANGED", status: 409 });
});
it("当前协议必须有且只有两种类型，固定版本通过Query读取", async () => {
  const doc = { id: 1, kind: "TERMS", version: 2, html: "<p>test</p>", contentHash: "abc" };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, msg: [doc, doc] })));
  vi.stubGlobal("fetch", fetch);
  await expect(legal.current()).rejects.toMatchObject({ code: "INVALID_API_RESPONSE" });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, msg: doc })));
  await legal.document("TERMS", 2);
  expect(fetch.mock.calls.at(-1)?.[0]).toContain("document?kind=TERMS&version=2");
});
