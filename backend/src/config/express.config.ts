import express, { Application } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { config } from "./env.config";
import { userRoutes, documentRoutes } from "../routes/";
import { IUserService } from "../interfaces/user-service.interface";
import { IDocumentService } from "../interfaces/document-service.interface";

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
    // Root route for serving the main app
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(config.publicDir, "index.html"));
    });

    // API routes
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/documents", documentRoutes);
  }
}
