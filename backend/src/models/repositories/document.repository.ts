import { IDocument, DocumentsCollection } from '../../interfaces/document.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { Document } from '../document.model';
import { v4 as uuidv4 } from 'uuid';

export class DocumentRepository implements IRepository<IDocument> {
  private documents: DocumentsCollection = {};

  constructor(initialDocuments: DocumentsCollection = {}) {
    // Initialize with any existing documents or seed data
    this.documents = initialDocuments;

    // Add a welcome document if there are no documents
    if (Object.keys(this.documents).length === 0) {
      const welcomeId = 'welcome';
      this.documents[welcomeId] = new Document(
        'Welcome',
        'Welcome to SyncDoc! This is a collaborative document editor. Start typing to edit the document.',
        undefined,
        welcomeId
      );
    }
  }

  public async findAll(): Promise<IDocument[]> {
    return Object.values(this.documents);
  }

  public async findById(id: string): Promise<IDocument | null> {
    return this.documents[id] || null;
  }

  public async create(data: Omit<IDocument, 'id'>): Promise<IDocument> {
    const id = uuidv4();
    this.documents[id] = {
      ...data,
      id
    } as IDocument;
    
    return this.documents[id];
  }

  public async update(id: string, data: Partial<IDocument>): Promise<IDocument | null> {
    if (!this.documents[id]) {
      return null;
    }

    this.documents[id] = {
      ...this.documents[id],
      ...data,
      updatedAt: new Date()
    };

    return this.documents[id];
  }

  public async delete(id: string): Promise<boolean> {
    if (!this.documents[id]) {
      return false;
    }

    delete this.documents[id];
    return true;
  }

  // Additional methods specific to document repository
  public getDocuments(): DocumentsCollection {
    return this.documents;
  }
  
  public setDocuments(documents: DocumentsCollection): void {
    this.documents = documents;
  }
}
