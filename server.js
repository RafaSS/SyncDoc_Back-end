import { Server } from "socket.io";

const io = new Server(3000, {
  cors: {
    origin: "*"
  }
});

console.log("WebSocket server running on port 3000");

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Handle incoming messages
  socket.on("message", (data) => {
    console.log("Received message:", data);
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
