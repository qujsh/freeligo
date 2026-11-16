import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import NoteDocument from "./NoteDocument.vue";
import { cleanDocument } from "../../../domain/noteDocument";
it("富文本按白名单渲染，文本HTML转义且不执行危险链接或任意样式", () => {
  const wrapper = mount(NoteDocument, {
    props: {
      document: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "<img src=x onerror=alert(1)>",
                marks: [
                  { type: "bold" },
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                  {
                    type: "highlight",
                    attrs: { color: "url(https://unsafe.invalid)" },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  });
  expect(wrapper.find("img").exists()).toBe(false);
  expect(wrapper.find("a").exists()).toBe(false);
  expect(wrapper.find("strong").text()).toContain("<img");
  expect(wrapper.html()).not.toContain("unsafe.invalid");
  const value = cleanDocument({
    type: "doc",
    attrs: { junk: true },
    content: [
      { type: "orderedList", attrs: { start: 2, type: "a" }, content: [] },
    ],
  });
  expect(value.attrs).toBeUndefined();
  expect(value.content![0]!.attrs).toEqual({ start: 2 });
});
