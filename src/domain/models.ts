export interface ProjectTask {
  id: string;
  type: "module" | "feature" | "work" | "subtask";
  name: string;
  description: string | null;
  role: string | null;
  startDate: string | null;
  endDate: string | null;
  children: ProjectTask[];
}
export interface PublicProject {
  title: string;
  summary: string;
  tasks: ProjectTask[];
}
export type OpportunityKind = "project" | "task";
export interface Opportunity {
  source?: "api";
  project?: PublicProject;
  publicationTaskId?: string;
  experience?: string;
  recruitMode?: string;
  rewardPrefix?: string;
  videoDuration?: number;
  budgetText?: string;
  startDate?: string;
  deadline?: string;
  media?: {
    mediaNo: string;
    type: "image" | "video";
    url: string;
    durationSeconds: number | null;
  }[];
  id: string;
  kind: OpportunityKind;
  projectId?: string;
  title: string;
  summary: string;
  category: string;
  mode: "远程" | "现场" | "混合";
  city: string;
  duration: string;
  reward: string;
  unit: string;
  skills: string[];
  publisher: string;
  publisherId: string;
  image?: string;
  video?: string;
  tags?: string[];
  newcomer: boolean;
  capacity: number;
  status: "open" | "closed";
  scope: string[];
  deliverables: string[];
  acceptance: string[];
  createdAt: string;
}
export interface Interest {
  id: string;
  taskId: string;
  userId: string;
  name: string;
  experience: string;
  portfolio: string;
  startDate: string;
  question: string;
  quote: string;
  status: "pending" | "accepted";
}
export interface DemoUser {
  id: string;
  name: string;
}
export interface PublishInput {
  title: string;
  summary: string;
  category: string;
  mode: Opportunity["mode"];
  city: string;
  duration: string;
  reward: string;
  unit: string;
  skills: string[];
  capacity: number;
  newcomer: boolean;
  scope: string[];
  deliverables: string[];
  acceptance: string[];
}
export interface SearchQuery {
  keyword?: string;
  category?: string;
  mode?: string;
  kind?: string;
  newcomer?: boolean;
  favorites?: boolean;
  city?: string;
  budget?: string;
}
