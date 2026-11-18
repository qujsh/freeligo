<script lang="ts">
import { defineComponent, h, type PropType, type VNodeChild } from "vue";
import type { NoteDocumentNode } from "../../../domain/noteDocument";
const palette: Record<string, string> = {
  red: "#ffd9d9",
  orange: "#ffe6c7",
  yellow: "#fff4ab",
  green: "#ddedcf",
  blue: "#d9eaff",
  purple: "#ecdfff",
  gray: "#e8e8e8",
};
/** 结构化正文逐节点渲染，文本始终转义；只放行安全链接，不执行HTML。 */
export default defineComponent({
  props: {
    document: { type: Object as PropType<NoteDocumentNode>, required: true },
  },
  setup(props) {
    function render(node: NoteDocumentNode): VNodeChild {
      if (node.type === "text") {
        let value: VNodeChild = node.text || "";
        for (const mark of node.marks || []) {
          if (mark.type === "bold") value = h("strong", {}, value);
          if (mark.type === "italic") value = h("em", {}, value);
          if (mark.type === "highlight")
            value = h(
              "mark",
              {
                style: {
                  background:
                    palette[String(mark.attrs?.color)] || palette.orange,
                },
              },
              value,
            );
          if (
            mark.type === "link" &&
            /^(https?:\/\/|mailto:)/i.test(String(mark.attrs?.href))
          )
            value = h(
              "a",
              {
                href: String(mark.attrs?.href),
                target: "_blank",
                rel: "noopener noreferrer",
              },
              value,
            );
        }
        return value;
      }
      if (node.type === "hardBreak") return h("br");
      const tags: Record<string, string> = {
        doc: "div",
        paragraph: "p",
        bulletList: "ul",
        orderedList: "ol",
        listItem: "li",
      };
      const start = node.attrs?.start;
      return h(
        tags[node.type] || "span",
        node.type === "orderedList" && Number.isInteger(start)
          ? { start: Number(start) }
          : {},
        (node.content || []).map(render),
      );
    }
    return () => h("div", { class: "note-document" }, [render(props.document)]);
  },
});
</script>
<style>
.note-document {
  font-size: 16px;
  line-height: 1.85;
  overflow-wrap: anywhere;
  color: #42464e;
}
.note-document p {
  margin: 0 0 14px;
  min-height: 1em;
  white-space: pre-wrap;
}
.note-document ul,
.note-document ol {
  padding-left: 26px;
  margin: 12px 0;
}
.note-document a {
  color: #e64c1b;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.note-document mark {
  color: inherit;
  padding: 1px 2px;
  border-radius: 3px;
}
</style>
