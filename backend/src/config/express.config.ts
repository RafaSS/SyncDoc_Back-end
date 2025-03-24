import express, { Application } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { config } from "./env.config";

import { userRoutes } from "../routes/";
import { documentRoutes } from "../routes/";

export class ExpressApp {
  public app: Application;

  constructor() {
    this.app = express();
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
