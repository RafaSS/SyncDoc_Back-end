import { DocumentService } from "../services/document.service";
import { DocumentRepository } from "../repositories/document.repository";
import { UserRepository as SupabaseUserRepository } from "../repositories/user.repository";
import { UserRepository as LegacyUserRepository } from "../models/repositories/user.repository";
import { AuthRepository } from "../repositories/auth.repository";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";
import { SocketService } from "../socket/socket.service";
import { Server } from "socket.io";
import * as http from "http";

/**
 * Factory function to create and initialize all services
 * @returns Object containing all initialized services
 */
export function createServices() {
  // Initialize repositories
  const documentRepository = new DocumentRepository();
  const supabaseUserRepository = new SupabaseUserRepository();
  const legacyUserRepository = new LegacyUserRepository();
  const authRepository = new AuthRepository();

  // Create HTTP server for Socket.IO
  const server = http.createServer();

  // Initialize Socket.IO with CORS configuration
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://your-frontend-url.com",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST"],
      allowedHeaders: ["Authorization"],
      credentials: true,
    },
  });

  // Initialize services
  const documentService = new DocumentService(
    documentRepository,
    supabaseUserRepository
  );
  const authService = new AuthService(authRepository, supabaseUserRepository);
  const userService = new UserService(legacyUserRepository);
  const socketService = new SocketService(io, documentService);

  return {
    documentService,
    authService,
    userService,
    socketService,
  } as const;
}
export type Services = ReturnType<typeof createServices>;
