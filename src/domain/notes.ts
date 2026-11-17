export type NoteCategory = "photography" | "life" | "tools";
export interface Note {
  id: string;
  title: string;
  /** 无独立标题时，卡片仅显示一次正文预览；title 仍用于详情及可访问名称。 */
  titleIsExcerpt?: boolean;
  summary: string;
  content: string;
  document?: import("./noteDocument").NoteDocumentNode;
  category: NoteCategory;
  tags: string[];
  author: string;
  date: string;
  image?: string;
  avatar?: string;
  own?: boolean;
  statusLabel?: string;
  cloudDraft?: boolean;
  draftKey?: string;
  editRecordNo?: string;
  remote?: boolean;
  /** 本人正式公开内容可以复用发现页互动；私密和草稿不调用公开互动接口。 */
  engagementAvailable?: boolean;
  imageUrl?: string;
  avatarUrl?: string;
  imageUrls?: string[];
  references?: { recordNo: string; title: string | null; occurredAt: string }[];
}
