import { IDocument } from "./document.interface";
import { DeltaOperation, DeltaChange } from "./delta.interface";

export interface IDocumentService {
  getAllDocuments(
    userId: string
  ): Promise<Array<{ id: string; title: string; userCount: number }>>;
  getDocumentById(id: string): Promise<IDocument | null>;
  getDocumentHistory(
    id: string
  ): Promise<{ id: string; title: string; deltas: DeltaChange[] } | null>;
  createDocument(title?: string, userId?: string): Promise<{ id: string }>;
  updateDocumentTitle(id: string, title: string): Promise<boolean>;
  updateDocumentContent(
    id: string,
    delta: DeltaOperation[],
    userId?: string
  ): Promise<boolean>;
  addUserToDocument(id: string, userId?: string): Promise<void>;
  removeUserFromDocument(id: string, userId?: string): Promise<boolean>;
  getDocumentUsers(id: string): Promise<Record<string, string>>;
  setDocumentPermission(
    id: string,
    userId: string,
    role: "viewer" | "editor" | "owner"
  ): Promise<void>;
}
