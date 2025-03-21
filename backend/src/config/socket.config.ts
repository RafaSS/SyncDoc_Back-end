import { Server } from "socket.io";
import * as http from "http";
import { config } from "./env.config";
import { SocketService } from "../socket/socket.service";
import { IDocumentService } from "../interfaces/document-service.interface";

export class SocketApp {
  private server: http.Server;
  private io: Server;
  private socketService: SocketService;

  constructor(documentService: IDocumentService) {
    this.server = http.createServer();
    this.io = new Server(this.server, {
      cors: {
        origin: config.corsOrigin,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    this.socketService = new SocketService(this.io, documentService);
  }

  public start(): void {
    this.server.listen(config.socketPort, () => {
      console.log(
        `Socket.IO server running at http://localhost:${config.socketPort}`
      );
    });
  }

  public getServer(): http.Server {
    return this.server;
  }

  public getIo(): Server {
    return this.io;
  }
}
