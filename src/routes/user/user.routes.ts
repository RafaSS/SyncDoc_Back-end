import { Router } from "express";
import { UserController } from "../../controllers/user.controller";
import { AuthMiddleware } from "../../middlewares/auth.middleware";

export class UserRoutes {
  public router: Router;
  private userController: UserController;
  private authMiddleware: AuthMiddleware;

  constructor(userController: UserController, authMiddleware: AuthMiddleware) {
    this.router = Router();
    this.userController = userController;
    this.authMiddleware = authMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes
    this.router.post("/register", this.userController.register);
    this.router.post("/login", this.userController.login);

    // Protected routes
    this.router.get(
      "/profile",
      this.authMiddleware.authenticate,
      this.userController.getProfile
    );
    this.router.put(
      "/profile",
      this.authMiddleware.authenticate,
      this.userController.updateProfile
    );
    this.router.delete(
      "/profile",
      this.authMiddleware.authenticate,
      this.userController.deleteAccount
    );
  }
}
