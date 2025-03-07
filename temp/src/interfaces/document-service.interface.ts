import { IDocument } from './document.interface';
import { Delta, DeltaChange } from './delta.interface';

export interface IDocumentService {
  getAllDocuments(): Promise<Array<{ id: string; title: string; userCount: number }>>;
  getDocumentById(id: string): Promise<IDocument | null>;
  getDocumentHistory(id: string): Promise<{ id: string; title: string; deltas: DeltaChange[] } | null>;
  createDocument(ownerId?: string): Promise<{ id: string }>;
  updateDocumentTitle(id: string, title: string): Promise<boolean>;
  updateDocumentContent(id: string, content: string, delta: Delta, userId: string, userName: string): Promise<boolean>;
  addUserToDocument(documentId: string, userId: string, userName: string): Promise<boolean>;
  removeUserFromDocument(documentId: string, userId: string): Promise<boolean>;
  getDocumentUsers(documentId: string): Promise<Record<string, string>>;
}
