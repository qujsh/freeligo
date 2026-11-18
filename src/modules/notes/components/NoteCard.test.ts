import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import NoteCard from "./NoteCard.vue";
import { sampleNotes } from "../sampleNotes";

it("卡片正文和作者区域可打开详情，点赞独立操作且不嵌套按钮", async () => {
  const wrapper = mount(NoteCard, { props: {
    note: { ...sampleNotes[0]!, remote: true },
    engagement: { likeCount: 0, favoriteCount: 0, liked: false, favorited: false },
  } });
  await wrapper.get('button[aria-label="点赞"]').trigger("click");
  expect(wrapper.emitted("like")).toHaveLength(1);
  expect(wrapper.emitted("open")).toBeUndefined();
  await wrapper.get(".note-card__author").trigger("click");
  await wrapper.get(".note-card__open").trigger("click");
  expect(wrapper.emitted("open")).toHaveLength(2);
  expect(wrapper.find("button button").exists()).toBe(false);
  wrapper.unmount();
});
