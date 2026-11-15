import { afterEach, expect, it, vi } from "vitest";
import { account } from "./taskInteractions";
afterEach(() => vi.unstubAllGlobals());
it("密码登录按既有契约发送手机号和密码，复用Cookie会话并校验响应", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, msg: { userNo: "USER-TEST", nickname: "测试成员" } }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  expect(await account.passwordLogin("13800000000", "test-only-pass")).toEqual({ userNo: "USER-TEST", nickname: "测试成员" });
  expect(fetch.mock.calls[0][0]).toContain("/api/v1/auth/password/login");
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "include", method: "POST" });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ phone: "13800000000", password: "test-only-pass" });
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, msg: null, errorMsg: "手机号或密码错误" }), { status: 401 }));
  await expect(account.passwordLogin("13800000000", "invalid")).rejects.toThrow("手机号或密码错误");
});
