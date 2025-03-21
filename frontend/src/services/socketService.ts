import { Socket, io } from "socket.io-client";
import { ref } from "vue";

export class SocketService {
  public socket: Socket | null = null;
  public connected = ref(false);

  connect(url: string): Socket {
    if (this.socket) {
      return this.socket;
    }

    console.log("Connecting to socket server:", url);
    this.socket = io(url, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Add token from localStorage if available
      auth: {
        token: localStorage.getItem("authToken") || "",
      },
    });

    this.setupSocketEvents();
    return this.socket;
  }

  setupSocketEvents() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to socket server");
      this.connected.value = true;
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
      this.connected.value = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.connected.value = false;
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("Socket reconnect error:", error);
      this.connected.value = false;
    });
  }

  // Disconnect from the socket server
  disconnect() {
    if (this.socket) {
      // Send user id before disconnecting
      if (this.socket.connected) {
        const userId = localStorage.getItem("userId");
        if (userId) {
          this.socket.emit("user-disconnect", userId);
        }
      }
      this.socket.disconnect();
      this.socket = null;
      this.connected.value = false;
    }
  }

  // Update authentication token
  updateAuthToken(token: string) {
    if (this.socket) {
      this.socket.auth = { token };
      // Reconnect to apply the new token
      this.socket.disconnect().connect();
    }
  }
}
