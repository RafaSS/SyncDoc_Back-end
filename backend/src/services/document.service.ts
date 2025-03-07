import { Delta, DeltaChange } from '../interfaces/delta.interface';
import { IDocument } from '../interfaces/document.interface';
import { IDocumentService } from '../interfaces/document-service.interface';
import { Document } from '../models/document.model';
import { DocumentRepository } from '../models/repositories/document.repository';

export class DocumentService implements IDocumentService {
  private documentRepository: DocumentRepository;

  constructor(documentRepository: DocumentRepository) {
    this.documentRepository = documentRepository;
  }

  public async getAllDocuments(): Promise<Array<{ id: string; title: string; userCount: number }>> {
    const documents = await this.documentRepository.findAll();
    return documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      userCount: Object.keys(doc.users).length
    }));
  }

  public async getDocumentById(id: string): Promise<IDocument | null> {
    return this.documentRepository.findById(id);
  }

  public async getDocumentHistory(id: string): Promise<{ id: string; title: string; deltas: DeltaChange[] } | null> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      return null;
    }

    return {
      id: document.id,
      title: document.title,
      deltas: document.deltas
    };
  }

  public async createDocument(ownerId?: string): Promise<{ id: string }> {
    const newDocument = new Document('Untitled Document', '', ownerId);
    const document = await this.documentRepository.create(newDocument);
    return { id: document.id };
  }

  public async updateDocumentTitle(id: string, title: string): Promise<boolean> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      return false;
    }

    await this.documentRepository.update(id, { title, updatedAt: new Date() });
    return true;
  }

  public async updateDocumentContent(
    id: string, 
    content: string, 
    delta: Delta, 
    userId: string, 
    userName: string
  ): Promise<boolean> {
    const document = await this.documentRepository.findById(id);
    if (!document) {
      return false;
    }

    // Create a new delta change record
    const deltaChange: DeltaChange = {
      delta,
      userId,
      userName,
      timestamp: Date.now()
    };

    const deltas = [...document.deltas, deltaChange];
    await this.documentRepository.update(id, { 
      content, 
      deltas, 
      updatedAt: new Date() 
    });

    return true;
  }

  public async addUserToDocument(documentId: string, userId: string, userName: string): Promise<boolean> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      return false;
    }

    const users = { ...document.users, [userId]: userName };
    await this.documentRepository.update(documentId, { users });
    return true;
  }

  public async removeUserFromDocument(documentId: string, userId: string): Promise<boolean> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      return false;
    }

    const users = { ...document.users };
    delete users[userId];
    
    await this.documentRepository.update(documentId, { users });
    return true;
  }

  public async getDocumentUsers(documentId: string): Promise<Record<string, string>> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      return {};
    }

    return document.users;
  }
}
