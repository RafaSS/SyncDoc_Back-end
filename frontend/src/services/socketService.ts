// socketService.ts
import { io, Socket } from "socket.io-client";
import { ref, reactive } from "vue";

export class SocketService {
  public socket: Socket | null = null;
  public connected = ref(false);

  connect(url: string): Socket {
    if (this.socket) return this.socket;

    this.socket = io(url, {
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    this.setupSocketEvents();
    return this.socket;
  }

  private setupSocketEvents() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.connected.value = true;
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      this.connected.value = false;
      console.log("Disconnected from server");
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }
}
