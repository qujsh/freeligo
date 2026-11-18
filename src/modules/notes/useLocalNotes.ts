import { ref } from "vue";
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
export function useLocalNotes() {
  const notes = ref<Note[]>([]);
  const storageError = ref(false);
  try {
    const saved = schema
      .array()
      .safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    if (saved.success) notes.value = saved.data;
  } catch {
    storageError.value = true;
  }
  /** 删除旧版浏览器笔记，存储成功后才更新界面。 */
  function remove(id: string) {
    const remaining = notes.value.filter(note => note.id !== id);
    if (remaining.length === notes.value.length) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      notes.value = remaining;
      return true;
    } catch {
      storageError.value = true;
      return false;
    }
  }
  return { notes, storageError, remove };
}
