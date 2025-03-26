import { IDocument } from "./document.interface";
import { Delta, DeltaChange, DeltaOperation } from "./delta.interface";

export interface IDocumentService {
  getAllDocuments(): Promise<
    Array<{ id: string; title: string; userCount: number }>
  >;
  getDocumentById(id: string): Promise<IDocument | null>;
  getDocumentHistory(
    id: string
  ): Promise<{ id: string; title: string; deltas: DeltaChange[] } | null>;
  createDocument(
    title?: string,
    content?: Delta,
    userId?: string
  ): Promise<{ id: string }>;
  updateDocumentTitle(id: string, title: string): Promise<boolean>;
  updateDocumentContent(
    documentId: string,
    content: DeltaOperation[],
    delta: Delta,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<void>;
  addUserToDocument(
    documentId: string,
    socketId: string,
    userName: string,
    userId?: string
  ): Promise<void>;
  removeUserFromDocument(documentId: string, userId: string): Promise<boolean>;
  getDocumentUsers(documentId: string): Promise<Record<string, string>>;
  setDocumentPermission(
    documentId: string,
    userId: string,
    role: "viewer" | "editor" | "owner"
  ): Promise<void>;
}
