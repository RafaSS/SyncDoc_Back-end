import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './env.config';
import { UserRoutes } from '../routes/user/user.routes';
import { DocumentRoutes } from '../routes/doc/document.routes';
import { UserController } from '../controllers/user.controller';
import { DocumentController } from '../controllers/document.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { IUserService } from '../interfaces/user-service.interface';
import { IDocumentService } from '../interfaces/document-service.interface';

export class ExpressApp {
  public app: Application;
  private userService: IUserService;
  private documentService: IDocumentService;

  constructor(userService: IUserService, documentService: IDocumentService) {
    this.app = express();
    this.userService = userService;
    this.documentService = documentService;
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser(config.cookieSecret));
    this.app.use(express.static(config.publicDir));
  }

  private initializeRoutes(): void {
    // Create controllers
    const userController = new UserController(this.userService);
    const documentController = new DocumentController(this.documentService);
    
    // Create auth middleware
    const authMiddleware = new AuthMiddleware(this.userService);
    
    // Create routes
    const userRoutes = new UserRoutes(userController, authMiddleware);
    const documentRoutes = new DocumentRoutes(documentController, authMiddleware);
    
    // Root route for serving the main app
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(config.publicDir, 'index.html'));
    });
    
    // API routes
    this.app.use('/api/users', userRoutes.router);
    this.app.use('/api/documents', documentRoutes.router);
  }
}
