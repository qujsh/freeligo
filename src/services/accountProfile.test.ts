import { afterEach, expect, it, vi } from "vitest";
import { accountProfile, ownAvatarUrl } from "./accountProfile";
const me = { userNo:"USER-1", nickname:"林川", phone:"13800000000", bio:"随手记几句", avatarMediaNo:null };
function response(msg: unknown, status = 200) { return new Response(JSON.stringify({success:status===200,msg,errorCode:"QA_ERROR",errorMsg:"请求失败"}),{status}); }
afterEach(() => vi.unstubAllGlobals());
it("资料读取和保存仅绑定当前Cookie身份，保留取消信号与明确清空字段", async () => {
 const fetch = vi.fn().mockImplementation(() => Promise.resolve(response(me)));vi.stubGlobal("fetch",fetch);
 const signal=new AbortController().signal;
 expect(await accountProfile.me(signal)).toEqual(me);
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:"include",signal});
 await accountProfile.save({nickname:"新昵称",bio:"",avatarMediaNo:""});
 expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({nickname:"新昵称",bio:"",avatarMediaNo:""});
 expect(fetch.mock.calls[1][1].method).toBe("POST");
 expect(ownAvatarUrl("MEDIA-1&other=2")).toContain("MEDIA-1%26other%3D2");
});
it("资料协议失败与401不被伪装为成功；短信用途与设备编号按契约发送", async () => {
 const fetch=vi.fn().mockResolvedValueOnce(response({nickname:"缺少字段"})).mockResolvedValueOnce(response(null,401)).mockResolvedValueOnce(response({message:"已发送",retryAfterSeconds:60})).mockResolvedValueOnce(response("revoked"));
 vi.stubGlobal("fetch",fetch);
 await expect(accountProfile.me()).rejects.toMatchObject({code:"INVALID_API_RESPONSE"});
 await expect(accountProfile.me()).rejects.toMatchObject({status:401});
 await accountProfile.sendCode(me.phone,"set_password");
 expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({phone:me.phone,purpose:"set_password"});
 await accountProfile.revoke("SESSION-a&b");
 expect(fetch.mock.calls[3][0]).toContain("sessionNo=SESSION-a%26b");
});
it("头像先校验并直传云端，云上传不携带Cookie，失败不会确认或绑定资料", async () => {
 const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 await expect(accountProfile.uploadAvatar(new File(["bad"],"bad.svg",{type:"image/svg+xml"}))).rejects.toThrow("5MB");
 expect(fetch).not.toHaveBeenCalled();
 const ticket={mediaNo:"MEDIA-1",key:"member/avatar/fixture.webp",token:"test-only",uploadUrl:"https://upload.example.com"};
 fetch.mockResolvedValueOnce(response(ticket)).mockResolvedValueOnce(new Response("",{status:200})).mockResolvedValueOnce(response({mediaNo:"MEDIA-1",contentUrl:"/api/v1/users/avatar/content?mediaNo=MEDIA-1"}));
 expect(await accountProfile.uploadAvatar(new File(["image"],"avatar.webp",{type:"image/webp"}))).toBe("MEDIA-1");
 expect(fetch.mock.calls[1][1].credentials).toBe("omit");
 expect(fetch.mock.calls[1][1].body).toBeInstanceOf(FormData);
 expect(fetch.mock.calls[2][0]).toContain("users/avatar/complete?mediaNo=MEDIA-1");
 fetch.mockClear();fetch.mockResolvedValueOnce(response(ticket)).mockResolvedValueOnce(new Response("",{status:503}));
 await expect(accountProfile.uploadAvatar(new File(["image"],"avatar.webp",{type:"image/webp"}))).rejects.toThrow("上传失败");
 expect(fetch).toHaveBeenCalledTimes(2);
});
