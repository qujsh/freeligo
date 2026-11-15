import { mount } from "@vue/test-utils";
import { expect, it, vi } from "vitest";
import NoteReader from "./NoteReader.vue";
import type { Note } from "../noteModels";
const note: Note = {
  id: "one",
  title: "原始标题",
  summary: "摘要",
  content: "<b>保留原文</b>",
  author: "作者",
  date: "11月12日",
  tags: [],
  category: "life",
  references: [{ recordNo: "two", title: "关联", occurredAt: "" }],
};
it("多图按钮切换、边界和切换笔记后的页码重置", async () => {
  const wrapper = mount(NoteReader, {
    props: { note, images: ["/one.jpg", "/two.jpg"] },
  });
  const track = wrapper.find(".note-detail__track").element as HTMLElement;
  Object.defineProperty(track, "clientWidth", { value: 400 });
  track.scrollTo = vi.fn();
  expect(
    wrapper.get('button[aria-label="上一张图片"]').attributes("disabled"),
  ).toBeDefined();
  await wrapper.get('button[aria-label="下一张图片"]').trigger("click");
  expect(track.scrollTo).toHaveBeenCalledWith({
    left: 400,
    behavior: "smooth",
  });
  track.scrollLeft = 400;
  await wrapper.get(".note-detail__track").trigger("scroll");
  expect(wrapper.get(".note-detail__counter").text()).toBe("2 / 2");
  expect(
    wrapper.get('button[aria-label="下一张图片"]').attributes("disabled"),
  ).toBeDefined();
  await wrapper.setProps({ note: { ...note, id: "two" } });
  expect(wrapper.get(".note-detail__counter").text()).toBe("1 / 2");
  expect(track.scrollLeft).toBe(0);
  wrapper.unmount();
});
it("纯文字不展示画廊，正文转义，关联分享按编号打开", async () => {
  const wrapper = mount(NoteReader, { props: { note, images: [] } });
  expect(wrapper.find(".note-detail__gallery").exists()).toBe(false);
  expect(wrapper.get(".notes-reader__content").text()).toBe(note.content);
  expect(wrapper.find(".notes-reader__content b").exists()).toBe(false);
  await wrapper.get(".notes-reader__references button").trigger("click");
  expect(wrapper.emitted("reference")).toEqual([["two"]]);
  wrapper.unmount();
});
