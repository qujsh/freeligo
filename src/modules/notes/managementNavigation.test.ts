import { expect, it } from "vitest";
import { buildManagementNoteUrl } from "./managementNavigation";

it("开发跳转保持同一回环主机名，不复制Cookie或把凭证放入链接", () => {
  expect(buildManagementNoteUrl("http://localhost:4173/notes", "http://127.0.0.1:5175/?view=mine", true)).toBe("http://127.0.0.1:4173/notes");
  expect(buildManagementNoteUrl(undefined, "http://localhost:5175/", true)).toBe("http://localhost:4173/notes");
});
it("线上必须显式配置管理端地址，保留部署路径并拒绝非法协议或内嵌密码", () => {
  expect(buildManagementNoteUrl("https://work.example.com/notes", "https://www.example.com/", false)).toBe("https://work.example.com/notes");
  expect(() => buildManagementNoteUrl(undefined, "https://www.example.com/", false)).toThrow("尚未配置");
  expect(() => buildManagementNoteUrl("javascript:alert(1)", "http://localhost:5175", true)).toThrow();
  expect(() => buildManagementNoteUrl("http://user:secret@example.com/", "http://localhost:5175", true)).toThrow();
});

it("兼容旧配置时也不自动打开管理端新建弹窗", () => {
  expect(buildManagementNoteUrl("http://localhost:4173/notes?compose=1", "http://localhost:5175/", true)).toBe("http://localhost:4173/notes");
});

it("回收站入口只定位管理端筛选，不打开新建弹窗", () => {
  expect(buildManagementNoteUrl("http://localhost:4173/notes", "http://localhost:5175", true, "trash")).toBe("http://localhost:4173/notes?view=trash");
});
