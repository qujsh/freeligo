import { afterEach, expect, it, vi } from "vitest";
import { noteEditor } from "./noteEditor";
import { textDocument } from "../domain/noteDocument";
afterEach(()=>vi.unstubAllGlobals());
it("图片直传不带Cookie，确认成功后才可绑定媒体",async()=>{
 const response=(msg:unknown)=>new Response(JSON.stringify({success:true,msg}));
 const fetch=vi.fn().mockResolvedValueOnce(response({mediaNo:"M1",key:"private/key",token:"opaque",uploadUrl:"https://upload.example.com/"})).mockResolvedValueOnce(new Response("{}" )).mockResolvedValueOnce(response({mediaNo:"M1",contentUrl:"/api/v1/c/notes/media/preview?mediaNo=M1"}));vi.stubGlobal("fetch",fetch);
 expect(await noteEditor.upload(new File(["png"],"a.png",{type:"image/png"}))).toBe("M1");
 expect(fetch.mock.calls[0]![1]).toMatchObject({credentials:"include"});expect(fetch.mock.calls[1]![1]).toMatchObject({credentials:"omit"});expect(fetch.mock.calls[1]![1].body).toBeInstanceOf(FormData);
 expect(fetch.mock.calls[2]![0]).toContain("media/complete?mediaNo=M1");
});
it("更新通过Query编号和双版本提交，不传客户端所有者",async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,msg:{recordNo:"SHARE-a",status:"SAVED",version:3,draftVersion:null,visibility:"PRIVATE",reviewStatus:null}})));vi.stubGlobal("fetch",fetch);
 await noteEditor.save({recordNo:"SHARE-a",clientRequestNo:"client-key",expectedVersion:2,expectedDraftVersion:1,action:"SAVE",record:{title:null,document:textDocument("正文"),documentSchemaVersion:1,occurredAt:new Date().toISOString(),occurredTimezone:"Asia/Shanghai",visibility:"PRIVATE",mediaNos:[],referenceNos:[]}});
 expect(fetch.mock.calls[0]![0]).toBe("/api/v1/c/notes/save?recordNo=SHARE-a");expect(JSON.parse(fetch.mock.calls[0]![1].body)).toMatchObject({expectedVersion:2,expectedDraftVersion:1});
});
it("非法文件不申请凭证；确认失败不返回可绑定图片编号",async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({success:true,msg:{mediaNo:"M1",key:"key",token:"token",uploadUrl:"https://upload.example.com/"}}))).mockResolvedValueOnce(new Response("{}" )).mockResolvedValueOnce(new Response(JSON.stringify({success:false,errorMsg:"核验失败"}),{status:400}));vi.stubGlobal("fetch",fetch);
 await expect(noteEditor.upload(new File(["bad"],"a.svg",{type:"image/svg+xml"}))).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
 await expect(noteEditor.upload(new File(["png"],"a.png",{type:"image/png"}))).rejects.toThrow("核验失败");
});
