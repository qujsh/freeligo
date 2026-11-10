export type NoteCategory = "photography" | "life" | "tools";
export interface Note {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  author: string;
  date: string;
  image?: string;
  avatar?: string;
  own?: boolean;
}
