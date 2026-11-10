import { ref, watch } from "vue";
import { z } from "zod";
import type { Note } from "./noteModels";
const STORAGE_KEY = "freeligo.notes-preview.v1";
const schema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  category: z.enum(["photography", "life", "tools"]),
  tags: z.array(z.string()),
  author: z.string(),
  date: z.string(),
  own: z.literal(true),
});
const draftSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.enum(["photography", "life", "tools"]),
});
const DRAFT_KEY = "freeligo.notes-draft.v1";
export function useLocalNotes() {
  const notes = ref<Note[]>([]);
  const draft = ref<{
    title: string;
    content: string;
    category: Note["category"];
  }>({ title: "", content: "", category: "life" });
  const storageError = ref(false);
  try {
    const saved = schema
      .array()
      .safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    if (saved.success) notes.value = saved.data;
    const savedDraft = draftSchema.safeParse(
      JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"),
    );
    if (savedDraft.success) draft.value = savedDraft.data;
  } catch {
    storageError.value = true;
  }
  watch(
    draft,
    (value) => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      } catch {
        storageError.value = true;
      }
    },
    { deep: true },
  );
  function save() {
    const title = draft.value.title.trim(),
      content = draft.value.content.trim();
    if (!title || !content) return false;
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      summary: content.slice(0, 90),
      category: draft.value.category,
      tags: [
        { photography: "摄影影像", life: "生活经验", tools: "工具开发" }[
          draft.value.category
        ],
      ],
      author: "我",
      date: new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
      }).format(new Date()),
      own: true,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([note, ...notes.value]));
      notes.value.unshift(note);
      draft.value = { title: "", content: "", category: "life" };
      return true;
    } catch {
      storageError.value = true;
      return false;
    }
  }
  return { notes, draft, storageError, save };
}
