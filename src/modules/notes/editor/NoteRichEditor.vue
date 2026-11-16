<script setup lang="ts">
import { watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { ElMessageBox } from "element-plus";
import {
  cleanDocument,
  type NoteDocumentNode,
} from "../../../domain/noteDocument";
const props = defineProps<{
  modelValue: NoteDocumentNode;
  disabled: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: NoteDocumentNode] }>();
const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: { openOnClick: false },
    }),
    Highlight.configure({ multicolor: true }),
  ],
  editorProps: {
    attributes: {
      class: "note-rich-editor__content",
      role: "textbox",
      "aria-label": "笔记正文",
      "aria-multiline": "true",
    },
  },
  onUpdate: ({ editor }) =>
    emit("update:modelValue", cleanDocument(editor.getJSON())),
});
watch(
  () => props.disabled,
  (value) => editor.value?.setEditable(!value, false),
);
watch(
  () => props.modelValue,
  (value) => {
    if (
      editor.value &&
      JSON.stringify(cleanDocument(editor.value.getJSON())) !==
        JSON.stringify(value)
    )
      editor.value.commands.setContent(value, { emitUpdate: false });
  },
);
/** 链接必须显式输入允许的协议，取消不修改文档。 */
async function link() {
  if (!editor.value) return;
  try {
    const { value } = await ElMessageBox.prompt(
      "输入http、https或mailto地址；留空移除链接",
      "设置链接",
      {
        inputValue: editor.value.getAttributes("link").href || "",
        inputValidator: (value) =>
          !value || /^(https?:\/\/|mailto:)/i.test(value) || "请输入有效链接",
      },
    );
    if (!value) editor.value.chain().focus().unsetLink().run();
    else
      editor.value
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: value })
        .run();
  } catch {
    /* 取消保留原文。 */
  }
}
</script>
<template>
  <div class="note-rich-editor">
    <div
      v-if="editor"
      class="note-rich-editor__toolbar"
      role="toolbar"
      aria-label="正文格式"
    >
      <button
        type="button"
        :disabled="disabled"
        :aria-pressed="editor.isActive('bold')"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <b>加粗</b>
      </button>
      <button
        type="button"
        :disabled="disabled"
        :aria-pressed="editor.isActive('italic')"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <i>斜体</i>
      </button>
      <button
        type="button"
        :disabled="disabled"
        :aria-pressed="editor.isActive('highlight')"
        @click="
          editor.chain().focus().toggleHighlight({ color: 'orange' }).run()
        "
      >
        高亮
      </button>
      <button
        type="button"
        :disabled="disabled"
        :aria-pressed="editor.isActive('bulletList')"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        项目列表
      </button>
      <button
        type="button"
        :disabled="disabled"
        :aria-pressed="editor.isActive('orderedList')"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        有序列表
      </button>
      <button type="button" :disabled="disabled" @click="link">链接</button>
      <button
        type="button"
        :disabled="disabled || !editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        撤销
      </button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>
<style>
.note-rich-editor {
  border: 1px solid #e5e2de;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}
.note-rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px;
  border-bottom: 1px solid #eeece9;
}
.note-rich-editor__toolbar button {
  border: 0;
  border-radius: 5px;
  padding: 5px 8px;
  background: transparent;
  color: #64676d;
  font-size: 12px;
}
.note-rich-editor__toolbar button[aria-pressed="true"] {
  background: #fff0e7;
  color: #d74b1e;
}
.note-rich-editor__toolbar button:disabled {
  opacity: 0.45;
  cursor: default;
}
.note-rich-editor__content {
  min-height: 210px;
  max-height: 45vh;
  overflow: auto;
  padding: 14px 16px;
  outline: none;
  color: #34373c;
  font-size: 15px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.note-rich-editor__content p {
  margin: 0 0 10px;
}
.note-rich-editor__content ul,
.note-rich-editor__content ol {
  padding-left: 24px;
}
.note-rich-editor__content a {
  color: #d74b1e;
  text-decoration: underline;
}
.note-rich-editor__content mark {
  background: #ffe3ba;
  color: inherit;
}
</style>
