import { Router } from 'express';
import { DocumentController } from '../../controllers/document.controller';
import { AuthMiddleware } from '../../middlewares/auth.middleware';

export class DocumentRoutes {
  public router: Router;
  private documentController: DocumentController;
  private authMiddleware: AuthMiddleware;

  constructor(documentController: DocumentController, authMiddleware: AuthMiddleware) {
    this.router = Router();
    this.documentController = documentController;
    this.authMiddleware = authMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes (with optional auth)
    this.router.get('/', this.authMiddleware.optionalAuth, this.documentController.getAllDocuments);
    this.router.get('/:id', this.authMiddleware.optionalAuth, this.documentController.getDocumentById);
    this.router.get('/:id/history', this.authMiddleware.optionalAuth, this.documentController.getDocumentHistory);
    
    // Routes that can work with or without auth but behave differently when authenticated
    this.router.post('/', this.authMiddleware.optionalAuth, this.documentController.createDocument);
    
    // Routes that require authentication
    this.router.put('/:id/title', this.authMiddleware.authenticate, this.documentController.updateDocumentTitle);
  }
}
