import type {
  Opportunity,
  Interest,
  DemoUser,
  PublishInput,
  SearchQuery,
} from "../../domain/models";
export interface PrototypeService {
  list(query: SearchQuery, user?: DemoUser | null): Promise<Opportunity[]>;
  detail(id: string): Promise<Opportunity>;
  favorite(id: string, user: DemoUser): Promise<boolean>;
  favorites(user: DemoUser): string[];
  submit(
    taskId: string,
    user: DemoUser,
    input: Omit<Interest, "id" | "taskId" | "userId" | "name" | "status">,
  ): Promise<Interest>;
  hasInterest(taskId: string, user: DemoUser): boolean;
  publish(input: PublishInput, user: DemoUser): Promise<Opportunity>;
  owned(user: DemoUser): Promise<Opportunity[]>;
  applicants(taskId: string, user: DemoUser): Promise<Interest[]>;
  accept(id: string, user: DemoUser): Promise<void>;
  reset(): void;
}
