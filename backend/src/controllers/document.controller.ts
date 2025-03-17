import { Request, Response } from 'express';
import { IDocumentService } from '../interfaces/document-service.interface';

export class DocumentController {
  private documentService: IDocumentService;

  constructor(documentService: IDocumentService) {
    this.documentService = documentService;
  }

  public getAllDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const documents = await this.documentService.getAllDocuments();
      res.status(200).json(documents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };

  public getDocumentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.getDocumentById(id);
      
      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      
      // Return document without sending all deltas to keep response size manageable
      res.status(200).json({
        id: document.id,
        title: document.title,
        content: document.content,
        userCount: Object.keys(document.users).length,
        deltaCount: document.deltas.length,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        ownerId: document.ownerId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };

  public getDocumentHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const history = await this.documentService.getDocumentHistory(id);
      
      if (!history) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      
      res.status(200).json(history);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };

  public createDocument = async (req: Request, res: Response): Promise<void> => {
    console.log('Create document request received');
    try {
      const ownerId = req.user?.id;
      console.log('Owner ID:', ownerId);
      const result = await this.documentService.createDocument(ownerId);
      console.log('Document created:', result);
      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('Error creating document:', errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  };

  public updateDocumentTitle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }
      
      const success = await this.documentService.updateDocumentTitle(id, title);
      
      if (!success) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      res.status(500).json({ error: errorMessage });
    }
  };
}
